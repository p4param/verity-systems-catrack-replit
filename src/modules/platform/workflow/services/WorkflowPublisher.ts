import type { IWorkflowManifestGenerator } from "../contracts/IWorkflowManifestGenerator";
import type { IParticipantValidator } from "../contracts/IParticipantValidator";
import type { IWorkflowActionValidator } from "../contracts/IWorkflowActionValidator";
import type { IWorkflowPublisher } from "../contracts/IWorkflowPublisher";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type { IWorkflowValidator } from "../contracts/IWorkflowValidator";
import { WorkflowMetadataNormalizer } from "./WorkflowMetadataNormalizer";
import type { IWorkflowMetadataNormalizer } from "./WorkflowMetadataNormalizer";
import { WorkflowMetadataOptimizer } from "./WorkflowMetadataOptimizer";
import type { IWorkflowMetadataOptimizer } from "./WorkflowMetadataOptimizer";
import type {
  WorkflowMetadataSnapshot,
  WorkflowManifest,
  WorkflowPublishResult,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export class WorkflowPublisher implements IWorkflowPublisher {
  constructor(
    private readonly repository: IWorkflowRepository,
    private readonly validator: IWorkflowValidator,
    private readonly manifestGenerator: IWorkflowManifestGenerator,
    private readonly normalizer: IWorkflowMetadataNormalizer = new WorkflowMetadataNormalizer(),
    private readonly optimizer: IWorkflowMetadataOptimizer = new WorkflowMetadataOptimizer(),
    private readonly participantValidator: IParticipantValidator | null = null,
    private readonly actionValidator: IWorkflowActionValidator | null = null
  ) {}

  async publish(snapshot: WorkflowMetadataSnapshot, actorUserId: string): Promise<WorkflowPublishResult> {
    const normalizedSnapshot = await this.normalizer.normalize(snapshot);
    const optimizedSnapshot = await this.optimizer.optimize(normalizedSnapshot);
    const validation = await this.validator.validate(optimizedSnapshot);
    const participantIssues = this.participantValidator
      ? await this.participantValidator.validate(optimizedSnapshot)
      : [];
    const actionIssues = this.actionValidator
      ? await this.actionValidator.validateSnapshot(optimizedSnapshot)
      : [];
    for (const issue of participantIssues) {
      if (issue.severity === "Error") {
        validation.errors.push(issue);
        validation.isValid = false;
      } else {
        validation.warnings.push(issue);
      }
    }
    for (const issue of actionIssues) {
      if (issue.severity === "Error") {
        validation.errors.push(issue);
        validation.isValid = false;
      } else {
        validation.warnings.push(issue);
      }
    }

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

    const existingManifest = await this.repository.getManifest(optimizedSnapshot.version.id);
    const immutabilityIssue = this.validatePublishedVersionImmutability(optimizedSnapshot, existingManifest);

    if (immutabilityIssue) {
      validation.errors.push(immutabilityIssue);
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

    if (existingManifest && this.matchesPublishedSnapshot(optimizedSnapshot, existingManifest)) {
      return {
        success: true,
        workflowDefinitionId: existingManifest.workflowDefinitionId,
        workflowVersionId: existingManifest.workflowVersionId,
        manifestId: existingManifest.id,
        validation,
        messages: ["Workflow was already published with identical metadata."],
        publishedAt: existingManifest.generatedAt,
      };
    }

    const publishTimestamp = optimizedSnapshot.version.publishedAt ?? validation.validatedAt;

    const publishSnapshot: WorkflowMetadataSnapshot = {
      ...optimizedSnapshot,
      version: {
        ...optimizedSnapshot.version,
        status: "Published",
        publishedAt: publishTimestamp,
        publishedBy: actorUserId,
        updatedAt: publishTimestamp,
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

  private validatePublishedVersionImmutability(
    snapshot: WorkflowMetadataSnapshot,
    existingManifest: WorkflowManifest | null
  ): WorkflowValidationIssue | null {
    if (!existingManifest) {
      return null;
    }

    if (this.matchesPublishedSnapshot(snapshot, existingManifest)) {
      return null;
    }

    return {
      code: "WF_PUBLISHED_VERSION_IMMUTABLE",
      message: `Workflow version ${snapshot.version.id} is already published and cannot be republished with different metadata.`,
      severity: "Error",
      path: `version.${snapshot.version.id}`,
    };
  }

  private matchesPublishedSnapshot(
    snapshot: WorkflowMetadataSnapshot,
    existingManifest: WorkflowManifest
  ): boolean {
    if (!existingManifest.designerSnapshot) {
      return false;
    }

    return stableStringify(existingManifest.designerSnapshot) === stableStringify(snapshot);
  }
}
