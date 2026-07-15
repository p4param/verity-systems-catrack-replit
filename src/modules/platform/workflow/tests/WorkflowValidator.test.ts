import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { WorkflowValidator } from "../services/WorkflowValidator";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("WorkflowValidator", () => {
  test("validates a correct workflow metadata snapshot", async () => {
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const result = await validator.validate(buildWorkflowSnapshot());

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("detects duplicate states and missing actions", async () => {
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const snapshot = buildWorkflowSnapshot();
    snapshot.states.push({ ...snapshot.states[0], id: crypto.randomUUID() });
    snapshot.transitions[0].actionCode = "MISSING_ACTION";

    const result = await validator.validate(snapshot);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((item) => item.code === "WF_DUPLICATE_STATE_CODE")).toBe(true);
    expect(result.errors.some((item) => item.code === "WF_MISSING_ACTION")).toBe(true);
  });

  test("detects circular transitions", async () => {
    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const snapshot = buildWorkflowSnapshot();
    snapshot.transitions.push({
      id: crypto.randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "ROLLBACK",
      name: "Rollback",
      sourceStateCode: "SUBMITTED",
      destinationStateCode: "DRAFT",
      actionCode: "SUBMIT_ACTION",
      priority: 2,
      sequence: 2,
      auditFlag: true,
      rollbackFlag: true,
    });

    const result = await validator.validate(snapshot);

    expect(result.errors.some((item) => item.code === "WF_CIRCULAR_TRANSITIONS")).toBe(true);
  });
});
