import type {
  WorkflowExecutionContext,
  WorkflowMetadataSnapshot,
  WorkflowPublishResult,
  WorkflowSimulationResult,
  WorkflowValidationResult,
} from "../models/WorkflowModels";
import type { IStateMachineEngine } from "./IStateMachineEngine";
import type { ITransitionEngine } from "./ITransitionEngine";
import type { IParticipantResolutionEngine } from "./IParticipantResolutionEngine";
import type { IWorkflowActionEngine } from "./IWorkflowActionEngine";
import type { IWorkflowPolicyEngine } from "./IWorkflowPolicyEngine";
import type { IRuntimeEffectPlanner } from "./IRuntimeEffectPlanner";

export interface IWorkflowEngine {
  validateMetadata(snapshot: WorkflowMetadataSnapshot): Promise<WorkflowValidationResult>;
  publish(snapshot: WorkflowMetadataSnapshot, actorUserId: string): Promise<WorkflowPublishResult>;
  simulate(context: WorkflowExecutionContext): Promise<WorkflowSimulationResult>;
  getStateMachineEngine(): IStateMachineEngine;
  getTransitionEngine(): ITransitionEngine;
  getParticipantResolutionEngine(): IParticipantResolutionEngine;
  getActionEngine(): IWorkflowActionEngine;
  getPolicyEngine(): IWorkflowPolicyEngine;
  getRuntimeEffectPlanner(): IRuntimeEffectPlanner;
}
