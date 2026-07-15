import type { ITransitionEngine } from "../contracts/ITransitionEngine";
import type { WorkflowEdge, WorkflowRuntimeModel } from "../models/WorkflowModels";

export class TransitionEngine implements ITransitionEngine {
  async getAvailableTransitions(runtimeModel: WorkflowRuntimeModel, stateCode: string): Promise<WorkflowEdge[]> {
    return runtimeModel.graph.edges
      .filter((edge) => edge.from.toUpperCase() === stateCode.toUpperCase())
      .sort((a, b) => a.priority - b.priority);
  }
}
