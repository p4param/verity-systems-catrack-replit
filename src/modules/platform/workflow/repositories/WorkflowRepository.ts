import { prisma } from "@/lib/prisma";
import type { IWorkflowRepository } from "../contracts/IWorkflowRepository";
import type {
  WorkflowDefinition,
  WorkflowExpression,
  WorkflowManifest,
  WorkflowMetadataSnapshot,
  WorkflowValidationResult,
  WorkflowVersion,
  WorkflowVersionStatus,
} from "../models/WorkflowModels";

function serialize(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "object") {
    return value as T;
  }

  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return fallback;
}

export class WorkflowRepository implements IWorkflowRepository {
  async saveDefinition(definition: WorkflowDefinition): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO workflow_definitions (
        id, tenant_id, organization_id, module_id, entity_id, code, name, description,
        is_enabled, created_at, created_by, updated_at, updated_by,
        is_deleted, deleted_at, deleted_by, version
      ) VALUES (
        ${definition.id}, ${definition.tenantId}, ${definition.organizationId}, ${definition.moduleId},
        ${definition.entityId}, ${definition.code}, ${definition.name}, ${definition.description ?? null},
        ${definition.isEnabled}, ${definition.createdAt}, ${definition.createdBy}, ${definition.updatedAt}, ${definition.updatedBy},
        ${definition.isDeleted}, ${definition.deletedAt ?? null}, ${definition.deletedBy ?? null}, ${BigInt(definition.version)}
      )
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        module_id = EXCLUDED.module_id,
        entity_id = EXCLUDED.entity_id,
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        is_deleted = EXCLUDED.is_deleted,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by,
        version = EXCLUDED.version
    `;
  }

  async saveVersion(version: WorkflowVersion): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO workflow_versions (
        id, workflow_definition_id, version_number, status, is_initial,
        notes, published_at, published_by, created_at, created_by,
        updated_at, updated_by, version
      ) VALUES (
        ${version.id}, ${version.workflowDefinitionId}, ${version.versionNumber}, ${version.status}, ${version.isInitial},
        ${version.notes ?? null}, ${version.publishedAt ?? null}, ${version.publishedBy ?? null}, ${version.createdAt}, ${version.createdBy},
        ${version.updatedAt}, ${version.updatedBy}, ${BigInt(version.version)}
      )
      ON CONFLICT (id) DO UPDATE SET
        version_number = EXCLUDED.version_number,
        status = EXCLUDED.status,
        is_initial = EXCLUDED.is_initial,
        notes = EXCLUDED.notes,
        published_at = EXCLUDED.published_at,
        published_by = EXCLUDED.published_by,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        version = EXCLUDED.version
    `;
  }

  async saveMetadataSnapshot(snapshot: WorkflowMetadataSnapshot): Promise<void> {
    await this.saveDefinition(snapshot.definition);
    await this.saveVersion(snapshot.version);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM workflow_states WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const state of snapshot.states) {
        await tx.$executeRaw`
          INSERT INTO workflow_states (
            id, workflow_version_id, code, name, description, is_initial,
            is_terminal, sequence, color, icon, metadata_json
          ) VALUES (
            ${state.id}, ${state.workflowVersionId}, ${state.code}, ${state.name}, ${state.description ?? null}, ${state.isInitial},
            ${state.isTerminal}, ${state.sequence}, ${state.color ?? null}, ${state.icon ?? null}, ${serialize(state.metadata)}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_transitions WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const transition of snapshot.transitions) {
        await tx.$executeRaw`
          INSERT INTO workflow_transitions (
            id, workflow_version_id, code, name, source_state_code, destination_state_code,
            action_code, condition_id, priority, sequence, permission_code,
            visibility_expression_id, enabled_expression_id,
            confirmation_message, success_message, failure_message,
            audit_flag, rollback_flag, compensation_action_code, retry_policy_json,
            timeout_seconds, parallel_mode, exclusive_group_code, async_execution, metadata_json
          ) VALUES (
            ${transition.id}, ${transition.workflowVersionId}, ${transition.code}, ${transition.name},
            ${transition.sourceStateCode}, ${transition.destinationStateCode},
            ${transition.actionCode}, ${transition.conditionId ?? null}, ${transition.priority}, ${transition.sequence},
            ${transition.permissionCode ?? null}, ${transition.visibilityExpressionId ?? null}, ${transition.enabledExpressionId ?? null},
            ${transition.confirmationMessage ?? null}, ${transition.successMessage ?? null}, ${transition.failureMessage ?? null},
            ${transition.auditFlag}, ${transition.rollbackFlag}, ${transition.compensationActionCode ?? null},
            ${serialize(transition.retryPolicy)}, ${transition.timeoutSeconds ?? null}, ${transition.parallelMode ?? null},
            ${transition.exclusiveGroupCode ?? null}, ${transition.asyncExecution ?? false}, ${serialize(transition.metadata)}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_conditions WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const condition of snapshot.conditions) {
        await tx.$executeRaw`
          INSERT INTO workflow_conditions (
            id, workflow_version_id, code, name, expression_id, expected_result_type, sequence, is_enabled
          ) VALUES (
            ${condition.id}, ${condition.workflowVersionId}, ${condition.code}, ${condition.name},
            ${condition.expressionId}, ${condition.expectedResultType ?? null}, ${condition.sequence}, ${condition.isEnabled}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_rules WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const rule of snapshot.rules) {
        await tx.$executeRaw`
          INSERT INTO workflow_rules (
            id, workflow_version_id, code, name, expression_id, sequence, is_enabled
          ) VALUES (
            ${rule.id}, ${rule.workflowVersionId}, ${rule.code}, ${rule.name},
            ${rule.expressionId}, ${rule.sequence}, ${rule.isEnabled}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_actions WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const action of snapshot.actions) {
        await tx.$executeRaw`
          INSERT INTO workflow_actions (
            id, workflow_version_id, code, name, action_type, payload_json, sequence, is_enabled
          ) VALUES (
            ${action.id}, ${action.workflowVersionId}, ${action.code}, ${action.name},
            ${action.actionType}, ${serialize(action.payload)}, ${action.sequence}, ${action.isEnabled}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_assignments WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const assignment of snapshot.assignments) {
        await tx.$executeRaw`
          INSERT INTO workflow_assignments (
            id, workflow_version_id, code, assignment_type, target_id, expression_id,
            lookup_key, sequence, is_required
          ) VALUES (
            ${assignment.id}, ${assignment.workflowVersionId}, ${assignment.code}, ${assignment.assignmentType},
            ${assignment.targetId ?? null}, ${assignment.expressionId ?? null}, ${assignment.lookupKey ?? null},
            ${assignment.sequence}, ${assignment.isRequired}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_roles WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const role of snapshot.roles) {
        await tx.$executeRaw`
          INSERT INTO workflow_roles (id, workflow_version_id, code, name, description)
          VALUES (${role.id}, ${role.workflowVersionId}, ${role.code}, ${role.name}, ${role.description ?? null})
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_groups WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const group of snapshot.groups) {
        await tx.$executeRaw`
          INSERT INTO workflow_groups (id, workflow_version_id, code, name, description)
          VALUES (${group.id}, ${group.workflowVersionId}, ${group.code}, ${group.name}, ${group.description ?? null})
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_permissions WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const permission of snapshot.permissions) {
        await tx.$executeRaw`
          INSERT INTO workflow_permissions (id, workflow_version_id, code, description)
          VALUES (${permission.id}, ${permission.workflowVersionId}, ${permission.code}, ${permission.description ?? null})
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_variables WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const variable of snapshot.variables) {
        await tx.$executeRaw`
          INSERT INTO workflow_variables (
            id, workflow_version_id, code, data_type, default_value_json, is_required
          ) VALUES (
            ${variable.id}, ${variable.workflowVersionId}, ${variable.code}, ${variable.dataType},
            ${serialize(variable.defaultValue)}, ${variable.isRequired}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_expressions WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const expression of snapshot.expressions as WorkflowExpression[]) {
        await tx.$executeRaw`
          INSERT INTO workflow_expressions (
            id, workflow_version_id, code, expression, description, language
          ) VALUES (
            ${expression.id}, ${expression.workflowVersionId}, ${expression.code}, ${expression.expression},
            ${expression.description ?? null}, ${expression.language}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_notifications WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const notification of snapshot.notifications) {
        await tx.$executeRaw`
          INSERT INTO workflow_notifications (
            id, workflow_version_id, code, trigger_code, template_code,
            recipient_expression_id, is_enabled
          ) VALUES (
            ${notification.id}, ${notification.workflowVersionId}, ${notification.code},
            ${notification.trigger}, ${notification.templateCode}, ${notification.recipientExpressionId ?? null},
            ${notification.isEnabled}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_escalations WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const escalation of snapshot.escalations) {
        await tx.$executeRaw`
          INSERT INTO workflow_escalations (
            id, workflow_version_id, code, trigger_state_code, escalation_after_minutes,
            escalation_action_code, notify_assignment_id, is_enabled
          ) VALUES (
            ${escalation.id}, ${escalation.workflowVersionId}, ${escalation.code},
            ${escalation.triggerStateCode}, ${escalation.escalationAfterMinutes},
            ${escalation.escalationActionCode ?? null}, ${escalation.notifyAssignmentId ?? null},
            ${escalation.isEnabled}
          )
        `;
      }

      await tx.$executeRaw`DELETE FROM workflow_sla WHERE workflow_version_id = ${snapshot.version.id}`;
      for (const sla of snapshot.slas) {
        await tx.$executeRaw`
          INSERT INTO workflow_sla (
            id, workflow_version_id, code, target_minutes, warning_minutes,
            escalation_id, is_enabled
          ) VALUES (
            ${sla.id}, ${sla.workflowVersionId}, ${sla.code}, ${sla.targetMinutes}, ${sla.warningMinutes ?? null},
            ${sla.escalationId ?? null}, ${sla.isEnabled}
          )
        `;
      }
    });
  }

  async getMetadataSnapshot(workflowVersionId: string): Promise<WorkflowMetadataSnapshot | null> {
    const definitionRows = (await prisma.$queryRaw`
      SELECT
        d.id AS definition_id,
        d.tenant_id,
        d.organization_id,
        d.module_id,
        d.entity_id,
        d.code AS definition_code,
        d.name AS definition_name,
        d.description AS definition_description,
        d.is_enabled,
        d.created_at AS definition_created_at,
        d.created_by AS definition_created_by,
        d.updated_at AS definition_updated_at,
        d.updated_by AS definition_updated_by,
        d.is_deleted,
        d.deleted_at,
        d.deleted_by,
        d.version AS definition_version,
        v.id AS version_id,
        v.version_number,
        v.status,
        v.is_initial AS version_is_initial,
        v.notes,
        v.published_at,
        v.published_by,
        v.created_at AS version_created_at,
        v.created_by AS version_created_by,
        v.updated_at AS version_updated_at,
        v.updated_by AS version_updated_by,
        v.version AS version_row_version
      FROM workflow_versions v
      INNER JOIN workflow_definitions d ON d.id = v.workflow_definition_id
      WHERE v.id = ${workflowVersionId}
      LIMIT 1
    `) as any[];

    if (definitionRows.length === 0) {
      return null;
    }

    const row = definitionRows[0];

    const states = (await prisma.$queryRaw`SELECT * FROM workflow_states WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const transitions = (await prisma.$queryRaw`SELECT * FROM workflow_transitions WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const conditions = (await prisma.$queryRaw`SELECT * FROM workflow_conditions WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const rules = (await prisma.$queryRaw`SELECT * FROM workflow_rules WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const actions = (await prisma.$queryRaw`SELECT * FROM workflow_actions WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const assignments = (await prisma.$queryRaw`SELECT * FROM workflow_assignments WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const roles = (await prisma.$queryRaw`SELECT * FROM workflow_roles WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const groups = (await prisma.$queryRaw`SELECT * FROM workflow_groups WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const permissions = (await prisma.$queryRaw`SELECT * FROM workflow_permissions WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const variables = (await prisma.$queryRaw`SELECT * FROM workflow_variables WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const expressions = (await prisma.$queryRaw`SELECT * FROM workflow_expressions WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const notifications = (await prisma.$queryRaw`SELECT * FROM workflow_notifications WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const escalations = (await prisma.$queryRaw`SELECT * FROM workflow_escalations WHERE workflow_version_id = ${workflowVersionId}`) as any[];
    const slas = (await prisma.$queryRaw`SELECT * FROM workflow_sla WHERE workflow_version_id = ${workflowVersionId}`) as any[];

    return {
      definition: {
        id: row.definition_id,
        tenantId: row.tenant_id,
        organizationId: row.organization_id,
        moduleId: row.module_id,
        entityId: row.entity_id,
        code: row.definition_code,
        name: row.definition_name,
        description: row.definition_description ?? undefined,
        isEnabled: row.is_enabled,
        createdAt: row.definition_created_at,
        createdBy: row.definition_created_by,
        updatedAt: row.definition_updated_at,
        updatedBy: row.definition_updated_by,
        isDeleted: row.is_deleted,
        deletedAt: row.deleted_at ?? undefined,
        deletedBy: row.deleted_by ?? undefined,
        version: Number(row.definition_version),
      },
      version: {
        id: row.version_id,
        workflowDefinitionId: row.definition_id,
        versionNumber: row.version_number,
        status: row.status,
        isInitial: row.version_is_initial,
        notes: row.notes ?? undefined,
        publishedAt: row.published_at ?? undefined,
        publishedBy: row.published_by ?? undefined,
        createdAt: row.version_created_at,
        createdBy: row.version_created_by,
        updatedAt: row.version_updated_at,
        updatedBy: row.version_updated_by,
        version: Number(row.version_row_version),
      },
      states: states.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        description: item.description ?? undefined,
        isInitial: item.is_initial,
        isTerminal: item.is_terminal,
        sequence: item.sequence,
        color: item.color ?? undefined,
        icon: item.icon ?? undefined,
        metadata: parseJson(item.metadata_json, {}),
      })),
      transitions: transitions.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        sourceStateCode: item.source_state_code,
        destinationStateCode: item.destination_state_code,
        actionCode: item.action_code,
        conditionId: item.condition_id ?? undefined,
        priority: item.priority,
        sequence: item.sequence,
        permissionCode: item.permission_code ?? undefined,
        visibilityExpressionId: item.visibility_expression_id ?? undefined,
        enabledExpressionId: item.enabled_expression_id ?? undefined,
        confirmationMessage: item.confirmation_message ?? undefined,
        successMessage: item.success_message ?? undefined,
        failureMessage: item.failure_message ?? undefined,
        auditFlag: item.audit_flag,
        rollbackFlag: item.rollback_flag,
        compensationActionCode: item.compensation_action_code ?? undefined,
        retryPolicy: parseJson(item.retry_policy_json, undefined),
        timeoutSeconds: item.timeout_seconds ?? undefined,
        parallelMode: item.parallel_mode ?? undefined,
        exclusiveGroupCode: item.exclusive_group_code ?? undefined,
        asyncExecution: item.async_execution ?? false,
        metadata: parseJson(item.metadata_json, {}),
      })),
      conditions: conditions.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        expressionId: item.expression_id,
        expectedResultType: item.expected_result_type ?? undefined,
        sequence: item.sequence,
        isEnabled: item.is_enabled,
      })),
      rules: rules.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        expressionId: item.expression_id,
        sequence: item.sequence,
        isEnabled: item.is_enabled,
      })),
      actions: actions.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        actionType: item.action_type,
        payload: parseJson(item.payload_json, {}),
        sequence: item.sequence,
        isEnabled: item.is_enabled,
      })),
      assignments: assignments.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        assignmentType: item.assignment_type,
        targetId: item.target_id ?? undefined,
        expressionId: item.expression_id ?? undefined,
        lookupKey: item.lookup_key ?? undefined,
        sequence: item.sequence,
        isRequired: item.is_required,
      })),
      approvers: [],
      notifications: notifications.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        trigger: item.trigger_code,
        templateCode: item.template_code,
        recipientExpressionId: item.recipient_expression_id ?? undefined,
        isEnabled: item.is_enabled,
      })),
      escalations: escalations.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        triggerStateCode: item.trigger_state_code,
        escalationAfterMinutes: item.escalation_after_minutes,
        escalationActionCode: item.escalation_action_code ?? undefined,
        notifyAssignmentId: item.notify_assignment_id ?? undefined,
        isEnabled: item.is_enabled,
      })),
      slas: slas.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        targetMinutes: item.target_minutes,
        warningMinutes: item.warning_minutes ?? undefined,
        escalationId: item.escalation_id ?? undefined,
        isEnabled: item.is_enabled,
      })),
      variables: variables.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        dataType: item.data_type,
        defaultValue: parseJson(item.default_value_json, null),
        isRequired: item.is_required,
      })),
      roles: roles.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        description: item.description ?? undefined,
      })),
      groups: groups.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        name: item.name,
        description: item.description ?? undefined,
      })),
      permissions: permissions.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        description: item.description ?? undefined,
      })),
      expressions: expressions.map((item) => ({
        id: item.id,
        workflowVersionId: item.workflow_version_id,
        code: item.code,
        expression: item.expression,
        description: item.description ?? undefined,
        language: item.language,
      })),
    };
  }

  async getDefinitionByEntity(entityId: string, tenantId: string): Promise<WorkflowDefinition | null> {
    const rows = (await prisma.$queryRaw`
      SELECT *
      FROM workflow_definitions
      WHERE entity_id = ${entityId} AND tenant_id = ${tenantId} AND is_deleted = false
      ORDER BY updated_at DESC
      LIMIT 1
    `) as any[];

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      moduleId: row.module_id,
      entityId: row.entity_id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      isEnabled: row.is_enabled,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      isDeleted: row.is_deleted,
      deletedAt: row.deleted_at ?? undefined,
      deletedBy: row.deleted_by ?? undefined,
      version: Number(row.version),
    };
  }

  async listVersions(workflowDefinitionId: string): Promise<WorkflowVersion[]> {
    const rows = (await prisma.$queryRaw`
      SELECT * FROM workflow_versions WHERE workflow_definition_id = ${workflowDefinitionId}
    `) as any[];

    return rows.map((row) => ({
      id: row.id,
      workflowDefinitionId: row.workflow_definition_id,
      versionNumber: row.version_number,
      status: row.status,
      isInitial: row.is_initial,
      notes: row.notes ?? undefined,
      publishedAt: row.published_at ?? undefined,
      publishedBy: row.published_by ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      version: Number(row.version),
    }));
  }

  async setVersionStatus(workflowVersionId: string, status: WorkflowVersionStatus, actorUserId: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE workflow_versions
      SET status = ${status}, updated_by = ${actorUserId}, updated_at = ${new Date()}
      WHERE id = ${workflowVersionId}
    `;
  }

  async saveManifest(manifest: WorkflowManifest): Promise<void> {
    const runtimeModelPayload = {
      ...manifest.runtimeModel,
      actionManifest: manifest.actionManifest,
      policyManifest: manifest.policyManifest,
      runtimeEffectManifest: manifest.runtimeEffectManifest,
      executionManifest: manifest.executionManifest,
    };

    await prisma.$executeRaw`
      INSERT INTO workflow_manifests (
        id, workflow_definition_id, workflow_version_id,
        generated_at, generated_by, runtime_model_json, validation_json,
        participant_manifest_json, assignment_manifest_json, resolution_manifest_json,
        designer_snapshot_json
      ) VALUES (
        ${manifest.id}, ${manifest.workflowDefinitionId}, ${manifest.workflowVersionId},
        ${manifest.generatedAt}, ${manifest.generatedBy}, ${serialize(runtimeModelPayload)},
        ${serialize(manifest.validation)}, ${serialize(manifest.participantManifest)},
        ${serialize(manifest.assignmentManifest)}, ${serialize(manifest.resolutionManifest)},
        ${serialize(manifest.designerSnapshot)}
      )
      ON CONFLICT (id) DO UPDATE SET
        generated_at = EXCLUDED.generated_at,
        generated_by = EXCLUDED.generated_by,
        runtime_model_json = EXCLUDED.runtime_model_json,
        participant_manifest_json = EXCLUDED.participant_manifest_json,
        assignment_manifest_json = EXCLUDED.assignment_manifest_json,
        resolution_manifest_json = EXCLUDED.resolution_manifest_json,
        designer_snapshot_json = EXCLUDED.designer_snapshot_json,
        validation_json = EXCLUDED.validation_json
    `;
  }

  async getManifest(workflowVersionId: string): Promise<WorkflowManifest | null> {
    const rows = (await prisma.$queryRaw`
      SELECT *
      FROM workflow_manifests
      WHERE workflow_version_id = ${workflowVersionId}
      ORDER BY generated_at DESC
      LIMIT 1
    `) as any[];

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const runtimeModel = parseJson(row.runtime_model_json ?? row.snapshot_json, null);

    return {
      id: row.id,
      workflowDefinitionId: row.workflow_definition_id,
      workflowVersionId: row.workflow_version_id,
      generatedAt: row.generated_at,
      generatedBy: row.generated_by,
      runtimeModel,
      validation: parseJson(row.validation_json, null),
      participantManifest: parseJson(row.participant_manifest_json, {
        workflowVersionId,
        generatedAt: row.generated_at,
        providerMap: {},
        supportedParticipantTypes: [],
      }),
      assignmentManifest: parseJson(row.assignment_manifest_json, {
        workflowVersionId,
        generatedAt: row.generated_at,
        strategies: [],
      }),
      resolutionManifest: parseJson(row.resolution_manifest_json, {
        workflowVersionId,
        generatedAt: row.generated_at,
        assignments: [],
      }),
      actionManifest: parseJson(runtimeModel?.actionManifest, {
        workflowVersionId,
        generatedAt: row.generated_at,
        transitions: [],
      }),
      policyManifest: parseJson(runtimeModel?.policyManifest, {
        workflowVersionId,
        generatedAt: row.generated_at,
        transitions: [],
      }),
      runtimeEffectManifest: parseJson(runtimeModel?.runtimeEffectManifest, {
        workflowVersionId,
        generatedAt: row.generated_at,
        transitions: [],
      }),
      executionManifest: parseJson(runtimeModel?.executionManifest, {
        workflowVersionId,
        generatedAt: row.generated_at,
        transitions: [],
      }),
      designerSnapshot: parseJson(row.designer_snapshot_json, undefined),
    } as WorkflowManifest;
  }

  async saveValidationReport(
    workflowVersionId: string,
    validation: WorkflowValidationResult,
    actorUserId: string
  ): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO workflow_validation_reports (
        id, workflow_version_id, is_valid, errors_json, warnings_json,
        validated_at, validated_by
      ) VALUES (
        gen_random_uuid(), ${workflowVersionId}, ${validation.isValid},
        ${serialize(validation.errors)}, ${serialize(validation.warnings)},
        ${validation.validatedAt}, ${actorUserId}
      )
    `;
  }

  async savePublishHistory(workflowVersionId: string, manifestId: string, actorUserId: string): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO workflow_publish_history (
        id, workflow_version_id, manifest_id, published_at, published_by
      ) VALUES (
        gen_random_uuid(), ${workflowVersionId}, ${manifestId}, ${new Date()}, ${actorUserId}
      )
    `;
  }
}
