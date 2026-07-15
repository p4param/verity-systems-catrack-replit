import type { IRuntimeApplicationEngine } from "@/modules/platform/runtime/application/contracts/IRuntimeApplicationEngine";
import type { RuntimeContext } from "@/modules/platform/runtime/application/models/RuntimeContext";
import type { RuntimeTransaction } from "@/modules/platform/runtime/application/models/RuntimeTransaction";
import type {
  ActionPlan,
  AssignmentPlan,
  ExecutionMetadata,
  ExecutionPlan,
  PolicyPlan,
  WorkflowExecutionContext,
} from "../models/WorkflowModels";
import type { IExecutionObserver } from "./IExecutionDiagnostics";

export interface IExecutionContext {
  readonly workflowContext: WorkflowExecutionContext;
  readonly executionPlan: ExecutionPlan;
  readonly assignmentPlan?: AssignmentPlan;
  readonly actionPlan?: ActionPlan;
  readonly policyPlan?: PolicyPlan;
  readonly runtimeContext: RuntimeContext;
  readonly runtimeTransaction: RuntimeTransaction;
  runtimeApplicationEngine?: IRuntimeApplicationEngine;
  readonly executionRequested: boolean;
  readonly executionHash: string;
  readonly correlationId: string;
  readonly diagnostics: Record<string, unknown>;
  readonly executionMetadata: ExecutionMetadata;
  readonly observer?: IExecutionObserver;
  readonly metadata: Record<string, unknown>;
}
