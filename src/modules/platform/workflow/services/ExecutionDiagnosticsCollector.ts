import { randomUUID } from "crypto";
import type { AppLogger } from "@/lib/logger";
import type { IRuntimeEventPublisher } from "@/modules/platform/runtime/application/contracts/IRuntimeEventPublisher";
import { RuntimeEvents, type RuntimeEventType } from "@/modules/platform/runtime/application/events/RuntimeEvents";
import type {
  ExecutionCorrelation,
  ExecutionDiagnosticsSamplingPolicy,
  ExecutionCounters,
  ExecutionErrors,
  ExecutionMetricSample,
  ExecutionPerformanceSnapshot,
  ExecutionSummary,
  ExecutionTimeline,
  ExecutionTrace,
  ExecutionTraceStatus,
  ExecutionWarnings,
  IExecutionDiagnostics,
  IExecutionDiagnosticsCollector,
  IExecutionMetrics,
  IExecutionObserver,
  IExecutionTrace,
} from "../contracts/IExecutionDiagnostics";

interface ExecutionDiagnosticsCollectorDependencies {
  logger?: AppLogger;
  eventPublisher?: IRuntimeEventPublisher;
  samplingPolicy?: ExecutionDiagnosticsSamplingPolicy;
}

const DEFAULT_SAMPLING_POLICY: Required<ExecutionDiagnosticsSamplingPolicy> = {
  traceSampleRate: 1,
  metricSampleRate: 1,
  maxTraceRecords: Number.MAX_SAFE_INTEGER,
  maxMetricSamples: Number.MAX_SAFE_INTEGER,
};

function normalizeSampleRate(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) {
    return 1;
  }

  if (value <= 0) {
    return 0;
  }

  return Math.min(1, value);
}

function shouldSample(index: number, sampleRate: number): boolean {
  if (sampleRate >= 1) {
    return true;
  }
  if (sampleRate <= 0) {
    return false;
  }

  const window = Math.max(1, Math.floor(1 / sampleRate));
  return index % window === 0;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        freezeDeep(child);
      }
    }
  }

  return value;
}

function cloneMetric(metric: ExecutionMetricSample): ExecutionMetricSample {
  return {
    ...metric,
    tags: { ...metric.tags },
  };
}

function cloneTrace(trace: IExecutionTrace): IExecutionTrace {
  return {
    ...trace,
    diagnostics: { ...trace.diagnostics },
  };
}

class ExecutionDiagnosticsObserver implements IExecutionObserver {
  private readonly traces: IExecutionTrace[] = [];
  private readonly metrics: ExecutionMetricSample[] = [];
  private readonly warnings: string[] = [];
  private readonly errors: string[] = [];
  private readonly startedAt: Date = new Date();
  private readonly samplingPolicy: Required<ExecutionDiagnosticsSamplingPolicy>;
  private traceAttemptCount = 0;
  private metricAttemptCount = 0;
  private sampledOutTraceCount = 0;
  private sampledOutMetricCount = 0;
  private droppedTraceCount = 0;
  private droppedMetricCount = 0;
  private completedAt?: Date;

  constructor(
    private readonly correlation: ExecutionCorrelation,
    private readonly dependencies: ExecutionDiagnosticsCollectorDependencies,
    private readonly validateSnapshot: (snapshot: IExecutionDiagnostics) => void
  ) {
    this.samplingPolicy = {
      traceSampleRate: normalizeSampleRate(dependencies.samplingPolicy?.traceSampleRate),
      metricSampleRate: normalizeSampleRate(dependencies.samplingPolicy?.metricSampleRate),
      maxTraceRecords:
        dependencies.samplingPolicy?.maxTraceRecords == null
          ? DEFAULT_SAMPLING_POLICY.maxTraceRecords
          : Math.max(0, dependencies.samplingPolicy.maxTraceRecords),
      maxMetricSamples:
        dependencies.samplingPolicy?.maxMetricSamples == null
          ? DEFAULT_SAMPLING_POLICY.maxMetricSamples
          : Math.max(0, dependencies.samplingPolicy.maxMetricSamples),
    };
  }

  recordTrace(trace: Omit<IExecutionTrace, "traceId"> & { readonly traceId?: string }): void {
    if (!shouldSample(this.traceAttemptCount, this.samplingPolicy.traceSampleRate)) {
      this.sampledOutTraceCount += 1;
      this.traceAttemptCount += 1;
      return;
    }

    if (this.traces.length >= this.samplingPolicy.maxTraceRecords) {
      this.droppedTraceCount += 1;
      this.traceAttemptCount += 1;
      return;
    }

    const entry: IExecutionTrace = freezeDeep({
      ...trace,
      traceId: trace.traceId ?? randomUUID(),
      diagnostics: { ...trace.diagnostics },
    });

    this.traces.push(entry);
    this.traceAttemptCount += 1;

    this.dependencies.logger?.trace(`Execution trace: ${entry.operation}`, {
      correlationId: entry.correlationId,
      module: "WorkflowDiagnostics",
      stage: entry.stage,
      operation: entry.operation,
      traceId: entry.traceId,
      duration: entry.duration,
      status: entry.status,
    });

    this.publishRuntimeEvent(entry);
  }

  recordMetric(sample: ExecutionMetricSample): void {
    if (!shouldSample(this.metricAttemptCount, this.samplingPolicy.metricSampleRate)) {
      this.sampledOutMetricCount += 1;
      this.metricAttemptCount += 1;
      return;
    }

    if (this.metrics.length >= this.samplingPolicy.maxMetricSamples) {
      this.droppedMetricCount += 1;
      this.metricAttemptCount += 1;
      return;
    }

    this.metrics.push(cloneMetric(sample));
    this.metricAttemptCount += 1;

    this.dependencies.logger?.diagnostic(`Execution metric recorded: ${sample.name}`, {
      correlationId: this.correlation.correlationId,
      module: "WorkflowDiagnostics",
      metric: sample.name,
      value: sample.value,
      unit: sample.unit,
      ...sample.tags,
    });
  }

  recordWarning(message: string): void {
    this.warnings.push(message);
    this.dependencies.logger?.warn(message, {
      correlationId: this.correlation.correlationId,
      module: "WorkflowDiagnostics",
    });
  }

  recordError(message: string): void {
    this.errors.push(message);
    this.dependencies.logger?.error(message, undefined, {
      correlationId: this.correlation.correlationId,
      module: "WorkflowDiagnostics",
    });
  }

  snapshot(): IExecutionDiagnostics {
    this.completedAt ??= this.traces[this.traces.length - 1]?.timestamp ?? new Date();

    const traces = [...this.traces].sort((left, right) => {
      const byTime = left.timestamp.getTime() - right.timestamp.getTime();
      return byTime !== 0 ? byTime : left.traceId.localeCompare(right.traceId);
    });

    const samples = [...this.metrics];
    const stageDuration: Record<string, number> = {};
    const executorDuration: Record<string, number> = {};
    let planningTime = 0;
    let pipelineDuration = 0;
    let dispatchTime = 0;
    let runtimeDuration = 0;
    let totalExecutionTime = 0;
    let deferredCount = 0;
    let executedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let retryCount = 0;

    for (const sample of samples) {
      switch (sample.name) {
        case "workflow.execution.planningTime":
          planningTime = sample.value;
          break;
        case "workflow.execution.pipelineDuration":
          pipelineDuration = sample.value;
          break;
        case "workflow.execution.dispatchTime":
          dispatchTime = sample.value;
          break;
        case "workflow.execution.runtimeDuration":
          runtimeDuration = sample.value;
          break;
        case "workflow.execution.totalExecutionTime":
          totalExecutionTime = sample.value;
          break;
        case "workflow.execution.deferredCount":
          deferredCount = sample.value;
          break;
        case "workflow.execution.executedCount":
          executedCount = sample.value;
          break;
        case "workflow.execution.skippedCount":
          skippedCount = sample.value;
          break;
        case "workflow.execution.failedCount":
          failedCount = sample.value;
          break;
        case "workflow.execution.retryCount":
          retryCount = sample.value;
          break;
        default:
          if (sample.name === "workflow.execution.stageDuration" && sample.tags.stageId) {
            stageDuration[sample.tags.stageId] = sample.value;
          }
          if (sample.name === "workflow.execution.executorDuration" && sample.tags.executorKey) {
            executorDuration[sample.tags.executorKey] = sample.value;
          }
          break;
      }
    }

    const status = this.resolveStatus(traces, failedCount, deferredCount);
    const counters: ExecutionCounters = freezeDeep({
      executedCount,
      deferredCount,
      skippedCount,
      failedCount,
      retryCount,
      stageCount: traces.filter((trace) => trace.operation === "StageStarted").length,
      runtimeOperationCount: traces.filter((trace) => trace.operation === "RuntimeOperationStarted").length,
    });

    const summary: ExecutionSummary = freezeDeep({
      executionId: this.correlation.executionId,
      correlationId: this.correlation.correlationId,
      executionHash: this.correlation.executionHash,
      status,
      stageCount: counters.stageCount,
      runtimeOperationCount: counters.runtimeOperationCount,
      executedCount,
      deferredCount,
      skippedCount,
      failedCount,
      warnings: this.warnings.length,
      errors: this.errors.length,
      completedAt: this.completedAt,
    });

    const performance: ExecutionPerformanceSnapshot = freezeDeep({
      planningTime,
      pipelineDuration,
      dispatchTime,
      runtimeDuration,
      totalExecutionTime,
    });

    const metrics: IExecutionMetrics = freezeDeep({
      samples: samples.map((sample) => freezeDeep(cloneMetric(sample))),
      pipelineDuration,
      stageDuration: freezeDeep({ ...stageDuration }),
      executorDuration: freezeDeep({ ...executorDuration }),
      runtimeDuration,
      totalExecutionTime,
      planningTime,
      dispatchTime,
      deferredCount,
      executedCount,
      skippedCount,
      failedCount,
      retryCount,
    });

    const diagnostics: IExecutionDiagnostics = freezeDeep({
      correlation: freezeDeep({ ...this.correlation }),
      trace: traces.map((trace) => freezeDeep(cloneTrace(trace))),
      timeline: freezeDeep({
        startedAt: this.startedAt,
        completedAt: this.completedAt,
        records: traces.map((trace) => freezeDeep(cloneTrace(trace))),
      }),
      metrics,
      counters,
      warnings: freezeDeep({ messages: [...this.warnings] }),
      errors: freezeDeep({ messages: [...this.errors] }),
      summary,
      performance,
      diagnostics: freezeDeep({
        traceCount: traces.length,
        metricCount: samples.length,
        sampledOutTraceCount: this.sampledOutTraceCount,
        sampledOutMetricCount: this.sampledOutMetricCount,
        droppedTraceCount: this.droppedTraceCount,
        droppedMetricCount: this.droppedMetricCount,
      }),
    });

    this.validateSnapshot(diagnostics);
    return diagnostics;
  }

  private resolveStatus(traces: readonly IExecutionTrace[], failedCount: number, deferredCount: number): ExecutionTraceStatus {
    if (failedCount > 0) {
      return "Failed";
    }
    if (deferredCount > 0) {
      return "Deferred";
    }

    const lastTrace = traces[traces.length - 1];
    if (!lastTrace) {
      return "Planned";
    }

    if (lastTrace.operation === "ExecutionCancelled") {
      return "Cancelled";
    }

    return "Completed";
  }

  private publishRuntimeEvent(trace: IExecutionTrace): void {
    const runtimeEventType = this.runtimeEventTypeForTrace(trace.operation, trace.status);
    if (!runtimeEventType || !this.dependencies.eventPublisher) {
      return;
    }

    void this.dependencies.eventPublisher.publish({
      type: runtimeEventType,
      correlationId: trace.correlationId,
      operation: trace.operation,
      timestamp: trace.timestamp,
      metadata: {
        traceId: trace.traceId,
        stage: trace.stage,
        component: trace.component,
        duration: trace.duration,
        status: trace.status,
        diagnostics: trace.diagnostics,
      },
    });
  }

  private runtimeEventTypeForTrace(operation: string, status: ExecutionTraceStatus): RuntimeEventType | undefined {
    switch (operation) {
      case "ExecutionStarted":
        return RuntimeEvents.ExecutionStarted;
      case "ExecutionCompleted":
        return RuntimeEvents.ExecutionCompleted;
      case "ExecutionDeferred":
        return RuntimeEvents.ExecutionDeferred;
      case "ExecutionFailed":
        return RuntimeEvents.ExecutionFailed;
      case "ExecutionCancelled":
        return RuntimeEvents.ExecutionCancelled;
      case "StageStarted":
        return RuntimeEvents.ExecutionStageStarted;
      case "StageCompleted":
        return RuntimeEvents.ExecutionStageCompleted;
      default:
        return status === "Failed" ? RuntimeEvents.ExecutionFailed : undefined;
    }
  }
}

export class ExecutionDiagnosticsCollector implements IExecutionDiagnosticsCollector {
  constructor(private readonly dependencies: ExecutionDiagnosticsCollectorDependencies = {}) {}

  begin(correlation: ExecutionCorrelation): IExecutionObserver {
    return new ExecutionDiagnosticsObserver(correlation, this.dependencies, (snapshot) => this.validate(snapshot));
  }

  validate(snapshot: IExecutionDiagnostics): void {
    if (!snapshot.correlation.correlationId) {
      throw new Error("Execution diagnostics require a correlationId.");
    }

    if (!snapshot.correlation.executionHash) {
      throw new Error("Execution diagnostics require an execution hash.");
    }

    const traceIds = new Set<string>();
    for (const trace of snapshot.trace) {
      if (traceIds.has(trace.traceId)) {
        throw new Error(`Duplicate trace id detected: ${trace.traceId}`);
      }
      traceIds.add(trace.traceId);

      if (trace.duration < 0) {
        throw new Error(`Negative trace duration detected for ${trace.traceId}.`);
      }
    }

    for (let index = 1; index < snapshot.timeline.records.length; index += 1) {
      const previous = snapshot.timeline.records[index - 1];
      const current = snapshot.timeline.records[index];
      if (current.timestamp.getTime() < previous.timestamp.getTime()) {
        throw new Error("Execution timeline is out of order.");
      }
    }

    if (
      snapshot.metrics.samples.length === 0 &&
      snapshot.performance.totalExecutionTime === 0 &&
      snapshot.trace.length > 0
    ) {
      throw new Error("Execution diagnostics are missing metrics.");
    }

    if (snapshot.summary.executionHash !== snapshot.correlation.executionHash) {
      throw new Error("Execution hash mismatch detected in diagnostics summary.");
    }

    const eventSequence = snapshot.trace.map((item) => item.operation);
    if (eventSequence.includes("StageCompleted") && !eventSequence.includes("StageStarted")) {
      throw new Error("Invalid execution event sequence.");
    }
  }
}
