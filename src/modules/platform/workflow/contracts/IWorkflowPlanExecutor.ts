import type { ExecutionPlan, WorkflowExecutionContext } from "../models/WorkflowModels";

export interface IWorkflowPlanExecutor {
  execute(plan: ExecutionPlan, context: WorkflowExecutionContext): Promise<void>;
}
