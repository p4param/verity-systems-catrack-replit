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
        actionType: "WorkflowTransition",
        sequence: 1,
        isEnabled: true,
      },
    ],
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
