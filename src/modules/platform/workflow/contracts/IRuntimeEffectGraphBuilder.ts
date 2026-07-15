import type { ActionPlan, EffectDependencyGraph, PolicyPlan } from "../models/WorkflowModels";

export interface IRuntimeEffectGraphBuilder {
  build(actionPlan: ActionPlan, policyPlan: PolicyPlan): EffectDependencyGraph;
}
