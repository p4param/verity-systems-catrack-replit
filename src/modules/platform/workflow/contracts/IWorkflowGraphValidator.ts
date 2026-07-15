import type { WorkflowRuntimeGraph, WorkflowValidationIssue } from "../models/WorkflowModels";

export interface IWorkflowGraphValidator {
  validate(graph: WorkflowRuntimeGraph): WorkflowValidationIssue[];
}
