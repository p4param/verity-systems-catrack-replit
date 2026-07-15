import type {
  ActionPlan,
  EffectResolutionResult,
  PolicyPlan,
  WorkflowMetadataSnapshot,
  WorkflowTransition,
} from "../models/WorkflowModels";

export interface IRuntimeEffectPlanner {
  plan(
    snapshot: WorkflowMetadataSnapshot,
    transition: WorkflowTransition,
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan
  ): Promise<EffectResolutionResult>;
}
