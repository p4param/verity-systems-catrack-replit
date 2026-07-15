export const WORKFLOW_VERSION_STATUSES = [
  "Draft",
  "Published",
  "Archived",
  "Deprecated",
] as const;

export type WorkflowVersionStatus = (typeof WORKFLOW_VERSION_STATUSES)[number];

export const WORKFLOW_VARIABLE_DATA_TYPES = [
  "String",
  "Number",
  "Boolean",
  "Date",
  "JSON",
  "EntityReference",
  "UserReference",
] as const;

export type WorkflowVariableDataType = (typeof WORKFLOW_VARIABLE_DATA_TYPES)[number];

export const WORKFLOW_PARTICIPANT_TYPES = [
  "User",
  "Role",
  "Group",
  "Department",
  "BusinessUnit",
  "Manager",
  "Supervisor",
  "RecordOwner",
  "RecordCreator",
  "Requester",
  "ApproverChain",
  "Expression",
  "Lookup",
  "OrganizationHierarchy",
  "ExternalProvider",
  "CustomProvider",
] as const;

export type WorkflowParticipantType = (typeof WORKFLOW_PARTICIPANT_TYPES)[number];

export const WORKFLOW_ASSIGNMENT_STRATEGIES = [
  "SingleUser",
  "AllUsers",
  "AnyUser",
  "RoundRobin",
  "LeastLoaded",
  "Manager",
  "Hierarchy",
  "Expression",
  "Weighted",
  "Priority",
  "Random",
  "Custom",
] as const;

export type WorkflowAssignmentStrategy = (typeof WORKFLOW_ASSIGNMENT_STRATEGIES)[number];

export const WORKFLOW_ACTION_TYPES = [
  "StateChange",
  "CreateRecord",
  "UpdateRecord",
  "DeleteRecord",
  "CallAPI",
  "InvokePlatformService",
  "GenerateDocument",
  "GenerateReport",
  "RaiseEvent",
  "Notification",
  "Audit",
  "Log",
  "Wait",
  "Delay",
  "Timer",
  "Expression",
  "Script",
  "CustomAction",
] as const;

export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];

export const WORKFLOW_POLICY_TYPES = [
  "RetryPolicy",
  "CompensationPolicy",
  "TimeoutPolicy",
  "EscalationPolicy",
  "ConcurrencyPolicy",
  "TransactionPolicy",
  "FailurePolicy",
  "NotificationPolicy",
  "AuditPolicy",
  "SecurityPolicy",
  "CachingPolicy",
  "CustomPolicy",
] as const;

export type WorkflowPolicyType = (typeof WORKFLOW_POLICY_TYPES)[number];

export interface WorkflowAssignmentRuleSet {
  requiredParticipants?: boolean;
  optionalParticipants?: boolean;
  minimumApprovers?: number;
  maximumApprovers?: number;
  parallelParticipants?: boolean;
  sequentialParticipants?: boolean;
  exclusiveParticipants?: boolean;
  dynamicParticipants?: boolean;
  customRules?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  organizationId: string;
  moduleId: string;
  entityId: string;
  code: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  version: number;
}

export interface WorkflowVersion {
  id: string;
  workflowDefinitionId: string;
  versionNumber: number;
  status: WorkflowVersionStatus;
  isInitial: boolean;
  notes?: string;
  publishedAt?: Date;
  publishedBy?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}

export interface WorkflowState {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  description?: string;
  isInitial: boolean;
  isTerminal: boolean;
  sequence: number;
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowTransitionRetryPolicy {
  maxAttempts: number;
  backoffSeconds: number;
}

export interface WorkflowTransition {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  sourceStateCode: string;
  destinationStateCode: string;
  actionCode: string;
  conditionId?: string;
  priority: number;
  sequence: number;
  permissionCode?: string;
  visibilityExpressionId?: string;
  enabledExpressionId?: string;
  confirmationMessage?: string;
  successMessage?: string;
  failureMessage?: string;
  auditFlag: boolean;
  rollbackFlag: boolean;
  compensationActionCode?: string;
  retryPolicy?: WorkflowTransitionRetryPolicy;
  timeoutSeconds?: number;
  parallelMode?: "Parallel" | "Exclusive" | "Sequential";
  exclusiveGroupCode?: string;
  asyncExecution?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WorkflowCondition {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  expressionId: string;
  expectedResultType?: "Boolean" | "Number" | "String" | "JSON";
  sequence: number;
  isEnabled: boolean;
}

export interface WorkflowRule {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  expressionId: string;
  sequence: number;
  isEnabled: boolean;
}

export interface WorkflowAction {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  actionType: WorkflowActionType;
  providerKey?: string;
  payload?: Record<string, unknown>;
  dependsOnActionCodes?: string[];
  policyCodes?: string[];
  priority?: number;
  parallelMode?: "Parallel" | "Exclusive" | "Sequential";
  compensationActionCode?: string;
  retryPolicy?: WorkflowTransitionRetryPolicy;
  timeoutSeconds?: number;
  rollbackOnFailure?: boolean;
  sequence: number;
  isEnabled: boolean;
}

export interface WorkflowProcessPolicy {
  id: string;
  workflowVersionId: string;
  code: string;
  policyType: WorkflowPolicyType;
  scope: "Workflow" | "Transition" | "Action";
  transitionCode?: string;
  actionCode?: string;
  priority: number;
  isEnabled: boolean;
  configuration?: Record<string, unknown>;
}

export type WorkflowAssignmentType =
  | "User"
  | "Role"
  | "Group"
  | "Expression"
  | "Lookup"
  | "ExternalProvider";

export interface WorkflowAssignment {
  id: string;
  workflowVersionId: string;
  code: string;
  assignmentType: WorkflowAssignmentType;
  participantType?: WorkflowParticipantType;
  strategy?: WorkflowAssignmentStrategy;
  strategySeed?: string;
  strategyWeights?: Record<string, number>;
  priority?: number;
  escalationTargetId?: string;
  delegationMode?: "None" | "Allowed" | "Required";
  ruleSet?: WorkflowAssignmentRuleSet;
  targetId?: string;
  expressionId?: string;
  lookupKey?: string;
  sequence: number;
  isRequired: boolean;
}

export interface WorkflowApprover {
  id: string;
  workflowVersionId: string;
  assignmentId: string;
  sequence: number;
  minApprovals: number;
  maxApprovals?: number;
}

export interface WorkflowNotification {
  id: string;
  workflowVersionId: string;
  code: string;
  trigger: string;
  templateCode: string;
  recipientExpressionId?: string;
  isEnabled: boolean;
}

export interface WorkflowEscalation {
  id: string;
  workflowVersionId: string;
  code: string;
  triggerStateCode: string;
  escalationAfterMinutes: number;
  escalationActionCode?: string;
  notifyAssignmentId?: string;
  isEnabled: boolean;
}

export interface WorkflowSLA {
  id: string;
  workflowVersionId: string;
  code: string;
  targetMinutes: number;
  warningMinutes?: number;
  escalationId?: string;
  isEnabled: boolean;
}

export interface WorkflowBusinessObjectReference {
  entityType: string;
  entityId: string;
  recordNumber?: string;
}

export interface WorkflowHistory {
  id: string;
  workflowInstanceId: string;
  workflowVersionId: string;
  transitionCode?: string;
  fromStateCode?: string;
  toStateCode?: string;
  actionCode?: string;
  actorUserId: string;
  occurredAt: Date;
  payload?: Record<string, unknown>;
}

export interface WorkflowComment {
  id: string;
  workflowInstanceId: string;
  comment: string;
  createdAt: Date;
  createdBy: string;
}

export interface WorkflowAttachment {
  id: string;
  workflowInstanceId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  createdBy: string;
}

export interface WorkflowInstance {
  id: string;
  workflowDefinitionId: string;
  workflowVersionId: string;
  businessObject: WorkflowBusinessObjectReference;
  stateCode: string;
  startedAt: Date;
  startedBy: string;
  completedAt?: Date;
  completedBy?: string;
  isActive: boolean;
  variables: Record<string, unknown>;
}

export interface WorkflowVariable {
  id: string;
  workflowVersionId: string;
  code: string;
  dataType: WorkflowVariableDataType;
  defaultValue?: unknown;
  isRequired: boolean;
}

export interface WorkflowRole {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface WorkflowGroup {
  id: string;
  workflowVersionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface WorkflowPermission {
  id: string;
  workflowVersionId: string;
  code: string;
  description?: string;
}

export interface WorkflowExpression {
  id: string;
  workflowVersionId: string;
  code: string;
  expression: string;
  description?: string;
  language: "RuntimeExpression";
}

export interface WorkflowMetadataSnapshot {
  definition: WorkflowDefinition;
  version: WorkflowVersion;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  conditions: WorkflowCondition[];
  rules: WorkflowRule[];
  actions: WorkflowAction[];
  policies?: WorkflowProcessPolicy[];
  assignments: WorkflowAssignment[];
  approvers: WorkflowApprover[];
  notifications: WorkflowNotification[];
  escalations: WorkflowEscalation[];
  slas: WorkflowSLA[];
  variables: WorkflowVariable[];
  roles: WorkflowRole[];
  groups: WorkflowGroup[];
  permissions: WorkflowPermission[];
  expressions: WorkflowExpression[];
}
