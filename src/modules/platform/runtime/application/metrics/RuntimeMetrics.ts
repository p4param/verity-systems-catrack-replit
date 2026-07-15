import type { RuntimeOperation } from "../models/RuntimeOperation";
import type { RuntimeExecutionDiagnostics } from "../models/RuntimeOperationResult";

export interface RuntimeMetricsRecord {
  operation: RuntimeOperation;
  success: boolean;
  executionTime: number;
  diagnostics: RuntimeExecutionDiagnostics;
  validationErrorCount: number;
}

export interface RuntimeMetricsSnapshot {
  operationCount: number;
  averageExecutionTime: number;
  failureRate: number;
  validationFailures: number;
  averageWorkflowTime: number;
  averagePersistenceTime: number;
}

export interface IRuntimeMetricsCollector {
  record(entry: RuntimeMetricsRecord): void;
  snapshot(): RuntimeMetricsSnapshot;
}
