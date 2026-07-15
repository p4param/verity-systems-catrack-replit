import { ExecutionDiagnosticsCollector } from "../services/ExecutionDiagnosticsCollector";
import { ExecutionDiagnosticsSerializer } from "../services/ExecutionDiagnosticsSerializer";

function buildSnapshot() {
  const collector = new ExecutionDiagnosticsCollector();
  const observer = collector.begin({
    executionId: "exec-001",
    correlationId: "corr-001",
    workflowDefinitionId: "definition-001",
    workflowVersionId: "version-001",
    workflowInstanceId: "instance-001",
    executionHash: "hash-001",
    runtimeOperationId: "SUBMIT",
    transactionId: "txn-001",
    publishVersion: "version-001",
  });

  observer.recordTrace({
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
    stage: "ExecutionOrchestrator",
    component: "WorkflowExecutionOrchestrator",
    operation: "ExecutionStarted",
    duration: 0,
    status: "Started",
    correlationId: "corr-001",
    diagnostics: {
      transitionCode: "SUBMIT",
    },
  });

  observer.recordMetric({
    name: "workflow.execution.totalExecutionTime",
    value: 10,
    unit: "Milliseconds",
    tags: {
      executionPlanId: "plan-001",
    },
  });

  observer.recordTrace({
    timestamp: new Date("2026-01-01T00:00:00.010Z"),
    stage: "ExecutionOrchestrator",
    component: "WorkflowExecutionOrchestrator",
    operation: "ExecutionCompleted",
    duration: 10,
    status: "Completed",
    correlationId: "corr-001",
    diagnostics: {},
  });

  return observer.snapshot();
}

describe("ExecutionDiagnosticsSerializer", () => {
  test("serializes diagnostics deterministically", () => {
    const serializer = new ExecutionDiagnosticsSerializer();
    const snapshot = buildSnapshot();

    const first = serializer.serialize(snapshot);
    const second = serializer.serialize(snapshot);

    expect(first).toBe(second);
    expect(first).toContain('"executionId":"exec-001"');
    expect(first).toContain('"timestamp":"2026-01-01T00:00:00.000Z"');
  });

  test("deserializes diagnostics with date restoration", () => {
    const serializer = new ExecutionDiagnosticsSerializer();
    const serialized = serializer.serialize(buildSnapshot());

    const parsed = serializer.deserialize(serialized);

    expect(parsed.timeline.startedAt).toBeInstanceOf(Date);
    expect(parsed.trace[0].timestamp).toBeInstanceOf(Date);
    expect(parsed.correlation.executionHash).toBe("hash-001");
  });
});
