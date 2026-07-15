import type {
  WorkflowEdge,
  WorkflowRuntimeGraph,
  WorkflowRuntimeModel,
  WorkflowTransitionResolutionContext,
  WorkflowTransitionResolutionResult,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export interface ITransitionEngine {
  registerTransitions(edges: WorkflowEdge[]): readonly WorkflowEdge[];
  validateTransitions(graph: WorkflowRuntimeGraph): WorkflowValidationIssue[];
  getAvailableTransitions(runtimeModel: WorkflowRuntimeModel, stateCode: string): Promise<WorkflowEdge[]>;
  resolve(
    runtimeModel: WorkflowRuntimeModel,
    stateCode: string,
    context?: WorkflowTransitionResolutionContext
  ): Promise<WorkflowTransitionResolutionResult>;
}
