import { randomUUID } from "crypto";
import { WorkflowActionEngine } from "../services/WorkflowActionEngine";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowPolicyEngine } from "../services/WorkflowPolicyEngine";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Workflow action and policy resolution", () => {
  test("resolves transition action plan with dependencies", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.actions = [
      {
        id: randomUUID(),
        workflowVersionId: snapshot.version.id,
        code: "PREPARE",
        name: "Prepare",
        actionType: "StateChange",
        sequence: 1,
        isEnabled: true,
      },
      {
        id: randomUUID(),
        workflowVersionId: snapshot.version.id,
        code: "SUBMIT_ACTION",
        name: "Submit",
        actionType: "StateChange",
        sequence: 2,
        isEnabled: true,
        dependsOnActionCodes: ["PREPARE"],
      },
    ];

    const registry = new WorkflowActionRegistry();
    registry.register(new PlatformActionProvider());

    const engine = new WorkflowActionEngine(registry);
    const actionPlan = await engine.resolve({
      snapshot,
      transition: snapshot.transitions[0],
      runtimeContext: {} as any,
    });

    expect(actionPlan.actions.map((action) => action.actionCode)).toEqual(["PREPARE", "SUBMIT_ACTION"]);
    expect(actionPlan.actions[1].dependencies).toEqual(["PREPARE"]);
  });

  test("resolves workflow and action scoped policies deterministically", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.policies = [
      {
        id: randomUUID(),
        workflowVersionId: snapshot.version.id,
        code: "GLOBAL_RETRY",
        policyType: "RetryPolicy",
        scope: "Workflow",
        priority: 2,
        isEnabled: true,
        configuration: { maxAttempts: 3, backoffSeconds: 5 },
      },
      {
        id: randomUUID(),
        workflowVersionId: snapshot.version.id,
        code: "ACTION_TIMEOUT",
        policyType: "TimeoutPolicy",
        scope: "Action",
        actionCode: "SUBMIT_ACTION",
        priority: 1,
        isEnabled: true,
        configuration: { timeoutSeconds: 60 },
      },
    ];

    const actionPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: snapshot.transitions[0].code,
      generatedAt: new Date(),
      actions: [
        {
          actionId: randomUUID(),
          actionCode: "SUBMIT_ACTION",
          actionType: "StateChange",
          providerKey: "action.provider.platform",
          sequence: 1,
          priority: 1,
          dependencies: [],
          payload: {},
        },
      ],
      diagnostics: {},
    };

    const policyEngine = new WorkflowPolicyEngine([new GenericPolicyProvider()]);
    const policyPlan = await policyEngine.resolve({
      snapshot,
      transition: snapshot.transitions[0],
      actionPlan,
    });

    expect(policyPlan.policies.map((policy) => policy.policyCode)).toEqual(["ACTION_TIMEOUT", "GLOBAL_RETRY"]);
  });
});
