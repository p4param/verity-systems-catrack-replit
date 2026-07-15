import type {
  WorkflowMetadataSnapshot,
  WorkflowNode,
  WorkflowRuntimeGraph,
  WorkflowRuntimeModel,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export interface IStateMachineEngine {
  registerStates(states: WorkflowNode[]): readonly WorkflowNode[];
  resolveInitialState(runtimeModel: WorkflowRuntimeModel): WorkflowNode | null;
  isTerminalState(runtimeModel: WorkflowRuntimeModel, stateCode: string): boolean;
  validateStateGraph(graph: WorkflowRuntimeGraph): WorkflowValidationIssue[];
  generateGraph(snapshot: WorkflowMetadataSnapshot): WorkflowRuntimeGraph;
  buildRuntimeModel(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowRuntimeModel>;
}
