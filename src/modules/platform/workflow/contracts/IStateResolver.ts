import type { WorkflowNode, WorkflowRuntimeModel, WorkflowValidationIssue } from "../models/WorkflowModels";

export interface IStateResolver {
  resolveInitialState(runtimeModel: WorkflowRuntimeModel): WorkflowNode | null;
  resolveState(runtimeModel: WorkflowRuntimeModel, stateCode: string): WorkflowNode | null;
  isTerminalState(runtimeModel: WorkflowRuntimeModel, stateCode: string): boolean;
  validateStates(runtimeModel: WorkflowRuntimeModel): WorkflowValidationIssue[];
}
