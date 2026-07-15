import type {
  WorkflowRuntimeModel,
  WorkflowTransitionResolutionContext,
  WorkflowTransitionResolutionResult,
} from "../models/WorkflowModels";

export interface ITransitionResolver {
  resolveTransitions(
    runtimeModel: WorkflowRuntimeModel,
    currentStateCode: string,
    context?: WorkflowTransitionResolutionContext
  ): WorkflowTransitionResolutionResult;
}
