import type {
  WorkflowMetadataSnapshot,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export interface IParticipantValidator {
  validate(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationIssue[]>;
}
