import { randomUUID } from "crypto";
import type { IWorkflowVersionManager } from "../contracts/IWorkflowVersionManager";
import type { WorkflowVersion, WorkflowVersionStatus } from "../models/WorkflowModels";

const ALLOWED_STATUS_TRANSITIONS: Record<WorkflowVersionStatus, WorkflowVersionStatus[]> = {
  Draft: ["Published", "Deprecated", "Archived"],
  Published: ["Deprecated", "Archived"],
  Deprecated: ["Archived"],
  Archived: [],
};

export class WorkflowVersionManager implements IWorkflowVersionManager {
  async createNextVersion(currentVersions: WorkflowVersion[], actorUserId: string): Promise<WorkflowVersion> {
    const maxVersion = currentVersions.reduce((max, item) => Math.max(max, item.versionNumber), 0);
    const now = new Date();
    const definitionId = currentVersions[0]?.workflowDefinitionId;

    if (!definitionId) {
      throw new Error("Cannot create next version without existing workflow definition context.");
    }

    return {
      id: randomUUID(),
      workflowDefinitionId: definitionId,
      versionNumber: maxVersion + 1,
      status: "Draft",
      isInitial: false,
      createdAt: now,
      createdBy: actorUserId,
      updatedAt: now,
      updatedBy: actorUserId,
      version: 1,
    };
  }

  async validateStatusChange(current: WorkflowVersion, nextStatus: WorkflowVersionStatus): Promise<void> {
    const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(nextStatus) && current.status !== nextStatus) {
      throw new Error(`Workflow version status transition ${current.status} -> ${nextStatus} is not allowed.`);
    }
  }
}
