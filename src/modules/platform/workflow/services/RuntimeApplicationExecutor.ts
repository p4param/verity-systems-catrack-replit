import type { IRuntimeApplicationEngine } from "@/modules/platform/runtime/application/contracts/IRuntimeApplicationEngine";
import type { RuntimeOperation } from "@/modules/platform/runtime/application/models/RuntimeOperation";
import type { RuntimeOperationResult } from "@/modules/platform/runtime/application/models/RuntimeOperationResult";
import type { RuntimeContext } from "@/modules/platform/runtime/application/models/RuntimeContext";
import type { IRuntimeApplicationExecutor } from "../contracts/IRuntimeApplicationExecutor";
import type { RuntimeOperationRequest } from "../contracts/IRuntimeOperationRequest";
import type { WorkflowExecutorResult } from "../contracts/IWorkflowExecutor";

function buildCapabilities(): IRuntimeApplicationExecutor["capabilities"] {
  return {
    SupportsTransactions: true,
    SupportsRollback: true,
    SupportsRetry: true,
    SupportsCompensation: true,
    SupportsAsync: true,
    SupportsIdempotency: true,
    SupportsDiagnostics: true,
    SupportsSimulation: true,
  };
}

export class RuntimeApplicationExecutor implements IRuntimeApplicationExecutor {
  readonly executorKey = "workflow.executor.runtime-application";
  readonly runtimeApplicationExecutorKey = this.executorKey;
  readonly supportedEffectTypes = [
    "StateChange",
    "CreateRecord",
    "UpdateRecord",
    "DeleteRecord",
    "RestoreRecord",
    "DuplicateRecord",
    "ArchiveRecord",
    "SubmitRecord",
    "ApproveRecord",
    "RejectRecord",
    "CancelRecord",
    "CloseRecord",
    "PrintRecord",
    "ExportRecord",
    "ImportRecord",
    "PlatformOperation",
  ] as const;
  readonly capabilities = buildCapabilities();
  readonly executionPriority = 100;

  constructor(private readonly runtimeApplicationEngine?: IRuntimeApplicationEngine) {}

  async execute(request: RuntimeOperationRequest): Promise<WorkflowExecutorResult> {
    const runtimeApplicationEngine = this.runtimeApplicationEngine;
    if (!runtimeApplicationEngine) {
      throw new Error("RuntimeApplicationEngine is required for runtime application execution.");
    }

    const runtimeOperationResult = await this.invoke(
      runtimeApplicationEngine,
      request.runtimeContext.with({ transaction: request.runtimeTransaction }),
      request.operation,
      request.payload
    );

    return {
      status: runtimeOperationResult.success ? "Executed" : "Failed",
      request,
      response: {
        effectCode: request.effectCode,
        operation: request.operation,
        success: runtimeOperationResult.success,
        runtimeOperationResult,
      },
    };
  }

  private invoke<TRecord = unknown>(
    engine: IRuntimeApplicationEngine,
    runtimeContext: RuntimeContext,
    operation: RuntimeOperation,
    payload: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    switch (operation) {
      case "Create":
        return engine.create(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Load":
        return engine.load(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Save":
        return engine.save(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Delete":
        return engine.delete(runtimeContext) as Promise<RuntimeOperationResult<TRecord>>;
      case "Restore":
        return engine.restore(runtimeContext) as Promise<RuntimeOperationResult<TRecord>>;
      case "Duplicate":
        return engine.duplicate(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Archive":
        return engine.archive(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Submit":
        return engine.submit(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Approve":
        return engine.approve(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Reject":
        return engine.reject(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Cancel":
        return engine.cancel(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Close":
        return engine.close(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Print":
        return engine.print(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Export":
        return engine.export(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      case "Import":
        return engine.import(runtimeContext, payload) as Promise<RuntimeOperationResult<TRecord>>;
      default:
        throw new Error(`Unsupported runtime operation ${operation}.`);
    }
  }
}
