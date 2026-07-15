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
import type { IWorkflowExecutionOrchestrator } from "./IWorkflowExecutionOrchestrator";
import type { IExecutionPipeline } from "./IExecutionPipeline";
import type { IWorkflowExecutorRegistry } from "./IWorkflowExecutorRegistry";
import type { IExecutionDiagnosticsQueryFacade } from "./IExecutionDiagnostics";

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
  getExecutionOrchestrator(): IWorkflowExecutionOrchestrator;
  getExecutionPipeline(): IExecutionPipeline;
  getWorkflowExecutorRegistry(): IWorkflowExecutorRegistry;
  getExecutionDiagnosticsQueryFacade(): IExecutionDiagnosticsQueryFacade;
}
