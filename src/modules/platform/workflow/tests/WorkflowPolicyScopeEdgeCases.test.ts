import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { RuntimeEffectPlanner } from "../services/RuntimeEffectPlanner";
import { RuntimeEffectGraphBuilder } from "../services/RuntimeEffectGraphBuilder";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { buildWorkflowSnapshotWithPolicyScopes } from "./WorkflowTestData";

describe("Workflow policy scope edge cases", () => {
  test("applies transition policy only to matching transition", async () => {
    const snapshot = buildWorkflowSnapshotWithPolicyScopes();
    const registry = new WorkflowActionRegistry();
    registry.register(new PlatformActionProvider());

    const actionEngine = new WorkflowActionEngine(registry);
    const policyEngine = new WorkflowPolicyEngine([new GenericPolicyProvider()]);

    const submitTransition = snapshot.transitions.find((item) => item.code === "SUBMIT")!;
    const approveTransition = snapshot.transitions.find((item) => item.code === "APPROVE")!;

    const submitActionPlan = await actionEngine.resolve({
      snapshot,
      transition: submitTransition,
      runtimeContext: {} as any,
    });
    const approveActionPlan = await actionEngine.resolve({
      snapshot,
      transition: approveTransition,
      runtimeContext: {} as any,
    });

    const submitPolicyPlan = await policyEngine.resolve({
      snapshot,
      transition: submitTransition,
      actionPlan: submitActionPlan,
    });
    const approvePolicyPlan = await policyEngine.resolve({
      snapshot,
      transition: approveTransition,
      actionPlan: approveActionPlan,
    });

    expect(submitPolicyPlan.policies.some((item) => item.policyCode === "SUBMIT_TIMEOUT")).toBe(true);
    expect(approvePolicyPlan.policies.some((item) => item.policyCode === "SUBMIT_TIMEOUT")).toBe(false);
  });

  test("applies action-scoped policy to matching action effect metadata only", async () => {
    const snapshot = buildWorkflowSnapshotWithPolicyScopes();
    const registry = new WorkflowActionRegistry();
    registry.register(new PlatformActionProvider());

    const actionEngine = new WorkflowActionEngine(registry);
    const policyEngine = new WorkflowPolicyEngine([new GenericPolicyProvider()]);
    const planner = new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder());

    const transition = snapshot.transitions.find((item) => item.code === "APPROVE")!;
    const actionPlan = await actionEngine.resolve({
      snapshot,
      transition,
      runtimeContext: {} as any,
    });
    const policyPlan = await policyEngine.resolve({
      snapshot,
      transition,
      actionPlan,
    });

    const planned = await planner.plan(snapshot, transition, actionPlan, policyPlan);
    const approveEffect = planned.effectSet.effects.find((item) => item.actionCode === "APPROVE_ACTION");

    expect(approveEffect).toBeDefined();
    expect(policyPlan.policies.some((item) => item.policyCode === "APPROVE_AUDIT")).toBe(true);
  });
});
