import type {
  ActionPlan,
  EffectResolutionResult,
  ExecutionPlan,
  PolicyPlan,
  WorkflowTransition,
} from "../models/WorkflowModels";

export interface IExecutionPlanBuilder {
  build(
    transition: WorkflowTransition,
    actionPlan: ActionPlan,
    policyPlan: PolicyPlan,
    effectResolution: EffectResolutionResult
  ): Promise<ExecutionPlan>;
}
