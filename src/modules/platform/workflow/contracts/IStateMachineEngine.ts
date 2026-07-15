import type { WorkflowMetadataSnapshot, WorkflowRuntimeModel } from "../models/WorkflowModels";

export interface IStateMachineEngine {
  buildRuntimeModel(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowRuntimeModel>;
}
