import type { IWorkflowExecutor, WorkflowExecutorResult } from "../contracts/IWorkflowExecutor";
import type { RuntimeOperationRequest } from "../contracts/IRuntimeOperationRequest";

export class DeferredWorkflowExecutor implements IWorkflowExecutor {
  readonly executorKey = "workflow.executor.deferred";
  readonly supportedEffectTypes = ["*"] as const;
  readonly capabilities = {
    SupportsTransactions: false,
    SupportsRollback: false,
    SupportsRetry: false,
    SupportsCompensation: false,
    SupportsAsync: false,
    SupportsIdempotency: false,
    SupportsDiagnostics: true,
    SupportsSimulation: true,
  } as const;
  readonly executionPriority = -100;

  async execute(request: RuntimeOperationRequest): Promise<WorkflowExecutorResult> {
    return {
      status: "Deferred",
      request,
      diagnostics: {
        reason: "Execution deferred to future executor adapters.",
      },
    };
  }
}
