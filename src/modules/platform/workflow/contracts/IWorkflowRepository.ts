import type {
  WorkflowDefinition,
  WorkflowManifest,
  WorkflowMetadataSnapshot,
  WorkflowValidationResult,
  WorkflowVersion,
  WorkflowVersionStatus,
} from "../models/WorkflowModels";

export interface IWorkflowRepository {
  saveDefinition(definition: WorkflowDefinition): Promise<void>;
  saveVersion(version: WorkflowVersion): Promise<void>;
  saveMetadataSnapshot(snapshot: WorkflowMetadataSnapshot): Promise<void>;
  getMetadataSnapshot(workflowVersionId: string): Promise<WorkflowMetadataSnapshot | null>;
  getDefinitionByEntity(entityId: string, tenantId: string): Promise<WorkflowDefinition | null>;
  listVersions(workflowDefinitionId: string): Promise<WorkflowVersion[]>;
  setVersionStatus(workflowVersionId: string, status: WorkflowVersionStatus, actorUserId: string): Promise<void>;
  saveManifest(manifest: WorkflowManifest): Promise<void>;
  getManifest(workflowVersionId: string): Promise<WorkflowManifest | null>;
  saveValidationReport(
    workflowVersionId: string,
    validation: WorkflowValidationResult,
    actorUserId: string
  ): Promise<void>;
  savePublishHistory(workflowVersionId: string, manifestId: string, actorUserId: string): Promise<void>;
}
