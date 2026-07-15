import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { IWorkflowPolicyProvider } from "../contracts/IWorkflowPolicyProvider";
import type {
  PolicyPlan,
  WorkflowPolicyResolutionContext,
  WorkflowProcessPolicy,
} from "../models/WorkflowModels";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
  }
  return value;
}

function resolveGeneratedAt(context: WorkflowPolicyResolutionContext): Date {
  return context.snapshot.version.publishedAt ?? context.snapshot.version.updatedAt ?? context.snapshot.version.createdAt;
}

export class WorkflowPolicyEngine implements IWorkflowPolicyEngine {
  private readonly providersByType = new Map<WorkflowProcessPolicy["policyType"], IWorkflowPolicyProvider>();

  constructor(private readonly providers: readonly IWorkflowPolicyProvider[]) {
    for (const provider of providers) {
      for (const policyType of provider.policyTypes) {
        this.providersByType.set(policyType, provider);
      }
    }
  }

  async resolve(context: WorkflowPolicyResolutionContext): Promise<PolicyPlan> {
    const selected = (context.snapshot.policies ?? [])
      .filter((policy) => policy.isEnabled)
      .filter((policy) => this.appliesToContext(policy, context))
      .sort((a, b) => a.priority - b.priority || a.code.localeCompare(b.code));

    const policies = [] as PolicyPlan["policies"];
    for (const policy of selected) {
      const provider = this.providersByType.get(policy.policyType);
      if (!provider) {
        throw new Error(`No policy provider registered for policy ${policy.code} (${policy.policyType}).`);
      }

      policies.push(await provider.resolvePolicy(context, policy));
    }

    return deepFreeze({
      workflowVersionId: context.snapshot.version.id,
      transitionCode: context.transition.code,
      generatedAt: resolveGeneratedAt(context),
      policies,
      diagnostics: {
        policyCount: policies.length,
        providerCount: this.providers.length,
      },
    });
  }

  private appliesToContext(
    policy: WorkflowProcessPolicy,
    context: WorkflowPolicyResolutionContext
  ): boolean {
    if (policy.scope === "Workflow") {
      return true;
    }

    if (policy.scope === "Transition") {
      return !policy.transitionCode || policy.transitionCode === context.transition.code;
    }

    if (policy.scope === "Action") {
      if (!policy.actionCode) {
        return false;
      }

      return context.actionPlan.actions.some((action) => action.actionCode === policy.actionCode);
    }

    return false;
  }
}
