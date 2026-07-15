import type { PolicyPlan, WorkflowPolicyResolutionContext } from "../models/WorkflowModels";

export interface IWorkflowPolicyEngine {
  resolve(context: WorkflowPolicyResolutionContext): Promise<PolicyPlan>;
}
