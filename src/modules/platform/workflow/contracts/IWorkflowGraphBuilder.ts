import type { WorkflowMetadataSnapshot, WorkflowRuntimeGraph } from "../models/WorkflowModels";

export interface IWorkflowGraphBuilder {
  build(snapshot: WorkflowMetadataSnapshot): WorkflowRuntimeGraph;
}
