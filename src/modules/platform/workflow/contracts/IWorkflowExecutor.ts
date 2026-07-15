import type { RuntimeOperationRequest } from "./IRuntimeOperationRequest";
import type { RuntimeOperationResponse } from "./IRuntimeOperationResponse";

export type ExecutionCapabilityName =
  | "SupportsTransactions"
  | "SupportsRollback"
  | "SupportsRetry"
  | "SupportsCompensation"
  | "SupportsAsync"
  | "SupportsIdempotency"
  | "SupportsDiagnostics"
  | "SupportsSimulation";

export type ExecutionCapabilities = Record<ExecutionCapabilityName, boolean>;

export interface WorkflowExecutorResult {
  status: "Executed" | "Deferred" | "Failed";
  request: RuntimeOperationRequest;
  response?: RuntimeOperationResponse;
  diagnostics?: Record<string, unknown>;
}

export interface IWorkflowExecutor {
  readonly executorKey: string;
  readonly supportedEffectTypes: readonly string[];
  readonly capabilities: ExecutionCapabilities;
  readonly executionPriority: number;

  execute(request: RuntimeOperationRequest): Promise<WorkflowExecutorResult>;
}
