import type {
  ExecutionCorrelation,
  ExecutionMetricSample,
  ExecutionTrace,
  IExecutionDiagnostics,
} from "../contracts";

describe("Workflow observability contracts", () => {
  test("freeze correlation, trace, and metric metadata shapes", () => {
    const observability: IExecutionDiagnostics = {
      correlation: {
        executionId: "exec-001",
        correlationId: "corr-001",
        workflowDefinitionId: "definition-001",
        workflowVersionId: "version-001",
        executionHash: "hash-001",
        runtimeOperationId: "Submit",
        transactionId: "txn-001",
        publishVersion: "version-001",
        workflowInstanceId: "instance-001",
      },
      trace: [
        {
          traceId: "trace-001",
          timestamp: new Date("2026-01-01T00:00:00.000Z"),
          stage: "RuntimeExecution",
          component: "ExecutionPipeline",
          operation: "StageStarted",
          duration: 0,
          status: "Started",
          correlationId: "corr-001",
          diagnostics: {
            executorKey: "workflow.executor.runtime-application",
          },
        },
      ],
      timeline: {
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        completedAt: new Date("2026-01-01T00:00:01.000Z"),
        records: [],
      },
      metrics: {
        samples: [
          {
            name: "workflow.execution.duration",
            value: 12,
            unit: "Milliseconds",
            tags: {
              stageId: "RuntimeExecution",
            },
          },
        ],
        pipelineDuration: 12,
        stageDuration: {
          RuntimeExecution: 12,
        },
        executorDuration: {},
        runtimeDuration: 12,
        totalExecutionTime: 12,
        planningTime: 0,
        dispatchTime: 0,
        deferredCount: 0,
        executedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        retryCount: 0,
      },
      counters: {
        executedCount: 1,
        deferredCount: 0,
        skippedCount: 0,
        failedCount: 0,
        retryCount: 0,
        stageCount: 1,
        runtimeOperationCount: 1,
      },
      warnings: {
        messages: [],
      },
      errors: {
        messages: [],
      },
      summary: {
        executionId: "exec-001",
        correlationId: "corr-001",
        executionHash: "hash-001",
        status: "Completed",
        stageCount: 1,
        runtimeOperationCount: 1,
        executedCount: 1,
        deferredCount: 0,
        skippedCount: 0,
        failedCount: 0,
        warnings: 0,
        errors: 0,
        completedAt: new Date("2026-01-01T00:00:01.000Z"),
      },
      performance: {
        planningTime: 0,
        pipelineDuration: 12,
        dispatchTime: 0,
        runtimeDuration: 12,
        totalExecutionTime: 12,
      },
      diagnostics: {
        correlationId: "corr-001",
        traceId: "trace-001",
      },
    };

    const correlation: ExecutionCorrelation = observability.correlation;
    const trace: ExecutionTrace = observability.trace[0];
    const metric: ExecutionMetricSample = observability.metrics.samples[0];

    expect(correlation.executionId).toBe("exec-001");
    expect(trace.stage).toBe("RuntimeExecution");
    expect(metric.unit).toBe("Milliseconds");
    expect(observability.diagnostics.correlationId).toBe("corr-001");
  });
});
