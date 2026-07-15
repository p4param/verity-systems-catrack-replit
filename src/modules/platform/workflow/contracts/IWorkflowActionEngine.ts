import type { ActionPlan, WorkflowActionResolutionContext } from "../models/WorkflowModels";

export interface IWorkflowActionEngine {
  resolve(context: WorkflowActionResolutionContext): Promise<ActionPlan>;
}
