import type { IWorkflowPolicyProvider, WorkflowPolicyProviderCapabilities } from "../../contracts/IWorkflowPolicyProvider";
import { WORKFLOW_POLICY_TYPES } from "../../models/DesignerModels";
import type {
  ResolvedWorkflowPolicy,
  WorkflowPolicyResolutionContext,
  WorkflowProcessPolicy,
} from "../../models/WorkflowModels";

export class GenericPolicyProvider implements IWorkflowPolicyProvider {
  public readonly providerKey = "policy.provider.generic";
  public readonly policyTypes = WORKFLOW_POLICY_TYPES;
  public readonly capabilities: WorkflowPolicyProviderCapabilities = {
    deterministic: true,
    supportsActionScope: true,
    supportsTransitionScope: true,
    supportsWorkflowScope: true,
  };

  async resolvePolicy(
    context: WorkflowPolicyResolutionContext,
    policy: WorkflowProcessPolicy
  ): Promise<ResolvedWorkflowPolicy> {
    return {
      policyId: policy.id,
      policyCode: policy.code,
      policyType: policy.policyType,
      providerKey: this.providerKey,
      scope: policy.scope,
      transitionCode: policy.transitionCode,
      actionCode: policy.actionCode,
      priority: policy.priority,
      configuration: {
        ...(policy.configuration ?? {}),
        transitionCode: context.transition.code,
      },
    };
  }
}
