import type {
  ActionPlan,
  EffectResolutionResult,
  PolicyPlan,
  WorkflowMetadataSnapshot,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export interface IWorkflowActionValidator {
  validateSnapshot(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationIssue[]>;
  validatePlans(
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan,
    effectResolution: EffectResolutionResult
  ): Promise<WorkflowValidationIssue[]>;
}
