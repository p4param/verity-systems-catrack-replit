import type { WorkflowEdge, WorkflowRuntimeModel } from "../models/WorkflowModels";

export interface ITransitionEngine {
  getAvailableTransitions(runtimeModel: WorkflowRuntimeModel, stateCode: string): Promise<WorkflowEdge[]>;
}
