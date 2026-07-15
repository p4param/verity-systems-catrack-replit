import type { RuntimeRecord } from "@/modules/platform/persistence";
import type { IRuntimeEventPublisher } from "../contracts/IRuntimeEventPublisher";
import type { IRuntimeOperationPipeline } from "../contracts/IRuntimeOperationPipeline";
import type { IRuntimeRecordService } from "../contracts/IRuntimeRecordService";
import { RuntimeEvents, type RuntimeEventType } from "../events/RuntimeEvents";
import type { RuntimeContext } from "../models/RuntimeContext";
import type {
  RuntimeExecutionDiagnostics,
  RuntimeOperationResult,
} from "../models/RuntimeOperationResult";
import { RuntimeTransaction } from "../models/RuntimeTransaction";
import { OperationDispatcher } from "../services/OperationDispatcher";
import type {
  RuntimeActionRegistry,
  RuntimeMiddleware,
  RuntimeMiddlewareState,
  RuntimeOperationAction,
  RuntimeRule,
  RuntimeValidator,
  RuntimeWorkflow,
} from "./RuntimeMiddleware";

export type RuntimeMetadataResolver = (context: RuntimeContext) => Promise<RuntimeContext>;
export type RuntimePermissionResolver = (context: RuntimeContext) => Promise<void>;

interface RuntimeOperationPipelineDependencies {
  metadataResolver: RuntimeMetadataResolver;
  permissionResolver: RuntimePermissionResolver;
  recordService: IRuntimeRecordService;
  operationDispatcher: OperationDispatcher;
  eventPublisher: IRuntimeEventPublisher;
}

export class RuntimeOperationPipeline implements IRuntimeOperationPipeline {
  private readonly customMiddlewares: Array<{ name: string; middleware: RuntimeMiddleware }> = [];
  private readonly validators = new Map<string, RuntimeValidator>();
  private readonly rules = new Map<string, RuntimeRule>();
  private readonly workflows = new Map<string, RuntimeWorkflow>();
  private readonly actionRegistry: RuntimeActionRegistry = new Map();

  private readonly metadataResolver: RuntimeMetadataResolver;
  private readonly permissionResolver: RuntimePermissionResolver;
  private readonly recordService: IRuntimeRecordService;
  private readonly operationDispatcher: OperationDispatcher;
  private readonly eventPublisher: IRuntimeEventPublisher;

  constructor(dependencies: RuntimeOperationPipelineDependencies) {
    this.metadataResolver = dependencies.metadataResolver;
    this.permissionResolver = dependencies.permissionResolver;
    this.recordService = dependencies.recordService;
    this.operationDispatcher = dependencies.operationDispatcher;
    this.eventPublisher = dependencies.eventPublisher;
  }

  registerMiddleware(name: string, middleware: RuntimeMiddleware): void {
    this.customMiddlewares.push({ name, middleware });
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
    };

    try {
      await this.eventPublisher.publish({
        type: RuntimeEvents.OperationStarted,
        correlationId: state.context.correlationId,
        operation: state.context.operation,
        recordId: state.context.recordId,
        timestamp: new Date(),
      });

      await this.runMiddlewareChain(state);

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

      return {
        success: true,
        messages: [],
        warnings: [],
        errors: [],
        validationErrors: [],
        businessRuleErrors: [],
        workflowErrors: [],
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
    } catch (error) {
      const executionTime = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unknown runtime operation failure.";
      state.diagnostics.pipelineTime = executionTime;
      state.diagnostics.totalTime = executionTime;

      const validationErrors = this.categorizeErrors(message, "Validation");
      const businessRuleErrors = this.categorizeErrors(message, "BusinessRule");
      const workflowErrors = this.categorizeErrors(message, "Workflow");

      await this.eventPublisher.publish({
        type: RuntimeEvents.OperationFailed,
        correlationId: state.context.correlationId,
        operation: state.context.operation,
        recordId: state.context.recordId,
        timestamp: new Date(),
        error: message,
        metadata: { executionTime, diagnostics: state.diagnostics },
      });

      return {
        success: false,
        messages: [],
        warnings: [],
        errors: [message],
        validationErrors,
        businessRuleErrors,
        workflowErrors,
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

  private async runMiddlewareChain(state: RuntimeMiddlewareState): Promise<void> {
    const middlewares = [
      ...this.defaultMiddlewares(),
      ...this.customMiddlewares,
    ];

    let index = -1;
    const dispatch = async (cursor: number): Promise<void> => {
      if (cursor <= index) {
        throw new Error("Runtime middleware invoked next() multiple times.");
      }

      index = cursor;
      const registration = middlewares[cursor];
      if (!registration) {
        return;
      }

      const startedAt = Date.now();
      await registration.middleware(state, () => dispatch(cursor + 1));
      const elapsed = Date.now() - startedAt;
      state.diagnostics.middleware[registration.name] = elapsed;
    };

    await dispatch(0);
  }

  private defaultMiddlewares(): Array<{ name: string; middleware: RuntimeMiddleware }> {
    return [
      {
        name: "LoadMetadata",
        middleware: async (state, next) => {
          const started = Date.now();
          state.context = await this.metadataResolver(state.context);
          state.diagnostics.metadataTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "Authorization",
        middleware: async (state, next) => {
          const started = Date.now();
          await this.permissionResolver(state.context);
          state.diagnostics.authorizationTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "Validation",
        middleware: async (state, next) => {
          const started = Date.now();
          for (const validator of this.validators.values()) {
            await validator(state);
          }
          state.diagnostics.validationTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "BusinessRules",
        middleware: async (state, next) => {
          const started = Date.now();
          for (const rule of this.rules.values()) {
            await rule(state);
          }
          state.diagnostics.businessRulesTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "Workflow",
        middleware: async (state, next) => {
          const started = Date.now();
          for (const workflow of this.workflows.values()) {
            await workflow(state);
          }
          state.diagnostics.workflowTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "LoadRecord",
        middleware: async (state, next) => {
          state.loadedRecord = await this.loadRecordIfNeeded(state.context);
          await next();
        },
      },
      {
        name: "PublishBeforeEvent",
        middleware: async (state, next) => {
          const beforeEvent = this.beforeEventFor(state.context.operation);
          if (beforeEvent) {
            await this.eventPublisher.publish({
              type: beforeEvent,
              correlationId: state.context.correlationId,
              operation: state.context.operation,
              recordId: state.context.recordId ?? state.loadedRecord?.id,
              timestamp: new Date(),
            });
          }
          await next();
        },
      },
      {
        name: "Persistence",
        middleware: async (state, next) => {
          const started = Date.now();
          state.plan = this.operationDispatcher.buildPlan(state.context, state.input, state.loadedRecord);
          const action = this.actionRegistry.get(state.context.operation);
          state.persisted = action
            ? await action(state)
            : await this.operationDispatcher.persist(state.context, state.plan);
          state.diagnostics.persistenceTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "Notification",
        middleware: async (state, next) => {
          const started = Date.now();
          state.diagnostics.notificationTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "Audit",
        middleware: async (state, next) => {
          const started = Date.now();
          state.diagnostics.auditTime += Date.now() - started;
          await next();
        },
      },
      {
        name: "PublishAfterEvent",
        middleware: async (state, next) => {
          const afterEvent = this.afterEventFor(state.context.operation);
          if (afterEvent) {
            await this.eventPublisher.publish({
              type: afterEvent,
              correlationId: state.context.correlationId,
              operation: state.context.operation,
              recordId: this.recordId(state.persisted, state.context.recordId),
              timestamp: new Date(),
            });
          }
          await next();
        },
      },
    ];
  }

  private async loadRecordIfNeeded(context: RuntimeContext): Promise<RuntimeRecord | null> {
    if (!context.recordId) {
      return null;
    }

    if (context.operation === "Create" || context.operation === "Import") {
      return null;
    }

    return this.recordService.load(context);
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

  private categorizeErrors(message: string, prefix: string): string[] {
    return message.startsWith(`${prefix}:`) ? [message] : [];
  }
}
