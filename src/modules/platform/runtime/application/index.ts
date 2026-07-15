import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { RuntimeApplicationEngine } from "./RuntimeApplicationEngine";
import type { RuntimeManifest } from "../services/manifest-generator";
import { RuntimeOperationPipeline } from "./pipeline/RuntimeOperationPipeline";
import { RuntimeContext } from "./models/RuntimeContext";
import { RuntimeRecordService } from "./services/RuntimeRecordService";
import { OperationDispatcher } from "./services/OperationDispatcher";
import { SynchronousRuntimeEventPublisher } from "./services/SynchronousRuntimeEventPublisher";
import type { IRuntimeApplicationEngine } from "./contracts/IRuntimeApplicationEngine";
import { InMemoryRuntimeMetricsCollector } from "./metrics/InMemoryRuntimeMetricsCollector";
import { createWorkflowFoundation } from "@/modules/platform/workflow";
import type { IWorkflowEngine } from "@/modules/platform/workflow";
import type { IParticipantResolutionEngine } from "@/modules/platform/workflow";
import type { IWorkflowActionEngine } from "@/modules/platform/workflow";
import type { IWorkflowPolicyEngine } from "@/modules/platform/workflow";
import type { IRuntimeEffectPlanner } from "@/modules/platform/workflow";
import type { IWorkflowPlanExecutor } from "@/modules/platform/workflow";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "Admin"]);

function requiredPermission(operation: RuntimeContext["operation"], manifest: RuntimeManifest): string | null {
  switch (operation) {
    case "Create":
    case "Duplicate":
      return manifest.permissions.create;
    case "Load":
      return manifest.permissions.view;
    case "Save":
    case "Restore":
    case "Archive":
    case "Submit":
    case "Approve":
    case "Reject":
    case "Cancel":
    case "Close":
    case "Print":
    case "Export":
    case "Import":
      return manifest.permissions.edit;
    case "Delete":
      return manifest.permissions.delete;
    default:
      return null;
  }
}

async function metadataResolver(context: RuntimeContext): Promise<RuntimeContext> {
  if (context.entityDefinition) {
    return context;
  }

  const artifact = await RuntimeRegistry.getActiveArtifact(context.moduleId, context.entityId);
  if (!artifact || !artifact.payload) {
    throw new Error(
      `Runtime manifest not found for module ${context.moduleId} and entity ${context.entityId}.`
    );
  }

  const manifest = artifact.payload as RuntimeManifest;

  return context.with({
    entityDefinition: manifest,
    viewDefinition: manifest.presentation.defaultDataViewId,
    layoutDefinition: manifest.presentation.defaultLayoutViewId,
  });
}

async function permissionResolver(context: RuntimeContext): Promise<void> {
  const manifest = context.entityDefinition;
  if (!manifest) {
    throw new Error("Runtime manifest is required for permission resolution.");
  }

  const hasAdminRole = context.roles.some((role) => ADMIN_ROLES.has(role));
  if (hasAdminRole) {
    return;
  }

  const permission = requiredPermission(context.operation, manifest);
  if (!permission) {
    return;
  }

  if (!context.permissions.includes(permission)) {
    throw new Error(`Forbidden: missing permission ${permission}.`);
  }
}

export const runtimeEventPublisher = new SynchronousRuntimeEventPublisher();
export const runtimeRecordService = new RuntimeRecordService();
export const operationDispatcher = new OperationDispatcher(runtimeRecordService);
export const runtimeMetricsCollector = new InMemoryRuntimeMetricsCollector();
export const runtimeOperationPipeline = new RuntimeOperationPipeline({
  metadataResolver,
  permissionResolver,
  recordService: runtimeRecordService,
  operationDispatcher,
  eventPublisher: runtimeEventPublisher,
  metricsCollector: runtimeMetricsCollector,
});
export const runtimeApplicationEngine = new RuntimeApplicationEngine(runtimeOperationPipeline);
export const workflowFoundation = createWorkflowFoundation();

runtimeOperationPipeline.registerMiddleware(
  {
    id: "workflow-foundation",
    name: "WorkflowFoundationMiddleware",
    middleware: async (state, next) => workflowFoundation.workflowMiddleware.execute(state, next),
    order: 405,
    priority: 100,
    enabled: true,
    dependencies: ["workflow"],
    policy: "StopOnFailure",
  }
);

export class PlatformRuntime {
  private workflowEngine: IWorkflowEngine | null = null;
  private participantResolutionEngine: IParticipantResolutionEngine | null = null;
  private workflowActionEngine: IWorkflowActionEngine | null = null;
  private workflowPolicyEngine: IWorkflowPolicyEngine | null = null;
  private runtimeEffectPlanner: IRuntimeEffectPlanner | null = null;
  private workflowPlanExecutor: IWorkflowPlanExecutor | null = null;

  constructor(private readonly applicationEngine: IRuntimeApplicationEngine) {}

  getApplicationEngine(): IRuntimeApplicationEngine {
    return this.applicationEngine;
  }

  getWorkflowEngine(): IWorkflowEngine | null {
    return this.workflowEngine;
  }

  registerWorkflowEngine(engine: IWorkflowEngine): void {
    this.workflowEngine = engine;
  }

  getParticipantResolutionEngine(): IParticipantResolutionEngine | null {
    return this.participantResolutionEngine;
  }

  registerParticipantResolutionEngine(engine: IParticipantResolutionEngine): void {
    this.participantResolutionEngine = engine;
  }

  getWorkflowActionEngine(): IWorkflowActionEngine | null {
    return this.workflowActionEngine;
  }

  registerWorkflowActionEngine(engine: IWorkflowActionEngine): void {
    this.workflowActionEngine = engine;
  }

  getWorkflowPolicyEngine(): IWorkflowPolicyEngine | null {
    return this.workflowPolicyEngine;
  }

  registerWorkflowPolicyEngine(engine: IWorkflowPolicyEngine): void {
    this.workflowPolicyEngine = engine;
  }

  getRuntimeEffectPlanner(): IRuntimeEffectPlanner | null {
    return this.runtimeEffectPlanner;
  }

  registerRuntimeEffectPlanner(planner: IRuntimeEffectPlanner): void {
    this.runtimeEffectPlanner = planner;
  }

  getWorkflowPlanExecutor(): IWorkflowPlanExecutor | null {
    return this.workflowPlanExecutor;
  }

  registerWorkflowPlanExecutor(executor: IWorkflowPlanExecutor): void {
    this.workflowPlanExecutor = executor;
  }

  getNotificationEngine(): null {
    return null;
  }

  getDocumentEngine(): null {
    return null;
  }
}

export const platformRuntime = new PlatformRuntime(runtimeApplicationEngine);
platformRuntime.registerWorkflowEngine(workflowFoundation.workflowEngine);
platformRuntime.registerParticipantResolutionEngine(workflowFoundation.participantResolutionEngine);
platformRuntime.registerWorkflowActionEngine(workflowFoundation.workflowActionEngine);
platformRuntime.registerWorkflowPolicyEngine(workflowFoundation.workflowPolicyEngine);
platformRuntime.registerRuntimeEffectPlanner(workflowFoundation.runtimeEffectPlanner);
platformRuntime.registerWorkflowPlanExecutor(workflowFoundation.workflowPlanExecutor);

export { RuntimeApplicationEngine } from "./RuntimeApplicationEngine";

export type { IRuntimeApplicationEngine } from "./contracts/IRuntimeApplicationEngine";
export type { IRuntimeRecordService } from "./contracts/IRuntimeRecordService";
export type { IRuntimeEventPublisher } from "./contracts/IRuntimeEventPublisher";
export type { IRuntimeOperationPipeline } from "./contracts/IRuntimeOperationPipeline";

export { RuntimeEvents } from "./events/RuntimeEvents";

export type { RuntimeOperation } from "./models/RuntimeOperation";
export { RUNTIME_OPERATIONS, isRuntimeOperation } from "./models/RuntimeOperation";
export type { RuntimeExecutionDiagnostics, RuntimeOperationResult } from "./models/RuntimeOperationResult";
export { RuntimeContext } from "./models/RuntimeContext";
export { RuntimeTransaction } from "./models/RuntimeTransaction";

export type {
  MiddlewareExecutionPolicy,
  RuntimeActionRegistry,
  RuntimeMiddleware,
  RuntimeMiddlewareRegistration,
  RuntimeMiddlewareState,
  RuntimeOperationAction,
  RuntimeRule,
  RuntimeValidator,
  RuntimeWorkflow,
} from "./pipeline/RuntimeMiddleware";

export { InMemoryRuntimeMetricsCollector } from "./metrics/InMemoryRuntimeMetricsCollector";
export type {
  IRuntimeMetricsCollector,
  RuntimeMetricsRecord,
  RuntimeMetricsSnapshot,
} from "./metrics/RuntimeMetrics";
