import { AppLogger } from "@/lib/logger";
import { SynchronousRuntimeEventPublisher } from "@/modules/platform/runtime/application/services/SynchronousRuntimeEventPublisher";
import { RuntimeEvents } from "@/modules/platform/runtime/application/events/RuntimeEvents";
import { ExecutionDiagnosticsCollector } from "../services/ExecutionDiagnosticsCollector";
import type { ExecutionCorrelation, IExecutionDiagnostics } from "../contracts/IExecutionDiagnostics";

describe("ExecutionDiagnosticsCollector", () => {
  function buildCorrelation(): ExecutionCorrelation {
    return {
      executionId: "exec-001",
      correlationId: "corr-001",
      workflowDefinitionId: "definition-001",
      workflowVersionId: "version-001",
      workflowInstanceId: "instance-001",
      executionHash: "hash-001",
      runtimeOperationId: "transition-001",
      transactionId: "txn-001",
      publishVersion: "version-001",
    };
  }

  function buildValidSnapshot(): IExecutionDiagnostics {
    const collector = new ExecutionDiagnosticsCollector();
    const observer = collector.begin(buildCorrelation());

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: {
        executionPlanId: "plan-001",
      },
    });

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.500Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionCompleted",
      duration: 1,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    return observer.snapshot();
  }

  test("captures immutable traces and metrics", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const observer = collector.begin(buildCorrelation());

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordMetric({
      name: "workflow.execution.planningTime",
      value: 11,
      unit: "Milliseconds",
      tags: {
        workflowVersionId: "version-001",
      },
    });

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:01.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionCompleted",
      duration: 11,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    const snapshot = observer.snapshot();

    expect(snapshot.correlation.executionId).toBe("exec-001");
    expect(snapshot.trace).toHaveLength(2);
    expect(snapshot.metrics.planningTime).toBe(11);
    expect(snapshot.summary.executionHash).toBe("hash-001");
    expect(Object.isFrozen(snapshot.timeline.records[0])).toBe(true);
  });

  test("publishes runtime events and structured logging", async () => {
    const publisher = new SynchronousRuntimeEventPublisher();
    const received: string[] = [];
    publisher.subscribe(RuntimeEvents.ExecutionStarted, async () => received.push(RuntimeEvents.ExecutionStarted));
    publisher.subscribe(RuntimeEvents.ExecutionStageStarted, async () => received.push(RuntimeEvents.ExecutionStageStarted));
    publisher.subscribe(RuntimeEvents.ExecutionStageCompleted, async () => received.push(RuntimeEvents.ExecutionStageCompleted));
    publisher.subscribe(RuntimeEvents.ExecutionCompleted, async () => received.push(RuntimeEvents.ExecutionCompleted));

    const baseLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(function child() {
        return this;
      }),
    };

    const logger = new AppLogger(baseLogger as never);
    const collector = new ExecutionDiagnosticsCollector({ logger, eventPublisher: publisher });
    const observer = collector.begin(buildCorrelation());

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.500Z"),
      stage: "RuntimeExecution",
      component: "ExecutionPipeline",
      operation: "StageStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.900Z"),
      stage: "RuntimeExecution",
      component: "ExecutionPipeline",
      operation: "StageCompleted",
      duration: 400,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:01.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionCompleted",
      duration: 1000,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(received).toEqual([
      RuntimeEvents.ExecutionStarted,
      RuntimeEvents.ExecutionStageStarted,
      RuntimeEvents.ExecutionStageCompleted,
      RuntimeEvents.ExecutionCompleted,
    ]);
    expect(baseLogger.trace).toHaveBeenCalled();
  });

  test("rejects duplicate trace ids and negative durations", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const observer = collector.begin(buildCorrelation());

    observer.recordTrace({
      traceId: "trace-001",
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: {
        executionPlanId: "plan-001",
      },
    });

    observer.recordTrace({
      traceId: "trace-001",
      timestamp: new Date("2026-01-01T00:00:00.500Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionCompleted",
      duration: -1,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    expect(() => observer.snapshot()).toThrow(/Duplicate trace id/);
  });

  test("rejects negative trace durations", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const observer = collector.begin(buildCorrelation());

    observer.recordTrace({
      traceId: "trace-001",
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: {
        executionPlanId: "plan-001",
      },
    });

    observer.recordTrace({
      traceId: "trace-002",
      timestamp: new Date("2026-01-01T00:00:00.500Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionCompleted",
      duration: -1,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    expect(() => observer.snapshot()).toThrow(/Negative trace duration/);
  });

  test("rejects missing correlationId", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const snapshot = buildValidSnapshot();

    expect(() => collector.validate({
      ...snapshot,
      correlation: {
        ...snapshot.correlation,
        correlationId: "",
      },
    })).toThrow(/correlationId/);
  });

  test("rejects timeline ordering violations", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const snapshot = buildValidSnapshot();

    expect(() => collector.validate({
      ...snapshot,
      timeline: {
        ...snapshot.timeline,
        records: [...snapshot.timeline.records].reverse(),
      },
    })).toThrow(/out of order/);
  });

  test("rejects missing metrics", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const snapshot = buildValidSnapshot();

    expect(() => collector.validate({
      ...snapshot,
      metrics: {
        ...snapshot.metrics,
        samples: [],
      },
      performance: {
        ...snapshot.performance,
        totalExecutionTime: 0,
      },
    })).toThrow(/missing metrics/);
  });

  test("rejects hash mismatch", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const snapshot = buildValidSnapshot();

    expect(() => collector.validate({
      ...snapshot,
      summary: {
        ...snapshot.summary,
        executionHash: "mismatch",
      },
    })).toThrow(/hash mismatch/);
  });

  test("rejects invalid event sequence", () => {
    const collector = new ExecutionDiagnosticsCollector();
    const snapshot = buildValidSnapshot();
    const invalidTrace = snapshot.trace.map((item) =>
      item.operation === "ExecutionStarted"
        ? {
            ...item,
            operation: "StageCompleted",
          }
        : item
    );

    expect(() => collector.validate({
      ...snapshot,
      trace: invalidTrace,
      timeline: {
        ...snapshot.timeline,
        records: invalidTrace,
      },
    })).toThrow(/Invalid execution event sequence/);
  });

  test("applies deterministic sampling policy and record caps", () => {
    const collector = new ExecutionDiagnosticsCollector({
      samplingPolicy: {
        traceSampleRate: 0.5,
        metricSampleRate: 0.5,
        maxTraceRecords: 1,
        maxMetricSamples: 1,
      },
    });

    const observer = collector.begin(buildCorrelation());
    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });
    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.100Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "PlanningStarted",
      duration: 0,
      status: "Started",
      correlationId: "corr-001",
      diagnostics: {},
    });
    observer.recordTrace({
      timestamp: new Date("2026-01-01T00:00:00.200Z"),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionCompleted",
      duration: 1,
      status: "Completed",
      correlationId: "corr-001",
      diagnostics: {},
    });

    observer.recordMetric({
      name: "workflow.execution.totalExecutionTime",
      value: 1,
      unit: "Milliseconds",
      tags: { executionPlanId: "plan-001" },
    });
    observer.recordMetric({
      name: "workflow.execution.dispatchTime",
      value: 1,
      unit: "Milliseconds",
      tags: { executionPlanId: "plan-001" },
    });

    const snapshot = observer.snapshot();
    expect(snapshot.trace.length).toBe(1);
    expect(snapshot.metrics.samples.length).toBe(1);
    expect(snapshot.diagnostics.sampledOutTraceCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.diagnostics.sampledOutMetricCount).toBeGreaterThanOrEqual(0);
  });
});
