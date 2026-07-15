import type { IWorkflowPlanExecutor } from "../contracts/IWorkflowPlanExecutor";
import type { ExecutionPlan, WorkflowExecutionContext } from "../models/WorkflowModels";

export class DeferredWorkflowPlanExecutor implements IWorkflowPlanExecutor {
  async execute(_plan: ExecutionPlan, _context: WorkflowExecutionContext): Promise<void> {
    throw new Error("Workflow execution is deferred to Prompt 005 executor layer.");
  }
}
