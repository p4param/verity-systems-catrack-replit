import type { RuntimeContext } from "@/modules/platform/runtime/application";
import type {
  WorkflowAssignment,
  WorkflowMetadataSnapshot,
  WorkflowTransition,
} from "./DesignerModels";

export interface WorkflowValidationIssue {
  code: string;
  message: string;
  severity: "Error" | "Warning";
  path?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowValidationIssue[];
  warnings: WorkflowValidationIssue[];
  validatedAt: Date;
}

export interface WorkflowConditionEvaluationResult {
  conditionCode: string;
  expressionId: string;
  matched: boolean;
  diagnostics?: Record<string, unknown>;
}

export interface WorkflowNode {
  code: string;
  name: string;
  isInitial: boolean;
  isTerminal: boolean;
  sequence: number;
}

export interface WorkflowEdge {
  code: string;
  from: string;
  to: string;
  actionCode: string;
  priority: number;
  conditionId?: string;
  permissionCode?: string;
  rollbackFlag: boolean;
  compensationActionCode?: string;
  retryPolicy?: WorkflowTransition["retryPolicy"];
  timeoutSeconds?: number;
  parallelMode?: WorkflowTransition["parallelMode"];
  exclusiveGroupCode?: string;
  asyncExecution?: boolean;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowStateGraph {
  states: WorkflowNode[];
  outgoingByState: Record<string, string[]>;
  incomingByState: Record<string, string[]>;
}

export interface WorkflowTransitionGraph {
  transitions: WorkflowEdge[];
  transitionsBySourceState: Record<string, WorkflowEdge[]>;
}

export interface WorkflowRuntimeGraph {
  workflowGraph: WorkflowGraph;
  stateGraph: WorkflowStateGraph;
  transitionGraph: WorkflowTransitionGraph;
}

export interface WorkflowTransitionResolutionContext {
  conditionOutcomes?: Record<string, boolean>;
  grantedPermissions?: string[];
}

export interface WorkflowTransitionCandidate {
  transition: WorkflowEdge;
  allowed: boolean;
  reasons: string[];
  requiredConditions: string[];
  requiredPermissions: string[];
}

export interface WorkflowTransitionResolutionResult {
  canMove: boolean;
  currentStateCode: string;
  availableTransitions: WorkflowTransitionCandidate[];
  selectedTransition?: WorkflowEdge;
  nextStateCode?: string;
}

export interface WorkflowRuntimeModel {
  workflowDefinitionId: string;
  workflowVersionId: string;
  initialStateCode?: string;
  graph: WorkflowGraph;
  runtimeGraph: WorkflowRuntimeGraph;
  assignments: WorkflowAssignment[];
  variables: Array<{
    code: string;
    dataType: string;
    required: boolean;
    defaultValue?: unknown;
  }>;
}

export interface WorkflowManifest {
  id: string;
  workflowDefinitionId: string;
  workflowVersionId: string;
  generatedAt: Date;
  generatedBy: string;
  runtimeModel: WorkflowRuntimeModel;
  validation: WorkflowValidationResult;
  designerSnapshot?: WorkflowMetadataSnapshot;
}

export interface WorkflowPublishResult {
  success: boolean;
  workflowDefinitionId: string;
  workflowVersionId: string;
  manifestId?: string;
  validation: WorkflowValidationResult;
  messages: string[];
  publishedAt: Date;
}

export interface WorkflowSimulationResult {
  success: boolean;
  workflowVersionId: string;
  visitedStates: string[];
  visitedTransitions: string[];
  diagnostics: Record<string, unknown>;
}

export interface WorkflowExecutionContext {
  runtimeContext: RuntimeContext;
  workflowDefinitionId?: string;
  workflowVersionId?: string;
  workflowState?: string;
  workflowInstanceId?: string;
  workflowVariables: Record<string, unknown>;
  workflowAssignments: WorkflowAssignment[];
}
