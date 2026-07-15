import type {
  AssignmentPlan,
  ExecutionPlan,
  WorkflowExecutionContext,
  WorkflowMetadataSnapshot,
} from "../models/WorkflowModels";
import type { IRuntimeApplicationEngine } from "@/modules/platform/runtime/application/contracts/IRuntimeApplicationEngine";
import type { IExecutionDiagnosticsCollector } from "./IExecutionDiagnostics";
import type { IExecutionResult } from "./IExecutionResult";

export interface WorkflowExecutionOrchestrationRequest {
  snapshot: WorkflowMetadataSnapshot;
  transitionCode: string;
  context: WorkflowExecutionContext;
  assignmentPlan?: AssignmentPlan;
  executePlan?: boolean;
  runtimeApplicationEngine?: IRuntimeApplicationEngine;
  diagnosticsCollector?: IExecutionDiagnosticsCollector;
}

export interface IWorkflowExecutionOrchestrator {
  plan(request: WorkflowExecutionOrchestrationRequest): Promise<ExecutionPlan>;
  orchestrate(request: WorkflowExecutionOrchestrationRequest): Promise<IExecutionResult>;
}
