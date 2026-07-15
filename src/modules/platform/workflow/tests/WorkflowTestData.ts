import { randomUUID } from "crypto";
import type { WorkflowMetadataSnapshot } from "../models/WorkflowModels";

export function buildWorkflowSnapshot(): WorkflowMetadataSnapshot {
  const definitionId = randomUUID();
  const versionId = randomUUID();
  const expressionId = randomUUID();
  const actionId = randomUUID();
  const assignmentId = randomUUID();

  return {
    definition: {
      id: definitionId,
      tenantId: randomUUID(),
      organizationId: randomUUID(),
      moduleId: "platform",
      entityId: "incident",
      code: "INCIDENT_WORKFLOW",
      name: "Incident Workflow",
      isEnabled: true,
      createdAt: new Date(),
      createdBy: randomUUID(),
      updatedAt: new Date(),
      updatedBy: randomUUID(),
      isDeleted: false,
      version: 1,
    },
    version: {
      id: versionId,
      workflowDefinitionId: definitionId,
      versionNumber: 1,
      status: "Draft",
      isInitial: true,
      createdAt: new Date(),
      createdBy: randomUUID(),
      updatedAt: new Date(),
      updatedBy: randomUUID(),
      version: 1,
    },
    states: [
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "DRAFT",
        name: "Draft",
        isInitial: true,
        isTerminal: false,
        sequence: 1,
      },
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "SUBMITTED",
        name: "Submitted",
        isInitial: false,
        isTerminal: true,
        sequence: 2,
      },
    ],
    transitions: [
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "SUBMIT",
        name: "Submit",
        sourceStateCode: "DRAFT",
        destinationStateCode: "SUBMITTED",
        actionCode: "SUBMIT_ACTION",
        priority: 1,
        sequence: 1,
        auditFlag: true,
        rollbackFlag: false,
      },
    ],
    conditions: [
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "DEFAULT_CONDITION",
        name: "Default Condition",
        expressionId,
        sequence: 1,
        isEnabled: true,
      },
    ],
    rules: [],
    actions: [
      {
        id: actionId,
        workflowVersionId: versionId,
        code: "SUBMIT_ACTION",
        name: "Submit Action",
        actionType: "StateChange",
        payload: {
          targetStateCode: "SUBMITTED",
        },
        sequence: 1,
        isEnabled: true,
      },
    ],
    policies: [],
    assignments: [
      {
        id: assignmentId,
        workflowVersionId: versionId,
        code: "PRIMARY_ASSIGNEE",
        assignmentType: "Role",
        targetId: "REVIEWER",
        sequence: 1,
        isRequired: true,
      },
    ],
    approvers: [],
    notifications: [],
    escalations: [],
    slas: [],
    variables: [
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "AMOUNT",
        dataType: "Number",
        isRequired: false,
      },
    ],
    roles: [
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "REVIEWER",
        name: "Reviewer",
      },
    ],
    groups: [],
    permissions: [
      {
        id: randomUUID(),
        workflowVersionId: versionId,
        code: "Incident.Edit",
      },
    ],
    expressions: [
      {
        id: expressionId,
        workflowVersionId: versionId,
        code: "DEFAULT_EXPRESSION",
        expression: "context.currentValues.amount > 0",
        language: "RuntimeExpression",
      },
    ],
  };
}

export function buildWorkflowSnapshotWithPolicyScopes(): WorkflowMetadataSnapshot {
  const snapshot = buildWorkflowSnapshot();
  const secondActionId = randomUUID();
  const secondTransitionId = randomUUID();

  snapshot.states = [
    ...snapshot.states,
    {
      id: randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "APPROVED",
      name: "Approved",
      isInitial: false,
      isTerminal: true,
      sequence: 3,
    },
  ];

  snapshot.actions = [
    ...snapshot.actions,
    {
      id: secondActionId,
      workflowVersionId: snapshot.version.id,
      code: "APPROVE_ACTION",
      name: "Approve Action",
      actionType: "StateChange",
      sequence: 2,
      isEnabled: true,
      payload: {
        targetStateCode: "APPROVED",
      },
      dependsOnActionCodes: ["SUBMIT_ACTION"],
    },
  ];

  snapshot.transitions = [
    ...snapshot.transitions,
    {
      id: secondTransitionId,
      workflowVersionId: snapshot.version.id,
      code: "APPROVE",
      name: "Approve",
      sourceStateCode: "SUBMITTED",
      destinationStateCode: "APPROVED",
      actionCode: "APPROVE_ACTION",
      priority: 2,
      sequence: 2,
      auditFlag: true,
      rollbackFlag: false,
    },
  ];

  snapshot.policies = [
    {
      id: randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "WF_RETRY",
      policyType: "RetryPolicy",
      scope: "Workflow",
      priority: 10,
      isEnabled: true,
      configuration: { maxAttempts: 3, backoffSeconds: 2 },
    },
    {
      id: randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "SUBMIT_TIMEOUT",
      policyType: "TimeoutPolicy",
      scope: "Transition",
      transitionCode: "SUBMIT",
      priority: 1,
      isEnabled: true,
      configuration: { timeoutSeconds: 120 },
    },
    {
      id: randomUUID(),
      workflowVersionId: snapshot.version.id,
      code: "APPROVE_AUDIT",
      policyType: "AuditPolicy",
      scope: "Action",
      actionCode: "APPROVE_ACTION",
      priority: 3,
      isEnabled: true,
      configuration: { auditCode: "APPROVE_AUDIT" },
    },
  ];

  return snapshot;
}
