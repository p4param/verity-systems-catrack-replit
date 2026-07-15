import type { RuntimeContext } from "../models/RuntimeContext";
import type { IRuntimeEventPublisher } from "../contracts/IRuntimeEventPublisher";
import type { IRuntimeRecordService } from "../contracts/IRuntimeRecordService";
import type { OperationDispatcher } from "../services/OperationDispatcher";
import { RuntimeEvents } from "../events/RuntimeEvents";
import {
  MiddlewareExecutionPolicy,
  type RuntimeActionRegistry,
  type RuntimeMiddlewareRegistration,
  type RuntimeRule,
  type RuntimeValidator,
  type RuntimeWorkflow,
} from "../pipeline/RuntimeMiddleware";

type MetadataResolver = (context: RuntimeContext) => Promise<RuntimeContext>;
type PermissionResolver = (context: RuntimeContext) => Promise<void>;

interface BuiltInFactoryDependencies {
  metadataResolver: MetadataResolver;
  permissionResolver: PermissionResolver;
  recordService: IRuntimeRecordService;
  operationDispatcher: OperationDispatcher;
  eventPublisher: IRuntimeEventPublisher;
  validators: Map<string, RuntimeValidator>;
  rules: Map<string, RuntimeRule>;
  workflows: Map<string, RuntimeWorkflow>;
  actionRegistry: RuntimeActionRegistry;
  beforeEventFor(operation: RuntimeContext["operation"]): string | null;
  afterEventFor(operation: RuntimeContext["operation"]): string | null;
  recordId(result: unknown, fallback?: string): string | undefined;
}

export function createBuiltInMiddlewares(
  deps: BuiltInFactoryDependencies
): RuntimeMiddlewareRegistration[] {
  return [
    {
      id: "authorization",
      name: "AuthorizationMiddleware",
      order: 100,
      priority: 100,
      enabled: true,
      dependencies: ["metadata"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        const started = Date.now();
        await deps.permissionResolver(state.context);
        state.diagnostics.authorizationTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "license",
      name: "LicenseMiddleware",
      order: 150,
      priority: 100,
      enabled: true,
      dependencies: ["authorization"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (_state, next) => {
        await next();
      },
    },
    {
      id: "metadata",
      name: "LoadMetadataMiddleware",
      order: 50,
      priority: 100,
      enabled: true,
      dependencies: [],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        const started = Date.now();
        state.context = await deps.metadataResolver(state.context);
        state.diagnostics.metadataTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "validation",
      name: "ValidationMiddleware",
      order: 200,
      priority: 100,
      enabled: true,
      dependencies: ["authorization"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        const started = Date.now();
        for (const validator of deps.validators.values()) {
          await validator(state);
        }
        state.diagnostics.validationTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "business-rules",
      name: "BusinessRulesMiddleware",
      order: 300,
      priority: 100,
      enabled: true,
      dependencies: ["validation"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        const started = Date.now();
        for (const rule of deps.rules.values()) {
          await rule(state);
        }
        state.diagnostics.businessRulesTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "workflow",
      name: "WorkflowMiddleware",
      order: 400,
      priority: 100,
      enabled: true,
      dependencies: ["business-rules"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        const started = Date.now();
        for (const workflow of deps.workflows.values()) {
          await workflow(state);
        }
        state.diagnostics.workflowTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "load-record",
      name: "LoadRecordMiddleware",
      order: 450,
      priority: 100,
      enabled: true,
      dependencies: ["workflow"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        if (!state.context.recordId || state.context.operation === "Create" || state.context.operation === "Import") {
          state.loadedRecord = null;
        } else {
          state.loadedRecord = await deps.recordService.load(state.context);
        }
        await next();
      },
    },
    {
      id: "before-event",
      name: "BeforeEventMiddleware",
      order: 500,
      priority: 100,
      enabled: true,
      dependencies: ["load-record"],
      policy: MiddlewareExecutionPolicy.Continue,
      middleware: async (state, next) => {
        const beforeEvent = deps.beforeEventFor(state.context.operation);
        if (beforeEvent) {
          await deps.eventPublisher.publish({
            type: beforeEvent as any,
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
      id: "persistence",
      name: "PersistenceMiddleware",
      order: 600,
      priority: 100,
      enabled: true,
      dependencies: ["before-event"],
      policy: MiddlewareExecutionPolicy.StopOnFailure,
      middleware: async (state, next) => {
        const started = Date.now();
        state.plan = deps.operationDispatcher.buildPlan(state.context, state.input, state.loadedRecord);
        const action = deps.actionRegistry.get(state.context.operation);
        state.persisted = action
          ? await action(state)
          : await deps.operationDispatcher.persist(state.context, state.plan);
        state.flags.persistenceSucceeded = true;
        state.diagnostics.persistenceTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "notification",
      name: "NotificationMiddleware",
      order: 700,
      priority: 100,
      enabled: true,
      dependencies: ["persistence"],
      policy: MiddlewareExecutionPolicy.Continue,
      middleware: async (state, next) => {
        const started = Date.now();
        state.diagnostics.notificationTime += Date.now() - started;
        await next();
      },
    },
    {
      id: "after-event",
      name: "AfterEventMiddleware",
      order: 750,
      priority: 100,
      enabled: true,
      dependencies: ["persistence"],
      policy: MiddlewareExecutionPolicy.Continue,
      middleware: async (state, next) => {
        const afterEvent = deps.afterEventFor(state.context.operation);
        if (afterEvent && state.flags.persistenceSucceeded) {
          await deps.eventPublisher.publish({
            type: afterEvent as any,
            correlationId: state.context.correlationId,
            operation: state.context.operation,
            recordId: deps.recordId(state.persisted, state.context.recordId),
            timestamp: new Date(),
          });
        }
        await next();
      },
    },
    {
      id: "audit",
      name: "AuditMiddleware",
      order: 800,
      priority: 100,
      enabled: true,
      dependencies: [],
      policy: MiddlewareExecutionPolicy.AlwaysRun,
      middleware: async (state, next) => {
        const started = Date.now();
        state.diagnostics.auditTime += Date.now() - started;
        await next();
      },
    },
  ];
}
