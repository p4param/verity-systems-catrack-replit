import type { IRuntimeEventPublisher } from "../contracts/IRuntimeEventPublisher";
import type { IRuntimeOperationPipeline } from "../contracts/IRuntimeOperationPipeline";
import type { IRuntimeRecordService } from "../contracts/IRuntimeRecordService";
import { RuntimeEvents, type RuntimeEventType } from "../events/RuntimeEvents";
import { createBuiltInMiddlewares } from "../middleware/BuiltInMiddlewares";
import type { RuntimeContext } from "../models/RuntimeContext";
import type {
  RuntimeExecutionDiagnostics,
  RuntimeOperationResult,
} from "../models/RuntimeOperationResult";
import { RuntimeTransaction } from "../models/RuntimeTransaction";
import { InMemoryRuntimeMetricsCollector } from "../metrics/InMemoryRuntimeMetricsCollector";
import type { IRuntimeMetricsCollector } from "../metrics/RuntimeMetrics";
import { OperationDispatcher } from "../services/OperationDispatcher";
import {
  MiddlewareExecutionPolicy,
  type RuntimeActionRegistry,
  type RuntimeMiddleware,
  type RuntimeMiddlewareRegistration,
  type RuntimeMiddlewareState,
  type RuntimeOperationAction,
  type RuntimeRule,
  type RuntimeValidator,
  type RuntimeWorkflow,
} from "./RuntimeMiddleware";

export type RuntimeMetadataResolver = (context: RuntimeContext) => Promise<RuntimeContext>;
export type RuntimePermissionResolver = (context: RuntimeContext) => Promise<void>;

interface RuntimeOperationPipelineDependencies {
  metadataResolver: RuntimeMetadataResolver;
  permissionResolver: RuntimePermissionResolver;
  recordService: IRuntimeRecordService;
  operationDispatcher: OperationDispatcher;
  eventPublisher: IRuntimeEventPublisher;
  metricsCollector?: IRuntimeMetricsCollector;
}

export class RuntimeOperationPipeline implements IRuntimeOperationPipeline {
  private readonly middlewareRegistry = new Map<string, RuntimeMiddlewareRegistration>();
  private readonly validators = new Map<string, RuntimeValidator>();
  private readonly rules = new Map<string, RuntimeRule>();
  private readonly workflows = new Map<string, RuntimeWorkflow>();
  private readonly actionRegistry: RuntimeActionRegistry = new Map();

  private readonly metadataResolver: RuntimeMetadataResolver;
  private readonly permissionResolver: RuntimePermissionResolver;
  private readonly operationDispatcher: OperationDispatcher;
  private readonly eventPublisher: IRuntimeEventPublisher;
  private readonly metricsCollector: IRuntimeMetricsCollector;

  constructor(dependencies: RuntimeOperationPipelineDependencies) {
    this.metadataResolver = dependencies.metadataResolver;
    this.permissionResolver = dependencies.permissionResolver;
    this.operationDispatcher = dependencies.operationDispatcher;
    this.eventPublisher = dependencies.eventPublisher;
    this.metricsCollector = dependencies.metricsCollector ?? new InMemoryRuntimeMetricsCollector();

    const builtIns = createBuiltInMiddlewares({
      metadataResolver: this.metadataResolver,
      permissionResolver: this.permissionResolver,
      recordService: dependencies.recordService,
      operationDispatcher: this.operationDispatcher,
      eventPublisher: this.eventPublisher,
      validators: this.validators,
      rules: this.rules,
      workflows: this.workflows,
      actionRegistry: this.actionRegistry,
      beforeEventFor: this.beforeEventFor,
      afterEventFor: this.afterEventFor,
      recordId: this.recordId,
    });

    for (const registration of builtIns) {
      this.middlewareRegistry.set(registration.id, registration);
    }
  }

  registerMiddleware(
    nameOrRegistration: string | RuntimeMiddlewareRegistration,
    middleware?: RuntimeMiddleware,
    options?: {
      order?: number;
      priority?: number;
      enabled?: boolean;
      dependencies?: string[];
      policy?: MiddlewareExecutionPolicy;
    }
  ): void {
    if (typeof nameOrRegistration === "string") {
      if (!middleware) {
        throw new Error("Middleware function is required when registration name is provided.");
      }

      this.middlewareRegistry.set(nameOrRegistration, {
        id: nameOrRegistration,
        name: nameOrRegistration,
        middleware,
        order: options?.order ?? 1000,
        priority: options?.priority ?? 100,
        enabled: options?.enabled ?? true,
        dependencies: options?.dependencies ?? [],
        policy: options?.policy ?? MiddlewareExecutionPolicy.StopOnFailure,
      });

      return;
    }

    this.middlewareRegistry.set(nameOrRegistration.id, nameOrRegistration);
  }

  registerAction(operation: RuntimeContext["operation"], action: RuntimeOperationAction): void {
    this.actionRegistry.set(operation, action);
  }

  registerValidator(name: string, validator: RuntimeValidator): void {
    this.validators.set(name, validator);
  }

  registerRule(name: string, rule: RuntimeRule): void {
    this.rules.set(name, rule);
  }

  registerWorkflow(name: string, workflow: RuntimeWorkflow): void {
    this.workflows.set(name, workflow);
  }

  async execute<TInput = unknown, TRecord = unknown>(
    context: RuntimeContext,
    input?: TInput
  ): Promise<RuntimeOperationResult<TRecord>> {
    const startedAt = Date.now();
    const transaction = context.transaction ?? RuntimeTransaction.create({ id: context.transactionId });

    const state: RuntimeMiddlewareState = {
      context: context.with({
        transaction,
        transactionId: transaction.id,
      }),
      input,
      transaction,
      diagnostics: this.createDiagnostics(),
      warnings: [],
      nonFatalErrors: [],
      flags: { persistenceSucceeded: false },
    };

    try {
      await this.eventPublisher.publish({
        type: RuntimeEvents.OperationStarted,
        correlationId: state.context.correlationId,
        operation: state.context.operation,
        recordId: state.context.recordId,
        timestamp: new Date(),
      });

      await this.runOrderedMiddlewares(state);

      const executionTime = Date.now() - startedAt;
      state.diagnostics.pipelineTime = executionTime;
      state.diagnostics.totalTime = executionTime;

      await this.eventPublisher.publish({
        type: RuntimeEvents.OperationCompleted,
        correlationId: state.context.correlationId,
        operation: state.context.operation,
        recordId: this.recordId(state.persisted, state.context.recordId),
        timestamp: new Date(),
        metadata: { executionTime, diagnostics: state.diagnostics },
      });

      const result: RuntimeOperationResult<TRecord> = {
        success: true,
        messages: [],
        warnings: state.warnings,
        errors: state.nonFatalErrors,
        validationErrors: this.categorizeErrors(state.nonFatalErrors, "Validation"),
        businessRuleErrors: this.categorizeErrors(state.nonFatalErrors, "BusinessRule"),
        workflowErrors: this.categorizeErrors(state.nonFatalErrors, "Workflow"),
        recordId: this.recordId(state.persisted, state.context.recordId) ?? null,
        affectedRows: this.affectedRows(state.persisted),
        correlationId: state.context.correlationId,
        executionTime,
        operation: state.context.operation,
        metadata: {
          moduleId: state.context.moduleId,
          entityId: state.context.entityId,
          transactionId: state.context.transactionId,
          requestId: state.context.requestId,
        },
        diagnostics: state.diagnostics,
        record: state.persisted as TRecord,
      };

      this.metricsCollector.record({
        operation: result.operation,
        success: true,
        executionTime: result.executionTime,
        diagnostics: result.diagnostics,
        validationErrorCount: result.validationErrors.length,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unknown runtime operation failure.";
      state.diagnostics.pipelineTime = executionTime;
      state.diagnostics.totalTime = executionTime;

      await this.eventPublisher.publish({
        type: RuntimeEvents.OperationFailed,
        correlationId: state.context.correlationId,
        operation: state.context.operation,
        recordId: state.context.recordId,
        timestamp: new Date(),
        error: message,
        metadata: { executionTime, diagnostics: state.diagnostics },
      });

      const errors = [...state.nonFatalErrors, message];
      const result: RuntimeOperationResult<TRecord> = {
        success: false,
        messages: [],
        warnings: state.warnings,
        errors,
        validationErrors: this.categorizeErrors(errors, "Validation"),
        businessRuleErrors: this.categorizeErrors(errors, "BusinessRule"),
        workflowErrors: this.categorizeErrors(errors, "Workflow"),
        recordId: state.context.recordId ?? null,
        affectedRows: 0,
        correlationId: state.context.correlationId,
        executionTime,
        operation: state.context.operation,
        metadata: {
          moduleId: state.context.moduleId,
          entityId: state.context.entityId,
          transactionId: state.context.transactionId,
          requestId: state.context.requestId,
        },
        diagnostics: state.diagnostics,
      };

      this.metricsCollector.record({
        operation: result.operation,
        success: false,
        executionTime: result.executionTime,
        diagnostics: result.diagnostics,
        validationErrorCount: result.validationErrors.length,
      });

      return result;
    }
  }

  private async runOrderedMiddlewares(state: RuntimeMiddlewareState): Promise<void> {
    const registrations = [...this.middlewareRegistry.values()]
      .filter((item) => item.enabled)
      .sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.name.localeCompare(b.name);
      });

    const executed = new Set<string>();
    let fatalError: Error | null = null;

    for (const registration of registrations) {
      if (fatalError && registration.policy !== MiddlewareExecutionPolicy.AlwaysRun) {
        continue;
      }

      const missingDeps = registration.dependencies.filter((dependency) => !executed.has(dependency));
      if (missingDeps.length > 0) {
        const dependencyError = `Middleware ${registration.name} missing dependencies: ${missingDeps.join(", ")}.`;
        this.handlePolicyError(registration, dependencyError, state, (err) => {
          if (!fatalError) {
            fatalError = err;
          }
        });
        continue;
      }

      const startedAt = Date.now();
      try {
        await registration.middleware(state, async () => undefined);
        executed.add(registration.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : `Middleware ${registration.name} failed.`;
        this.handlePolicyError(registration, message, state, (err) => {
          if (!fatalError) {
            fatalError = err;
          }
        });
      } finally {
        state.diagnostics.middleware[registration.name] = Date.now() - startedAt;
      }
    }

    if (fatalError) {
      throw fatalError;
    }
  }

  private handlePolicyError(
    registration: RuntimeMiddlewareRegistration,
    message: string,
    state: RuntimeMiddlewareState,
    setFatal: (error: Error) => void
  ): void {
    switch (registration.policy) {
      case MiddlewareExecutionPolicy.StopOnFailure:
        setFatal(new Error(message));
        break;
      case MiddlewareExecutionPolicy.Continue:
        state.nonFatalErrors.push(message);
        break;
      case MiddlewareExecutionPolicy.ContinueOnWarning:
      case MiddlewareExecutionPolicy.AlwaysRun:
        state.warnings.push(message);
        break;
      default:
        setFatal(new Error(message));
        break;
    }
  }

  private createDiagnostics(): RuntimeExecutionDiagnostics {
    return {
      pipelineTime: 0,
      metadataTime: 0,
      authorizationTime: 0,
      validationTime: 0,
      businessRulesTime: 0,
      workflowTime: 0,
      persistenceTime: 0,
      notificationTime: 0,
      auditTime: 0,
      totalTime: 0,
      middleware: {},
    };
  }

  private beforeEventFor(operation: RuntimeContext["operation"]): RuntimeEventType | null {
    switch (operation) {
      case "Create":
      case "Duplicate":
        return RuntimeEvents.RecordCreating;
      case "Save":
        return RuntimeEvents.RecordUpdating;
      case "Delete":
      case "Archive":
        return RuntimeEvents.RecordDeleting;
      case "Restore":
        return RuntimeEvents.RecordRestoring;
      default:
        return null;
    }
  }

  private afterEventFor(operation: RuntimeContext["operation"]): RuntimeEventType | null {
    switch (operation) {
      case "Create":
      case "Duplicate":
        return RuntimeEvents.RecordCreated;
      case "Save":
        return RuntimeEvents.RecordUpdated;
      case "Delete":
      case "Archive":
        return RuntimeEvents.RecordDeleted;
      case "Restore":
        return RuntimeEvents.RecordRestored;
      default:
        return null;
    }
  }

  private recordId(result: unknown, fallback?: string): string | undefined {
    if (!result) {
      return fallback;
    }

    if (Array.isArray(result)) {
      return fallback;
    }

    const candidate = result as Record<string, unknown>;
    return typeof candidate.id === "string" ? candidate.id : fallback;
  }

  private affectedRows(result: unknown): number {
    if (!result) {
      return 0;
    }
    if (Array.isArray(result)) {
      return result.length;
    }
    return 1;
  }

  private categorizeErrors(errors: string[], prefix: string): string[] {
    return errors.filter((message) => message.startsWith(`${prefix}:`));
  }
}
