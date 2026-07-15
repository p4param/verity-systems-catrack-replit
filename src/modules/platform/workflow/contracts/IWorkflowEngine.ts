import type {
  WorkflowExecutionContext,
  WorkflowMetadataSnapshot,
  WorkflowPublishResult,
  WorkflowSimulationResult,
  WorkflowValidationResult,
} from "../models/WorkflowModels";
import type { IStateMachineEngine } from "./IStateMachineEngine";
import type { ITransitionEngine } from "./ITransitionEngine";

export interface IWorkflowEngine {
  validateMetadata(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationResult>;
  publish(snapshot: WorkflowMetadataSnapshot, actorUserId: string): Promise<WorkflowPublishResult>;
  simulate(context: WorkflowExecutionContext): Promise<WorkflowSimulationResult>;
  getStateMachineEngine(): IStateMachineEngine;
  getTransitionEngine(): ITransitionEngine;
}
