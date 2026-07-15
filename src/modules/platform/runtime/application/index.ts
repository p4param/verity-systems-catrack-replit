import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { RuntimeApplicationEngine } from "./RuntimeApplicationEngine";
import type { RuntimeManifest } from "../services/manifest-generator";
import { RuntimeOperationPipeline } from "./pipeline/RuntimeOperationPipeline";
import { RuntimeContext } from "./models/RuntimeContext";
import { RuntimeRecordService } from "./services/RuntimeRecordService";
import { OperationDispatcher } from "./services/OperationDispatcher";
import { SynchronousRuntimeEventPublisher } from "./services/SynchronousRuntimeEventPublisher";
import type { IRuntimeApplicationEngine } from "./contracts/IRuntimeApplicationEngine";

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
export const runtimeOperationPipeline = new RuntimeOperationPipeline({
  metadataResolver,
  permissionResolver,
  recordService: runtimeRecordService,
  operationDispatcher,
  eventPublisher: runtimeEventPublisher,
});
export const runtimeApplicationEngine = new RuntimeApplicationEngine(runtimeOperationPipeline);

export class PlatformRuntime {
  constructor(private readonly applicationEngine: IRuntimeApplicationEngine) {}

  getApplicationEngine(): IRuntimeApplicationEngine {
    return this.applicationEngine;
  }

  getWorkflowEngine(): null {
    return null;
  }

  getNotificationEngine(): null {
    return null;
  }

  getDocumentEngine(): null {
    return null;
  }
}

export const platformRuntime = new PlatformRuntime(runtimeApplicationEngine);

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
  RuntimeActionRegistry,
  RuntimeMiddleware,
  RuntimeMiddlewareState,
  RuntimeOperationAction,
  RuntimeRule,
  RuntimeValidator,
  RuntimeWorkflow,
} from "./pipeline/RuntimeMiddleware";
