import type {
  WorkflowManifest,
  WorkflowMetadataSnapshot,
  WorkflowValidationResult,
} from "../models/WorkflowModels";

export interface IWorkflowManifestGenerator {
  generate(
    snapshot: WorkflowMetadataSnapshot,
    validation: WorkflowValidationResult,
    actorUserId: string
  ): Promise<WorkflowManifest>;
}
