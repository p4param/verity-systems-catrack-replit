import type {
  WorkflowMetadataSnapshot,
  WorkflowPublishResult,
} from "../models/WorkflowModels";

export interface IWorkflowPublisher {
  publish(snapshot: WorkflowMetadataSnapshot, actorUserId: string): Promise<WorkflowPublishResult>;
}
