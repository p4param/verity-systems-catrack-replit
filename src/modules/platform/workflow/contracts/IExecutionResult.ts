import type { RuntimeOperationResult } from "@/modules/platform/runtime/application/models/RuntimeOperationResult";
import type { IExecutionObservability } from "./IExecutionObservability";

export type ExecutionResultStatus = "Planned" | "Deferred" | "Executed" | "Failed";

export interface ExecutionStageResult {
  stageId: string;
  status: ExecutionResultStatus;
  executedEffectCodes: string[];
  deferredEffectCodes: string[];
  diagnostics?: Record<string, unknown>;
}

export interface IExecutionResult {
  success: boolean;
  status: ExecutionResultStatus;
  executionPlanId: string;
  executionHash: string;
  correlationId: string;
  executedEffectCodes: string[];
  deferredEffectCodes: string[];
  skippedEffectCodes: string[];
  failedEffectCodes: string[];
  warnings: string[];
  runtimeOperationResults: RuntimeOperationResult<unknown>[];
  stageResults: ExecutionStageResult[];
  executionTime: number;
  diagnostics: Record<string, unknown>;
  observability?: IExecutionObservability;
}
