import type { IWorkflowActionRegistry } from "../contracts/IWorkflowActionRegistry";
import type { IWorkflowPolicyProvider } from "../contracts/IWorkflowPolicyProvider";
import type { IWorkflowActionValidator } from "../contracts/IWorkflowActionValidator";
import type {
  ActionPlan,
  EffectResolutionResult,
  PolicyPlan,
  WorkflowAction,
  WorkflowMetadataSnapshot,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";
import { WorkflowActionPolicySchemas } from "./WorkflowActionPolicySchemas";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export class WorkflowActionValidator implements IWorkflowActionValidator {
  private readonly policyTypes = new Set<string>();

  constructor(
    private readonly actionRegistry: IWorkflowActionRegistry,
    policyProviders: readonly IWorkflowPolicyProvider[],
    private readonly metadataSchemas: WorkflowActionPolicySchemas = new WorkflowActionPolicySchemas()
  ) {
    for (const provider of policyProviders) {
      for (const policyType of provider.policyTypes) {
        this.policyTypes.add(policyType);
      }
    }
  }

  async validateSnapshot(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationIssue[]> {
    const issues: WorkflowValidationIssue[] = [];

    this.validateDuplicateActionCodes(snapshot, issues);
    this.validateDuplicatePolicyCodes(snapshot, issues);
    this.validateActionReferences(snapshot, issues);
    this.validateProviders(snapshot, issues);
    this.validateRetryAndTimeout(snapshot, issues);
    this.validateConflictingPolicies(snapshot, issues);
    issues.push(...this.metadataSchemas.validate(snapshot));

    return issues;
  }

  async validatePlans(
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan,
    effectResolution: EffectResolutionResult
  ): Promise<WorkflowValidationIssue[]> {
    const issues: WorkflowValidationIssue[] = [];

    this.validateDuplicatePlannedActions(actionPlan, issues);
    this.validateDuplicatePlannedPolicies(policyPlan, issues);
    this.validateOrphanEffects(effectResolution, issues);

    return issues;
  }

  private validateDuplicateActionCodes(
    snapshot: WorkflowMetadataSnapshot,
    issues: WorkflowValidationIssue[]
  ): void {
    const seen = new Set<string>();
    for (const action of snapshot.actions) {
      const code = action.code.toUpperCase();
      if (seen.has(code)) {
        issues.push({
          code: "WF_ACTION_DUPLICATE",
          message: `Duplicate action code detected: ${action.code}`,
          severity: "Error",
          path: `actions.${action.code}`,
        });
      }
      seen.add(code);
    }
  }

  private validateDuplicatePolicyCodes(
    snapshot: WorkflowMetadataSnapshot,
    issues: WorkflowValidationIssue[]
  ): void {
    const seen = new Set<string>();
    for (const policy of snapshot.policies ?? []) {
      const code = policy.code.toUpperCase();
      if (seen.has(code)) {
        issues.push({
          code: "WF_POLICY_DUPLICATE",
          message: `Duplicate policy code detected: ${policy.code}`,
          severity: "Error",
          path: `policies.${policy.code}`,
        });
      }
      seen.add(code);
    }
  }

  private validateActionReferences(
    snapshot: WorkflowMetadataSnapshot,
    issues: WorkflowValidationIssue[]
  ): void {
    const actionCodes = new Set(snapshot.actions.map((action) => action.code));

    for (const transition of snapshot.transitions) {
      if (!actionCodes.has(transition.actionCode)) {
        issues.push({
          code: "WF_ACTION_REFERENCE_INVALID",
          message: `Transition ${transition.code} references invalid action ${transition.actionCode}.`,
          severity: "Error",
          path: `transitions.${transition.code}`,
        });
      }
    }

    for (const action of snapshot.actions) {
      for (const dependency of action.dependsOnActionCodes ?? []) {
        if (!actionCodes.has(dependency)) {
          issues.push({
            code: "WF_ACTION_DEPENDENCY_INVALID",
            message: `Action ${action.code} has invalid dependency ${dependency}.`,
            severity: "Error",
            path: `actions.${action.code}`,
          });
        }
      }
    }

    this.validateActionDependencyCycles(snapshot.actions, issues);
  }

  private validateActionDependencyCycles(actions: WorkflowAction[], issues: WorkflowValidationIssue[]): void {
    const graph = new Map<string, string[]>();
    for (const action of actions) {
      graph.set(action.code, [...(action.dependsOnActionCodes ?? [])]);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const hasCycle = (code: string): boolean => {
      if (visiting.has(code)) {
        return true;
      }
      if (visited.has(code)) {
        return false;
      }

      visiting.add(code);
      for (const dependency of graph.get(code) ?? []) {
        if (hasCycle(dependency)) {
          return true;
        }
      }
      visiting.delete(code);
      visited.add(code);
      return false;
    };

    for (const action of actions) {
      if (hasCycle(action.code)) {
        issues.push({
          code: "WF_ACTION_CIRCULAR_DEPENDENCY",
          message: "Circular action dependencies detected.",
          severity: "Error",
        });
        return;
      }
    }
  }

  private validateProviders(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    for (const action of snapshot.actions) {
      const provider = action.providerKey
        ? this.actionRegistry.getByProviderKey(action.providerKey)
        : this.actionRegistry.getByActionType(action.actionType);
      if (!provider) {
        issues.push({
          code: "WF_ACTION_PROVIDER_MISSING",
          message: `Missing provider for action ${action.code} (${action.actionType}).`,
          severity: "Error",
          path: `actions.${action.code}`,
        });
      }
    }

    for (const policy of snapshot.policies ?? []) {
      if (!this.policyTypes.has(policy.policyType)) {
        issues.push({
          code: "WF_POLICY_PROVIDER_MISSING",
          message: `Missing provider for policy ${policy.code} (${policy.policyType}).`,
          severity: "Error",
          path: `policies.${policy.code}`,
        });
      }
    }
  }

  private validateRetryAndTimeout(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    for (const action of snapshot.actions) {
      if (action.retryPolicy) {
        if (action.retryPolicy.maxAttempts < 1 || action.retryPolicy.maxAttempts > 10) {
          issues.push({
            code: "WF_ACTION_RETRY_INVALID",
            message: `Action ${action.code} has invalid retry maxAttempts.`,
            severity: "Error",
            path: `actions.${action.code}`,
          });
        }

        if (action.retryPolicy.backoffSeconds < 0) {
          issues.push({
            code: "WF_ACTION_RETRY_INVALID",
            message: `Action ${action.code} has invalid retry backoffSeconds.`,
            severity: "Error",
            path: `actions.${action.code}`,
          });
        }
      }

      if (action.timeoutSeconds !== undefined && (!isFiniteNumber(action.timeoutSeconds) || action.timeoutSeconds <= 0)) {
        issues.push({
          code: "WF_ACTION_TIMEOUT_INVALID",
          message: `Action ${action.code} has invalid timeoutSeconds.`,
          severity: "Error",
          path: `actions.${action.code}`,
        });
      }
    }

    for (const policy of snapshot.policies ?? []) {
      if (policy.policyType === "RetryPolicy") {
        const maxAttempts = policy.configuration?.maxAttempts;
        const backoffSeconds = policy.configuration?.backoffSeconds;
        if (!isFiniteNumber(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
          issues.push({
            code: "WF_POLICY_RETRY_INVALID",
            message: `Policy ${policy.code} has invalid maxAttempts.`,
            severity: "Error",
            path: `policies.${policy.code}`,
          });
        }
        if (!isFiniteNumber(backoffSeconds) || backoffSeconds < 0) {
          issues.push({
            code: "WF_POLICY_RETRY_INVALID",
            message: `Policy ${policy.code} has invalid backoffSeconds.`,
            severity: "Error",
            path: `policies.${policy.code}`,
          });
        }
      }

      if (policy.policyType === "TimeoutPolicy") {
        const timeout = policy.configuration?.timeoutSeconds;
        if (!isFiniteNumber(timeout) || timeout <= 0) {
          issues.push({
            code: "WF_POLICY_TIMEOUT_INVALID",
            message: `Policy ${policy.code} has invalid timeoutSeconds.`,
            severity: "Error",
            path: `policies.${policy.code}`,
          });
        }
      }
    }
  }

  private validateConflictingPolicies(snapshot: WorkflowMetadataSnapshot, issues: WorkflowValidationIssue[]): void {
    const policies = snapshot.policies ?? [];
    const seen = new Map<string, string>();

    for (const policy of policies) {
      const scopeKey = `${policy.policyType}:${policy.scope}:${policy.transitionCode ?? "*"}:${policy.actionCode ?? "*"}`;
      const configHash = JSON.stringify(policy.configuration ?? {});
      const previous = seen.get(scopeKey);

      if (previous && previous !== configHash) {
        issues.push({
          code: "WF_POLICY_CONFLICT",
          message: `Conflicting policy configuration for ${scopeKey}.`,
          severity: "Error",
          path: `policies.${policy.code}`,
        });
      }

      if (!previous) {
        seen.set(scopeKey, configHash);
      }
    }
  }

  private validateDuplicatePlannedActions(actionPlan: ActionPlan, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const action of actionPlan.actions) {
      const key = action.actionCode.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_ACTION_PLAN_DUPLICATE",
          message: `Action plan contains duplicate action ${action.actionCode}.`,
          severity: "Error",
          path: `actionPlan.${action.actionCode}`,
        });
      }
      seen.add(key);
    }
  }

  private validateDuplicatePlannedPolicies(policyPlan: PolicyPlan, issues: WorkflowValidationIssue[]): void {
    const seen = new Set<string>();
    for (const policy of policyPlan.policies) {
      const key = policy.policyCode.toUpperCase();
      if (seen.has(key)) {
        issues.push({
          code: "WF_POLICY_PLAN_DUPLICATE",
          message: `Policy plan contains duplicate policy ${policy.policyCode}.`,
          severity: "Error",
          path: `policyPlan.${policy.policyCode}`,
        });
      }
      seen.add(key);
    }
  }

  private validateOrphanEffects(
    effectResolution: EffectResolutionResult,
    issues: WorkflowValidationIssue[]
  ): void {
    const effectCodes = new Set(effectResolution.effectSet.effects.map((effect) => effect.effectCode));
    for (const edge of effectResolution.dependencyGraph.executionGraph.edges) {
      if (!effectCodes.has(edge.from) || !effectCodes.has(edge.to)) {
        issues.push({
          code: "WF_ORPHAN_EFFECT",
          message: `Execution graph edge references orphan effect: ${edge.from} -> ${edge.to}.`,
          severity: "Error",
          path: "executionGraph",
        });
      }
    }
  }
}
