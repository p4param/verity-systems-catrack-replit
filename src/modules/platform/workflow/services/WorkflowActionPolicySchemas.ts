import type {
  WorkflowAction,
  WorkflowMetadataSnapshot,
  WorkflowProcessPolicy,
  WorkflowValidationIssue,
} from "../models/WorkflowModels";

interface MetadataSchemaRule {
  requiredKeys?: readonly string[];
  numericKeys?: readonly string[];
  booleanKeys?: readonly string[];
  stringKeys?: readonly string[];
  allowAdditionalKeys?: boolean;
}

const ACTION_PAYLOAD_SCHEMAS: Record<WorkflowAction["actionType"], MetadataSchemaRule> = {
  StateChange: { requiredKeys: ["targetStateCode"], stringKeys: ["targetStateCode"] },
  CreateRecord: { requiredKeys: ["entityId"], stringKeys: ["entityId"] },
  UpdateRecord: { requiredKeys: ["entityId"], stringKeys: ["entityId"] },
  DeleteRecord: { requiredKeys: ["entityId"], stringKeys: ["entityId"] },
  CallAPI: { requiredKeys: ["url", "method"], stringKeys: ["url", "method"] },
  InvokePlatformService: { requiredKeys: ["serviceCode"], stringKeys: ["serviceCode"] },
  GenerateDocument: { requiredKeys: ["templateCode"], stringKeys: ["templateCode"] },
  GenerateReport: { requiredKeys: ["reportCode"], stringKeys: ["reportCode"] },
  RaiseEvent: { requiredKeys: ["eventCode"], stringKeys: ["eventCode"] },
  Notification: { requiredKeys: ["templateCode"], stringKeys: ["templateCode"] },
  Audit: { requiredKeys: ["auditCode"], stringKeys: ["auditCode"] },
  Log: { requiredKeys: ["message"], stringKeys: ["message"] },
  Wait: { requiredKeys: ["durationSeconds"], numericKeys: ["durationSeconds"] },
  Delay: { requiredKeys: ["durationSeconds"], numericKeys: ["durationSeconds"] },
  Timer: { requiredKeys: ["timerCode"], stringKeys: ["timerCode"] },
  Expression: { requiredKeys: ["expressionId"], stringKeys: ["expressionId"] },
  Script: { requiredKeys: ["scriptCode"], stringKeys: ["scriptCode"] },
  CustomAction: { requiredKeys: ["customActionCode"], stringKeys: ["customActionCode"] },
};

const POLICY_CONFIG_SCHEMAS: Record<WorkflowProcessPolicy["policyType"], MetadataSchemaRule> = {
  RetryPolicy: { requiredKeys: ["maxAttempts", "backoffSeconds"], numericKeys: ["maxAttempts", "backoffSeconds"] },
  CompensationPolicy: { requiredKeys: ["compensationActionCode"], stringKeys: ["compensationActionCode"] },
  TimeoutPolicy: { requiredKeys: ["timeoutSeconds"], numericKeys: ["timeoutSeconds"] },
  EscalationPolicy: { requiredKeys: ["escalationCode"], stringKeys: ["escalationCode"] },
  ConcurrencyPolicy: { requiredKeys: ["mode"], stringKeys: ["mode"] },
  TransactionPolicy: { requiredKeys: ["mode"], stringKeys: ["mode"] },
  FailurePolicy: { requiredKeys: ["rollbackOnFailure"], booleanKeys: ["rollbackOnFailure"] },
  NotificationPolicy: { requiredKeys: ["templateCode"], stringKeys: ["templateCode"] },
  AuditPolicy: { requiredKeys: ["auditCode"], stringKeys: ["auditCode"] },
  SecurityPolicy: { requiredKeys: ["securityLevel"], stringKeys: ["securityLevel"] },
  CachingPolicy: { requiredKeys: ["ttlSeconds"], numericKeys: ["ttlSeconds"] },
  CustomPolicy: { requiredKeys: ["customPolicyCode"], stringKeys: ["customPolicyCode"] },
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateObject(
  value: Record<string, unknown>,
  rule: MetadataSchemaRule,
  issueCodePrefix: string,
  path: string
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  for (const key of rule.requiredKeys ?? []) {
    if (!(key in value)) {
      issues.push({
        code: `${issueCodePrefix}_MISSING_KEY`,
        message: `Missing required metadata key: ${key}.`,
        severity: "Error",
        path,
      });
    }
  }

  for (const key of rule.numericKeys ?? []) {
    if (key in value && !isFiniteNumber(value[key])) {
      issues.push({
        code: `${issueCodePrefix}_INVALID_NUMBER`,
        message: `Metadata key ${key} must be a finite number.`,
        severity: "Error",
        path,
      });
    }
  }

  for (const key of rule.booleanKeys ?? []) {
    if (key in value && typeof value[key] !== "boolean") {
      issues.push({
        code: `${issueCodePrefix}_INVALID_BOOLEAN`,
        message: `Metadata key ${key} must be a boolean.`,
        severity: "Error",
        path,
      });
    }
  }

  for (const key of rule.stringKeys ?? []) {
    if (key in value && typeof value[key] !== "string") {
      issues.push({
        code: `${issueCodePrefix}_INVALID_STRING`,
        message: `Metadata key ${key} must be a string.`,
        severity: "Error",
        path,
      });
    }
  }

  if (rule.allowAdditionalKeys === false) {
    const allowed = new Set([
      ...(rule.requiredKeys ?? []),
      ...(rule.numericKeys ?? []),
      ...(rule.booleanKeys ?? []),
      ...(rule.stringKeys ?? []),
    ]);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        issues.push({
          code: `${issueCodePrefix}_UNKNOWN_KEY`,
          message: `Unknown metadata key ${key}.`,
          severity: "Error",
          path,
        });
      }
    }
  }

  return issues;
}

export class WorkflowActionPolicySchemas {
  validate(snapshot: WorkflowMetadataSnapshot): WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    for (const action of snapshot.actions) {
      const payload = (action.payload ?? {}) as Record<string, unknown>;
      const rule = ACTION_PAYLOAD_SCHEMAS[action.actionType];
      issues.push(
        ...validateObject(payload, rule, "WF_ACTION_SCHEMA", `actions.${action.code}.payload`)
      );
    }

    for (const policy of snapshot.policies ?? []) {
      const config = (policy.configuration ?? {}) as Record<string, unknown>;
      const rule = POLICY_CONFIG_SCHEMAS[policy.policyType];
      issues.push(
        ...validateObject(config, rule, "WF_POLICY_SCHEMA", `policies.${policy.code}.configuration`)
      );
    }

    return issues;
  }
}
