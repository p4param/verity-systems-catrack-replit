import { randomUUID } from "crypto";
import { WorkflowActionRegistry } from "../services/WorkflowActionRegistry";
import { WorkflowActionValidator } from "../services/WorkflowActionValidator";
import { PlatformActionProvider } from "../services/action-providers";
import { GenericPolicyProvider } from "../services/policy-providers";
import { WorkflowManifestGenerator } from "../services/WorkflowManifestGenerator";
import { WorkflowValidator } from "../services/WorkflowValidator";
import { RuntimeExpressionAdapter } from "../services/RuntimeExpressionAdapter";
import { buildWorkflowSnapshot } from "./WorkflowTestData";

describe("Workflow action validation and manifest generation", () => {
  test("validator reports missing provider and invalid policy timeout", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.actions[0].actionType = "CallAPI";
    snapshot.policies = [
      {
        id: randomUUID(),
        workflowVersionId: snapshot.version.id,
        code: "BAD_TIMEOUT",
        policyType: "TimeoutPolicy",
        scope: "Workflow",
        priority: 1,
        isEnabled: true,
        configuration: { timeoutSeconds: 0 },
      },
    ];

    const registry = new WorkflowActionRegistry();
    registry.register(new PlatformActionProvider());
    const validator = new WorkflowActionValidator(registry, [new GenericPolicyProvider()]);

    const issues = await validator.validateSnapshot(snapshot);

    expect(issues.some((issue) => issue.code === "WF_ACTION_PROVIDER_MISSING")).toBe(true);
    expect(issues.some((issue) => issue.code === "WF_POLICY_TIMEOUT_INVALID")).toBe(true);
  });

  test("manifest includes action/policy/effect/execution sections", async () => {
    const snapshot = buildWorkflowSnapshot();
    snapshot.policies = [
      {
        id: randomUUID(),
        workflowVersionId: snapshot.version.id,
        code: "GLOBAL_RETRY",
        policyType: "RetryPolicy",
        scope: "Workflow",
        priority: 1,
        isEnabled: true,
        configuration: { maxAttempts: 3, backoffSeconds: 1 },
      },
    ];

    const validator = new WorkflowValidator(new RuntimeExpressionAdapter());
    const validation = await validator.validate(snapshot);
    const generator = new WorkflowManifestGenerator();

    const manifest = await generator.generate(snapshot, validation, randomUUID());

    expect(manifest.actionManifest.transitions.length).toBeGreaterThan(0);
    expect(manifest.policyManifest.transitions.length).toBeGreaterThan(0);
    expect(manifest.runtimeEffectManifest.transitions.length).toBeGreaterThan(0);
    expect(manifest.executionManifest.transitions[0].orderedEffectCodes.length).toBeGreaterThan(0);
  });
});
