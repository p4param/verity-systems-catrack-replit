import type { WorkflowManifest } from "../models/WorkflowModels";

export interface IWorkflowMetadataProvider {
  getManifestForEntity(entityId: string, tenantId: string): Promise<WorkflowManifest | null>;
}
