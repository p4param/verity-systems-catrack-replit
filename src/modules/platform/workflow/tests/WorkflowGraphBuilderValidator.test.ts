import { WorkflowGraphBuilder } from "../services/WorkflowGraphBuilder";
import { WorkflowGraphValidator } from "../services/WorkflowGraphValidator";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Workflow graph builder and validator", () => {
  test("builds runtime graph layers", () => {
    const snapshot = buildWorkflowSnapshot();
    const builder = new WorkflowGraphBuilder();
    const graph = builder.build(snapshot);

    expect(graph.workflowGraph.nodes.length).toBe(2);
    expect(graph.stateGraph.outgoingByState.DRAFT).toContain("SUBMITTED");
    expect(graph.transitionGraph.transitionsBySourceState.DRAFT.length).toBe(1);
  });

  test("builds deterministic node and edge ordering", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.states.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "ARCHIVED",
      name: "Archived",
      isInitial: false,
      isTerminal: true,
      sequence: 2,
    });
    snapshot.transitions.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "ARCHIVE",
      name: "Archive",
      sourceStateCode: "SUBMITTED",
      destinationStateCode: "ARCHIVED",
      actionCode: "SUBMIT_ACTION",
      priority: 1,
      sequence: 2,
      auditFlag: true,
      rollbackFlag: false,
    });

    const graph = new WorkflowGraphBuilder().build(snapshot);

    expect(graph.workflowGraph.nodes.map((item) => item.code)).toEqual(["DRAFT", "ARCHIVED", "SUBMITTED"]);
    expect(graph.workflowGraph.edges.map((item) => item.code)).toEqual(["SUBMIT", "ARCHIVE"]);
  });

  test("detects duplicate transitions and invalid priorities", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.transitions.push({
      ...snapshot.transitions[0],
      id: crypto.randomUUID(),
      code: "SUBMIT_DUP",
    });
    snapshot.transitions[0].priority = 0;

    const graph = new WorkflowGraphBuilder().build(snapshot);
    const issues = new WorkflowGraphValidator().validate(graph);

    expect(issues.some((item) => item.code === "WF_DUPLICATE_TRANSITION")).toBe(true);
    expect(issues.some((item) => item.code === "WF_INVALID_PRIORITY")).toBe(true);
  });

  test("detects duplicate state and transition codes", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.states.push({
      ...snapshot.states[0],
      id: crypto.randomUUID(),
    });
    snapshot.transitions.push({
      ...snapshot.transitions[0],
      id: crypto.randomUUID(),
    });

    const graph = new WorkflowGraphBuilder().build(snapshot);
    const issues = new WorkflowGraphValidator().validate(graph);

    expect(issues.some((item) => item.code === "WF_DUPLICATE_STATE_CODE")).toBe(true);
    expect(issues.some((item) => item.code === "WF_DUPLICATE_TRANSITION_CODE")).toBe(true);
  });

  test("detects dead-end and orphan states", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.states.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "ORPHAN",
      name: "Orphan",
      isInitial: false,
      isTerminal: false,
      sequence: 10,
    });
    snapshot.states[1].isTerminal = false;

    const graph = new WorkflowGraphBuilder().build(snapshot);
    const issues = new WorkflowGraphValidator().validate(graph);

    expect(issues.some((item) => item.code === "WF_ORPHAN_STATE")).toBe(true);
    expect(issues.some((item) => item.code === "WF_DEAD_END_STATE")).toBe(true);
  });

  test("detects unreachable and disconnected states", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.states.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "UNREACHABLE",
      name: "Unreachable",
      isInitial: false,
      isTerminal: true,
      sequence: 10,
    });

    const graph = new WorkflowGraphBuilder().build(snapshot);
    const issues = new WorkflowGraphValidator().validate(graph);

    expect(issues.some((item) => item.code === "WF_UNREACHABLE_STATE")).toBe(true);
    expect(issues.some((item) => item.code === "WF_UNREACHABLE_TERMINAL_STATE")).toBe(true);
    expect(issues.some((item) => item.code === "WF_DISCONNECTED_GRAPH")).toBe(true);
  });

  test("detects self transitions and invalid retry metadata", () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.transitions[0] = {
      ...snapshot.transitions[0],
      destinationStateCode: "DRAFT",
      retryPolicy: {
        maxAttempts: 0,
        backoffSeconds: -1,
      },
    };

    const graph = new WorkflowGraphBuilder().build(snapshot);
    const issues = new WorkflowGraphValidator().validate(graph);

    expect(issues.some((item) => item.code === "WF_SELF_TRANSITION")).toBe(true);
    expect(issues.some((item) => item.code === "WF_INVALID_RETRY_METADATA")).toBe(true);
  });
});
