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
});
