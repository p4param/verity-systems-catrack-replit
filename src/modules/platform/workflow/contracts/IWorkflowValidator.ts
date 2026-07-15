import type {
  WorkflowMetadataSnapshot,
  WorkflowValidationResult,
} from "../models/WorkflowModels";

export interface IWorkflowValidator {
  validate(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationResult>;
}
