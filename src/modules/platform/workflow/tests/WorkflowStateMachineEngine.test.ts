import { StateMachineEngine } from "../services/StateMachineEngine";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("StateMachineEngine", () => {
  test("builds deterministic immutable runtime model", async () => {
    const engine = new StateMachineEngine();
    const snapshot = buildWorkflowSnapshot();
    const model = await engine.buildRuntimeModel(snapshot);

    expect(model.initialStateCode).toBe("DRAFT");
    expect(model.runtimeGraph.workflowGraph.nodes.length).toBeGreaterThan(0);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.runtimeGraph.workflowGraph.edges)).toBe(true);
  });

  test("detects terminal states", async () => {
    const engine = new StateMachineEngine();
    const snapshot = buildWorkflowSnapshot();
    snapshot.states[1].isTerminal = true;

    const model = await engine.buildRuntimeModel(snapshot);

    expect(engine.isTerminalState(model, "SUBMITTED")).toBe(true);
    expect(engine.isTerminalState(model, "DRAFT")).toBe(false);
  });

  test("throws on invalid state graph", async () => {
    const engine = new StateMachineEngine();
    const snapshot = buildWorkflowSnapshot();
    snapshot.states[0].isInitial = true;
    snapshot.states[1].isInitial = true;

    await expect(engine.buildRuntimeModel(snapshot)).rejects.toThrow("Invalid state graph");
  });
});
