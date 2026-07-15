import type { IWorkflowMetadataProvider } from "../contracts/IWorkflowMetadataProvider";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type { WorkflowManifest } from "../models/WorkflowModels";

export class WorkflowMetadataProvider implements IWorkflowMetadataProvider {
  constructor(private readonly repository: IWorkflowRepository) {}

  async getManifestForEntity(entityId: string, tenantId: string): Promise<WorkflowManifest | null> {
    const definition = await this.repository.getDefinitionByEntity(entityId, tenantId);
    if (!definition) {
      return null;
    }

    const versions = await this.repository.listVersions(definition.id);
    const published = versions
      .filter((item) => item.status === "Published")
      .sort((a, b) => b.versionNumber - a.versionNumber)[0];

    if (!published) {
      return null;
    }

    return this.repository.getManifest(published.id);
  }
}
