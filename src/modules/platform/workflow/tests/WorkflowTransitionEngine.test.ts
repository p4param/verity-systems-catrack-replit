import { StateMachineEngine } from "../services/StateMachineEngine";
import { TransitionEngine } from "../services/TransitionEngine";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("TransitionEngine", () => {
  test("returns allowed transitions sorted by priority", async () => {
    const stateMachine = new StateMachineEngine();
    const transitionEngine = new TransitionEngine();
    const snapshot = buildWorkflowSnapshot();

    snapshot.transitions.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "SUBMIT_FAST",
      name: "Submit Fast",
      sourceStateCode: "DRAFT",
      destinationStateCode: "SUBMITTED",
      actionCode: "SUBMIT_ACTION",
      priority: 0,
      sequence: 3,
      auditFlag: true,
      rollbackFlag: false,
    });

    const model = await stateMachine.buildRuntimeModel(snapshot);
    const transitions = await transitionEngine.getAvailableTransitions(model, "DRAFT");

    expect(transitions.map((item) => item.code)).toEqual(["SUBMIT_FAST", "SUBMIT"]);
  });

  test("resolves next state using condition and permission metadata", async () => {
    const stateMachine = new StateMachineEngine();
    const transitionEngine = new TransitionEngine();
    const snapshot = buildWorkflowSnapshot();

    snapshot.transitions[0].conditionId = "COND_OK";
    snapshot.transitions[0].permissionCode = "Incident.Edit";

    const model = await stateMachine.buildRuntimeModel(snapshot);

    const denied = await transitionEngine.resolve(model, "DRAFT", {
      conditionOutcomes: { COND_OK: true },
      grantedPermissions: [],
    });
    expect(denied.canMove).toBe(false);

    const allowed = await transitionEngine.resolve(model, "DRAFT", {
      conditionOutcomes: { COND_OK: true },
      grantedPermissions: ["Incident.Edit"],
    });

    expect(allowed.canMove).toBe(true);
    expect(allowed.nextStateCode).toBe("SUBMITTED");
    expect(allowed.selectedTransition?.code).toBe("SUBMIT");
  });

  test("validates rollback metadata", async () => {
    const stateMachine = new StateMachineEngine();
    const transitionEngine = new TransitionEngine();
    const snapshot = buildWorkflowSnapshot();

    snapshot.transitions[0].rollbackFlag = true;
    snapshot.transitions[0].compensationActionCode = undefined;

    const model = await stateMachine.buildRuntimeModel(snapshot);
    const issues = transitionEngine.validateTransitions(model.runtimeGraph);

    expect(issues.some((item) => item.code === "WF_INVALID_ROLLBACK_PATH")).toBe(true);
  });
});
