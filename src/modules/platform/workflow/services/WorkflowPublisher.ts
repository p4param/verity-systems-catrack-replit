import type { IWorkflowManifestGenerator } from "../contracts/IWorkflowManifestGenerator";
import type { IWorkflowPublisher } from "../contracts/IWorkflowPublisher";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import { WorkflowMetadataNormalizer } from "./WorkflowMetadataNormalizer";
import type { IWorkflowMetadataNormalizer } from "./WorkflowMetadataNormalizer";
import { WorkflowMetadataOptimizer } from "./WorkflowMetadataOptimizer";
import type { IWorkflowMetadataOptimizer } from "./WorkflowMetadataOptimizer";
import type {
  WorkflowMetadataSnapshot,
  WorkflowPublishResult,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

export class WorkflowPublisher implements IWorkflowPublisher {
  constructor(
    private readonly repository: IWorkflowRepository,
    private readonly validator: IWorkflowValidator,
    private readonly manifestGenerator: IWorkflowManifestGenerator,
    private readonly normalizer: IWorkflowMetadataNormalizer = new WorkflowMetadataNormalizer(),
    private readonly optimizer: IWorkflowMetadataOptimizer = new WorkflowMetadataOptimizer()
  ) {}

  async publish(snapshot: WorkflowMetadataSnapshot, actorUserId: string): Promise<WorkflowPublishResult> {
    const normalizedSnapshot = await this.normalizer.normalize(snapshot);
    const optimizedSnapshot = await this.optimizer.optimize(normalizedSnapshot);
    const validation = await this.validator.validate(optimizedSnapshot);

    const duplicateVersionIssue = await this.validateDuplicateVersion(optimizedSnapshot);
    const statusIssue = this.validatePublishableStatus(optimizedSnapshot);

    if (duplicateVersionIssue) {
      validation.errors.push(duplicateVersionIssue);
      validation.isValid = false;
    }
    if (statusIssue) {
      validation.errors.push(statusIssue);
      validation.isValid = false;
    }

    await this.repository.saveValidationReport(optimizedSnapshot.version.id, validation, actorUserId);

    if (!validation.isValid) {
      return {
        success: false,
        workflowDefinitionId: optimizedSnapshot.definition.id,
        workflowVersionId: optimizedSnapshot.version.id,
        validation,
        messages: ["Workflow publish failed due to validation errors."],
        publishedAt: new Date(),
      };
    }

    const publishSnapshot: WorkflowMetadataSnapshot = {
      ...optimizedSnapshot,
      version: {
        ...optimizedSnapshot.version,
        status: "Published",
        publishedAt: new Date(),
        publishedBy: actorUserId,
        updatedAt: new Date(),
        updatedBy: actorUserId,
      },
    };

    await this.repository.saveDefinition(publishSnapshot.definition);
    await this.repository.saveVersion(publishSnapshot.version);
    await this.repository.saveMetadataSnapshot(publishSnapshot);

    const manifest = await this.manifestGenerator.generate(publishSnapshot, validation, actorUserId);

    await this.repository.saveManifest(manifest);
    await this.repository.savePublishHistory(publishSnapshot.version.id, manifest.id, actorUserId);

    return {
      success: true,
      workflowDefinitionId: publishSnapshot.definition.id,
      workflowVersionId: publishSnapshot.version.id,
      manifestId: manifest.id,
      validation,
      messages: ["Workflow published successfully."],
      publishedAt: manifest.generatedAt,
    };
  }

  private async validateDuplicateVersion(
    snapshot: WorkflowMetadataSnapshot
  ): Promise<WorkflowValidationIssue | null> {
    const versions = await this.repository.listVersions(snapshot.definition.id);
    const duplicate = versions.find(
      (item) => item.id !== snapshot.version.id && item.versionNumber === snapshot.version.versionNumber
    );

    if (!duplicate) {
      return null;
    }

    return {
      code: "WF_DUPLICATE_VERSION",
      message: `Version number ${snapshot.version.versionNumber} already exists for this workflow definition.`,
      severity: "Error",
      path: `version.${snapshot.version.id}`,
    };
  }

  private validatePublishableStatus(snapshot: WorkflowMetadataSnapshot): WorkflowValidationIssue | null {
    if (snapshot.version.status !== "Draft") {
      return {
        code: "WF_INVALID_PUBLISH_STATUS",
        message: `Only Draft versions can be published. Current status: ${snapshot.version.status}.`,
        severity: "Error",
        path: `version.${snapshot.version.id}`,
      };
    }

    return null;
  }
}
