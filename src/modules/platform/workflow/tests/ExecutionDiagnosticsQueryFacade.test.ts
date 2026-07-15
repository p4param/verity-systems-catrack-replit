import { ExecutionDiagnosticsCollector } from "../services/ExecutionDiagnosticsCollector";
import { InMemoryExecutionDiagnosticsQueryFacade } from "../services/InMemoryExecutionDiagnosticsQueryFacade";

function buildSnapshot(executionId: string, correlationId: string) {
  const collector = new ExecutionDiagnosticsCollector();
  const observer = collector.begin({
    executionId,
    correlationId,
    workflowDefinitionId: "definition-001",
    workflowVersionId: "version-001",
    workflowInstanceId: "instance-001",
    executionHash: `hash-${executionId}`,
    runtimeOperationId: "SUBMIT",
    transactionId: `txn-${executionId}`,
    publishVersion: "version-001",
  });

  observer.recordTrace({
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
    stage: "ExecutionOrchestrator",
    component: "WorkflowExecutionOrchestrator",
    operation: "ExecutionStarted",
    duration: 0,
    status: "Started",
    correlationId,
    diagnostics: {},
  });

  observer.recordMetric({
    name: "workflow.execution.totalExecutionTime",
    value: 1,
    unit: "Milliseconds",
    tags: {
      executionPlanId: executionId,
    },
  });

  observer.recordTrace({
    timestamp: new Date("2026-01-01T00:00:00.001Z"),
    stage: "ExecutionOrchestrator",
    component: "WorkflowExecutionOrchestrator",
    operation: "ExecutionCompleted",
    duration: 1,
    status: "Completed",
    correlationId,
    diagnostics: {},
  });

  return observer.snapshot();
}

describe("InMemoryExecutionDiagnosticsQueryFacade", () => {
  test("records and queries diagnostics by execution and correlation", () => {
    const facade = new InMemoryExecutionDiagnosticsQueryFacade();
    const first = buildSnapshot("exec-001", "corr-001");
    const second = buildSnapshot("exec-002", "corr-001");

    facade.record(first);
    facade.record(second);

    expect(facade.getByExecutionId("exec-001")?.correlation.executionId).toBe("exec-001");
    expect(facade.getByCorrelationId("corr-001")).toHaveLength(2);
    expect(facade.listRecent(1)[0].correlation.executionId).toBe("exec-002");
  });

  test("enforces in-memory capacity while keeping recent snapshots", () => {
    const facade = new InMemoryExecutionDiagnosticsQueryFacade(2);
    facade.record(buildSnapshot("exec-001", "corr-001"));
    facade.record(buildSnapshot("exec-002", "corr-002"));
    facade.record(buildSnapshot("exec-003", "corr-003"));

    expect(facade.getByExecutionId("exec-001")).toBeUndefined();
    expect(facade.getByExecutionId("exec-003")).toBeDefined();
    expect(facade.listRecent(10)).toHaveLength(2);
  });
});
