import type { RuntimeContext } from "@/modules/platform/runtime/application";
import type {
  WorkflowAssignment,
  WorkflowAssignmentRuleSet,
  WorkflowAssignmentStrategy,
  WorkflowAction,
  WorkflowMetadataSnapshot,
  WorkflowPolicyType,
  WorkflowParticipantType,
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

export interface WorkflowActionResolutionContext {
  snapshot: WorkflowMetadataSnapshot;
  transition: WorkflowTransition;
  assignmentPlan?: AssignmentPlan;
  runtimeContext: RuntimeContext;
}

export interface WorkflowPolicyResolutionContext {
  snapshot: WorkflowMetadataSnapshot;
  transition: WorkflowTransition;
  actionPlan: ActionPlan;
}

export interface RuntimeEffectPolicyMetadata {
  retryPolicy?: {
    maxAttempts: number;
    backoffSeconds: number;
  };
  timeoutSeconds?: number;
  compensationActionCode?: string;
  rollbackOnFailure?: boolean;
}

export interface ResolvedWorkflowAction {
  actionId: string;
  actionCode: string;
  actionType: WorkflowAction["actionType"];
  providerKey: string;
  sequence: number;
  priority: number;
  dependencies: string[];
  parallelMode?: "Parallel" | "Exclusive" | "Sequential";
  payload: Record<string, unknown>;
  policyMetadata?: RuntimeEffectPolicyMetadata;
}

export interface ResolvedWorkflowPolicy {
  policyId: string;
  policyCode: string;
  policyType: WorkflowPolicyType;
  providerKey: string;
  scope: "Workflow" | "Transition" | "Action";
  transitionCode?: string;
  actionCode?: string;
  priority: number;
  configuration: Record<string, unknown>;
}

export interface ActionPlan {
  workflowVersionId: string;
  transitionCode: string;
  generatedAt: Date;
  actions: ResolvedWorkflowAction[];
  diagnostics: Record<string, unknown>;
}

export interface PolicyPlan {
  workflowVersionId: string;
  transitionCode: string;
  generatedAt: Date;
  policies: ResolvedWorkflowPolicy[];
  diagnostics: Record<string, unknown>;
}

export interface RuntimeEffect {
  effectCode: string;
  effectType: string;
  actionCode: string;
  dependencies: string[];
  priority: number;
  parallelizable: boolean;
  policyMetadata: RuntimeEffectPolicyMetadata;
  metadata?: Record<string, unknown>;
}

export interface RuntimeEffectSet {
  workflowVersionId: string;
  transitionCode: string;
  generatedAt: Date;
  effects: RuntimeEffect[];
}

export interface EffectGraphEdge {
  from: string;
  to: string;
  reason: string;
}

export interface EffectGraph {
  nodes: string[];
  edges: EffectGraphEdge[];
}

export interface EffectDependencyGraph {
  actionGraph: EffectGraph;
  policyGraph: EffectGraph;
  runtimeEffectGraph: EffectGraph;
  executionGraph: EffectGraph;
}

export interface EffectResolutionResult {
  effectSet: RuntimeEffectSet;
  dependencyGraph: EffectDependencyGraph;
  orderedEffectCodes: string[];
  parallelBatches: string[][];
}

export interface ExecutionDiagnostics {
  warnings: string[];
  errors: string[];
  providerDiagnostics: Record<string, unknown>;
  policyDiagnostics: Record<string, unknown>;
}

export interface ExecutionMetadata {
  deterministicHash: string;
  retryMetadata: Record<string, RuntimeEffectPolicyMetadata["retryPolicy"]>;
  timeoutMetadata: Record<string, number | undefined>;
  compensationMetadata: Record<string, string | undefined>;
  rollbackMetadata: Record<string, boolean | undefined>;
}

export interface ExecutionPlan {
  id: string;
  workflowVersionId: string;
  transitionCode: string;
  generatedAt: Date;
  actionPlan: ActionPlan;
  policyPlan: PolicyPlan;
  runtimeEffectSet: RuntimeEffectSet;
  dependencyGraph: EffectDependencyGraph;
  orderedEffectCodes: string[];
  parallelBatches: string[][];
  diagnostics: ExecutionDiagnostics;
  metadata: ExecutionMetadata;
}

export interface ResolvedParticipant {
  participantId: string;
  participantType: WorkflowParticipantType;
  source: string;
  displayName?: string;
  attributes?: Record<string, unknown>;
  priority?: number;
}

export interface ParticipantSet {
  assignmentId: string;
  participants: ResolvedParticipant[];
  requiredParticipants: ResolvedParticipant[];
  optionalParticipants: ResolvedParticipant[];
}

export interface AssignmentMetadata {
  assignmentId: string;
  strategy: WorkflowAssignmentStrategy;
  priority: number;
  escalation?: {
    targetParticipantId?: string;
    mode?: string;
  };
  delegation?: {
    mode: "None" | "Allowed" | "Required";
    delegateParticipantIds?: string[];
  };
  sla?: {
    code?: string;
    targetMinutes?: number;
    warningMinutes?: number;
  };
  rules?: WorkflowAssignmentRuleSet;
}

export interface AssignmentPlan {
  id: string;
  assignmentId: string;
  participantSet: ParticipantSet;
  strategy: WorkflowAssignmentStrategy;
  priority: number;
  escalationMetadata?: AssignmentMetadata["escalation"];
  delegationMetadata?: AssignmentMetadata["delegation"];
  slaMetadata?: AssignmentMetadata["sla"];
  generatedAt: Date;
  version: number;
}

export interface ParticipantEligibilityResult {
  assignmentId: string;
  eligibleParticipants: ResolvedParticipant[];
  ineligibleParticipants: Array<{
    participant: ResolvedParticipant;
    reason: string;
  }>;
}

export interface AssignmentStrategyResult {
  assignmentId: string;
  strategy: WorkflowAssignmentStrategy;
  rankedParticipants: ResolvedParticipant[];
  selectedParticipants: ResolvedParticipant[];
  strategySeed?: string;
  diagnostics: Record<string, unknown>;
}

export interface AssignmentContext {
  workflowDefinitionId: string;
  workflowVersionId: string;
  assignment: WorkflowAssignment;
  runtimeContext: RuntimeContext;
  businessObject: Record<string, unknown>;
  transition?: WorkflowEdge;
  variables?: Record<string, unknown>;
}

export interface ParticipantResolutionResult {
  assignmentId: string;
  participantSet: ParticipantSet;
  eligibility: ParticipantEligibilityResult;
  strategyResult: AssignmentStrategyResult;
  diagnostics: Record<string, unknown>;
}

export interface ParticipantManifest {
  workflowVersionId: string;
  generatedAt: Date;
  providerMap: Record<string, string>;
  supportedParticipantTypes: WorkflowParticipantType[];
}

export interface AssignmentManifest {
  workflowVersionId: string;
  generatedAt: Date;
  strategies: Array<{
    assignmentId: string;
    strategy: WorkflowAssignmentStrategy;
    priority: number;
    strategySeed?: string;
    strategyWeights?: Record<string, number>;
    ruleSet?: WorkflowAssignmentRuleSet;
  }>;
}

export interface ActionManifest {
  workflowVersionId: string;
  generatedAt: Date;
  transitions: Array<{
    transitionCode: string;
    actions: Array<{
      actionCode: string;
      actionType: WorkflowAction["actionType"];
      providerKey: string;
      sequence: number;
      priority: number;
      dependencies: string[];
      parallelMode?: "Parallel" | "Exclusive" | "Sequential";
    }>;
  }>;
}

export interface PolicyManifest {
  workflowVersionId: string;
  generatedAt: Date;
  transitions: Array<{
    transitionCode: string;
    policies: Array<{
      policyCode: string;
      policyType: WorkflowPolicyType;
      providerKey: string;
      scope: "Workflow" | "Transition" | "Action";
      actionCode?: string;
      priority: number;
    }>;
  }>;
}

export interface RuntimeEffectManifest {
  workflowVersionId: string;
  generatedAt: Date;
  transitions: Array<{
    transitionCode: string;
    effects: Array<{
      effectCode: string;
      effectType: string;
      actionCode: string;
      dependencies: string[];
      priority: number;
      parallelizable: boolean;
    }>;
  }>;
}

export interface ExecutionManifest {
  workflowVersionId: string;
  generatedAt: Date;
  transitions: Array<{
    transitionCode: string;
    orderedEffectCodes: string[];
    parallelBatches: string[][];
    dependencyCounts: {
      actionEdges: number;
      policyEdges: number;
      runtimeEffectEdges: number;
      executionEdges: number;
    };
  }>;
}

export interface ResolutionManifest {
  workflowVersionId: string;
  generatedAt: Date;
  assignments: Array<{
    assignmentId: string;
    participantType: WorkflowParticipantType;
    strategy: WorkflowAssignmentStrategy;
    providerKey: string;
  }>;
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
  participantManifest: ParticipantManifest;
  assignmentManifest: AssignmentManifest;
  resolutionManifest: ResolutionManifest;
  actionManifest: ActionManifest;
  policyManifest: PolicyManifest;
  runtimeEffectManifest: RuntimeEffectManifest;
  executionManifest: ExecutionManifest;
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
  resolvedParticipants?: ResolvedParticipant[];
  assignmentPlan?: AssignmentPlan;
  actionPlan?: ActionPlan;
  policyPlan?: PolicyPlan;
  executionPlan?: ExecutionPlan;
  participantMetadata?: AssignmentMetadata[];
  eligibilityResults?: ParticipantEligibilityResult[];
  resolutionDiagnostics?: Record<string, unknown>;
}
