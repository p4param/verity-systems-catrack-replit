import type {
  AssignmentManifest,
  ParticipantManifest,
  ResolutionManifest,
  WorkflowMetadataSnapshot,
  WorkflowRuntimeModel,
} from "../models/WorkflowModels";

export interface IParticipantManifestGenerator {
  generateParticipantManifest(snapshot: WorkflowMetadataSnapshot): Promise<ParticipantManifest>;
  generateAssignmentManifest(snapshot: WorkflowMetadataSnapshot): Promise<AssignmentManifest>;
  generateResolutionManifest(
    snapshot: WorkflowMetadataSnapshot,
    runtimeModel: WorkflowRuntimeModel
  ): Promise<ResolutionManifest>;
}
