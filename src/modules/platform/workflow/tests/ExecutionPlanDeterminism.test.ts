import { randomUUID } from "crypto";
import { ExecutionPlanBuilder } from "../services/ExecutionPlanBuilder";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Execution plan determinism", () => {
  test("produces stable deterministic hash for identical plan inputs", async () => {
    const snapshot = buildWorkflowSnapshot();
    const transition = snapshot.transitions[0];
    const builder = new ExecutionPlanBuilder();

    const effectCode = `${transition.code}::SUBMIT_ACTION`;
    const actionPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: transition.code,
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      actions: [
        {
          actionId: randomUUID(),
          actionCode: "SUBMIT_ACTION",
          actionType: "StateChange" as const,
          providerKey: "action.provider.platform",
          sequence: 1,
          priority: 1,
          dependencies: [],
          payload: { targetStateCode: "SUBMITTED" },
        },
      ],
      diagnostics: {},
    };

    const policyPlan = {
      workflowVersionId: snapshot.version.id,
      transitionCode: transition.code,
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      policies: [
        {
          policyId: randomUUID(),
          policyCode: "WF_RETRY",
          policyType: "RetryPolicy" as const,
          providerKey: "policy.provider.generic",
          scope: "Workflow" as const,
          priority: 1,
          configuration: { maxAttempts: 3, backoffSeconds: 2 },
        },
      ],
      diagnostics: {},
    };

    const effectResolution = {
      effectSet: {
        workflowVersionId: snapshot.version.id,
        transitionCode: transition.code,
        generatedAt: new Date("2026-01-01T00:00:00.000Z"),
        effects: [
          {
            effectCode,
            effectType: "StateChange",
            actionCode: "SUBMIT_ACTION",
            dependencies: [],
            priority: 1,
            parallelizable: true,
            policyMetadata: {
              retryPolicy: { maxAttempts: 3, backoffSeconds: 2 },
              timeoutSeconds: 30,
            },
          },
        ],
      },
      dependencyGraph: {
        actionGraph: { nodes: ["SUBMIT_ACTION"], edges: [] },
        policyGraph: { nodes: ["WF_RETRY"], edges: [] },
        runtimeEffectGraph: { nodes: [effectCode], edges: [] },
        executionGraph: { nodes: [effectCode], edges: [] },
      },
      orderedEffectCodes: [effectCode],
      parallelBatches: [[effectCode]],
    };

    const first = await builder.build(transition, actionPlan, policyPlan, effectResolution);
    const second = await builder.build(transition, actionPlan, policyPlan, effectResolution);

    expect(first.metadata.deterministicHash).toBe(second.metadata.deterministicHash);
  });
});
