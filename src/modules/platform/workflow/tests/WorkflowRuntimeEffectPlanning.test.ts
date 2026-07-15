import { randomUUID } from "crypto";
import { RuntimeEffectGraphBuilder } from "../services/RuntimeEffectGraphBuilder";
import { RuntimeEffectPlanner } from "../services/RuntimeEffectPlanner";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Workflow runtime effect planning", () => {
  test("builds deterministic execution order and parallel batches", async () => {
    const snapshot = buildWorkflowSnapshot();
    const transition = snapshot.transitions[0];
    const planner = new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder());

    const actionPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: transition.code,
      generatedAt: new Date(),
      actions: [
        {
          actionId: randomUUID(),
          actionCode: "A_PREPARE",
          actionType: "StateChange",
          providerKey: "action.provider.platform",
          sequence: 1,
          priority: 1,
          dependencies: [],
          parallelMode: "Sequential" as const,
          payload: {},
        },
        {
          actionId: randomUUID(),
          actionCode: "B_NOTIFY",
          actionType: "Notification",
          providerKey: "action.provider.notification",
          sequence: 2,
          priority: 2,
          dependencies: ["A_PREPARE"],
          payload: {},
        },
      ],
      diagnostics: {},
    };

    const policyPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: transition.code,
      generatedAt: new Date(),
      policies: [
        {
          policyId: randomUUID(),
          policyCode: "RETRY_DEFAULT",
          policyType: "RetryPolicy" as const,
          providerKey: "policy.provider.generic",
          scope: "Workflow" as const,
          priority: 1,
          configuration: { maxAttempts: 3, backoffSeconds: 2 },
        },
      ],
      diagnostics: {},
    };

    const result = await planner.plan(snapshot, transition, actionPlan, policyPlan);

    expect(result.orderedEffectCodes).toEqual([
      `${transition.code}::A_PREPARE`,
      `${transition.code}::B_NOTIFY`,
    ]);
    expect(result.parallelBatches[0]).toEqual([`${transition.code}::A_PREPARE`]);
    expect(result.parallelBatches[1]).toEqual([`${transition.code}::B_NOTIFY`]);
    expect(result.effectSet.effects[0].policyMetadata.retryPolicy?.maxAttempts).toBe(3);
  });

  test("detects circular execution dependencies", async () => {
    const snapshot = buildWorkflowSnapshot();
    const transition = snapshot.transitions[0];
    const planner = new RuntimeEffectPlanner(new RuntimeEffectGraphBuilder());

    const actionPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: transition.code,
      generatedAt: new Date(),
      actions: [
        {
          actionId: randomUUID(),
          actionCode: "A",
          actionType: "StateChange",
          providerKey: "action.provider.platform",
          sequence: 1,
          priority: 1,
          dependencies: ["B"],
          payload: {},
        },
        {
          actionId: randomUUID(),
          actionCode: "B",
          actionType: "StateChange",
          providerKey: "action.provider.platform",
          sequence: 2,
          priority: 2,
          dependencies: ["A"],
          payload: {},
        },
      ],
      diagnostics: {},
    };

    const policyPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: transition.code,
      generatedAt: new Date(),
      policies: [],
      diagnostics: {},
    };

    await expect(planner.plan(snapshot, transition, actionPlan, policyPlan)).rejects.toThrow(
      "Circular runtime effect dependencies"
    );
  });
});
