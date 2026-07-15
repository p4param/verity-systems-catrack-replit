import type {
  ResolvedWorkflowPolicy,
  WorkflowPolicyResolutionContext,
  WorkflowProcessPolicy,
} from "../models/WorkflowModels";

export interface WorkflowPolicyProviderCapabilities {
  deterministic: boolean;
  supportsActionScope: boolean;
  supportsTransitionScope: boolean;
  supportsWorkflowScope: boolean;
}

export interface IWorkflowPolicyProvider {
  readonly providerKey: string;
  readonly policyTypes: readonly WorkflowProcessPolicy["policyType"][];
  readonly capabilities: WorkflowPolicyProviderCapabilities;

  resolvePolicy(
    context: WorkflowPolicyResolutionContext,
    policy: WorkflowProcessPolicy
  ): Promise<ResolvedWorkflowPolicy>;
}
