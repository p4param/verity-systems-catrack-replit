import type { WorkflowVersion, WorkflowVersionStatus } from "../models/WorkflowModels";

export interface IWorkflowVersionManager {
  createNextVersion(currentVersions: WorkflowVersion[], actorUserId: string): Promise<WorkflowVersion>;
  validateStatusChange(current: WorkflowVersion, nextStatus: WorkflowVersionStatus): Promise<void>;
}
