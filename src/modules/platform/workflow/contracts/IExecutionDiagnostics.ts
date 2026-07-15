export type ExecutionTraceStatus = "Started" | "Completed" | "Deferred" | "Failed" | "Cancelled" | "Planned";

export interface ExecutionCorrelation {
  readonly executionId: string;
  readonly correlationId: string;
  readonly workflowDefinitionId: string;
  readonly workflowVersionId: string;
  readonly workflowInstanceId?: string;
  readonly executionHash: string;
  readonly runtimeOperationId?: string;
  readonly transactionId?: string;
  readonly publishVersion?: string;
}

export interface ExecutionTrace {
  readonly traceId: string;
  readonly timestamp: Date;
  readonly stage: string;
  readonly component: string;
  readonly operation: string;
  readonly duration: number;
  readonly status: ExecutionTraceStatus;
  readonly correlationId: string;
  readonly diagnostics: Readonly<Record<string, unknown>>;
}

export interface ExecutionTimeline {
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly records: readonly ExecutionTrace[];
}

export interface ExecutionCounters {
  readonly executedCount: number;
  readonly deferredCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly retryCount: number;
  readonly stageCount: number;
  readonly runtimeOperationCount: number;
}

export interface ExecutionWarnings {
  readonly messages: readonly string[];
}

export interface ExecutionErrors {
  readonly messages: readonly string[];
}

export interface ExecutionSummary {
  readonly executionId: string;
  readonly correlationId: string;
  readonly executionHash: string;
  readonly status: ExecutionTraceStatus;
  readonly stageCount: number;
  readonly runtimeOperationCount: number;
  readonly executedCount: number;
  readonly deferredCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly warnings: number;
  readonly errors: number;
  readonly completedAt?: Date;
}

export interface ExecutionPerformanceSnapshot {
  readonly planningTime: number;
  readonly pipelineDuration: number;
  readonly dispatchTime: number;
  readonly runtimeDuration: number;
  readonly totalExecutionTime: number;
}

export interface ExecutionMetricSample {
  readonly name: string;
  readonly value: number;
  readonly unit: "Count" | "Milliseconds" | "Bytes" | "Percent" | "Unknown";
  readonly tags: Readonly<Record<string, string>>;
}

export interface IExecutionMetrics {
  readonly samples: readonly ExecutionMetricSample[];
  readonly pipelineDuration: number;
  readonly stageDuration: Readonly<Record<string, number>>;
  readonly executorDuration: Readonly<Record<string, number>>;
  readonly runtimeDuration: number;
  readonly totalExecutionTime: number;
  readonly planningTime: number;
  readonly dispatchTime: number;
  readonly deferredCount: number;
  readonly executedCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly retryCount: number;
}

export interface IExecutionTrace extends ExecutionTrace {}

export interface IExecutionTimeline extends ExecutionTimeline {}

export interface IExecutionDiagnostics {
  readonly correlation: ExecutionCorrelation;
  readonly trace: readonly IExecutionTrace[];
  readonly timeline: IExecutionTimeline;
  readonly metrics: IExecutionMetrics;
  readonly counters: ExecutionCounters;
  readonly warnings: ExecutionWarnings;
  readonly errors: ExecutionErrors;
  readonly summary: ExecutionSummary;
  readonly performance: ExecutionPerformanceSnapshot;
  readonly diagnostics: Readonly<Record<string, unknown>>;
}

export interface IExecutionObserver {
  recordTrace(trace: Omit<IExecutionTrace, "traceId"> & { readonly traceId?: string }): void;
  recordMetric(sample: ExecutionMetricSample): void;
  recordWarning(message: string): void;
  recordError(message: string): void;
  snapshot(): IExecutionDiagnostics;
}

export interface ExecutionDiagnosticsSamplingPolicy {
  readonly traceSampleRate?: number;
  readonly metricSampleRate?: number;
  readonly maxTraceRecords?: number;
  readonly maxMetricSamples?: number;
}

export interface IExecutionDiagnosticsSerializer {
  serialize(snapshot: IExecutionDiagnostics): string;
  deserialize(serialized: string): IExecutionDiagnostics;
}

export interface IExecutionDiagnosticsSink {
  record(snapshot: IExecutionDiagnostics): void;
}

export interface IExecutionDiagnosticsQueryFacade {
  getByExecutionId(executionId: string): IExecutionDiagnostics | undefined;
  getByCorrelationId(correlationId: string): readonly IExecutionDiagnostics[];
  listRecent(limit?: number): readonly IExecutionDiagnostics[];
}

export interface IExecutionDiagnosticsCollector {
  begin(correlation: ExecutionCorrelation): IExecutionObserver;
  validate(snapshot: IExecutionDiagnostics): void;
}
