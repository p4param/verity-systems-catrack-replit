import { randomUUID } from "crypto";
import type { RuntimeManifest } from "../../services/manifest-generator";
import type { RuntimeOperation } from "./RuntimeOperation";
import { RuntimeTransaction } from "./RuntimeTransaction";

export type RuntimeExecutionMode = "Interactive" | "Background" | "Batch" | "System";
export type RuntimeTriggerSource = "API" | "UI" | "Workflow" | "Scheduler" | "Import" | "System";

export interface RuntimePrincipal {
  id: string;
  roles: readonly string[];
  permissions: readonly string[];
}

export interface RuntimeScopeRef {
  id: string;
  code?: string;
  name?: string;
}

export interface RuntimeContextInit {
  requestId?: string;
  tenantId: string;
  tenant?: RuntimeScopeRef;
  organizationId: string;
  organization?: RuntimeScopeRef;
  moduleId: string;
  module?: RuntimeScopeRef;
  entityId: string;
  entity?: RuntimeScopeRef;
  operation: RuntimeOperation;
  userId: string;
  currentUser?: RuntimePrincipal;
  roles?: string[];
  permissions?: string[];
  recordId?: string;
  correlationId?: string;
  transactionId?: string;
  transaction?: RuntimeTransaction;
  culture?: string;
  timezone?: string;
  executionMode?: RuntimeExecutionMode;
  triggerSource?: RuntimeTriggerSource;
  workflowState?: Record<string, unknown>;
  currentRecord?: Record<string, unknown>;
  currentValues?: Record<string, unknown>;
  originalValues?: Record<string, unknown>;
  timestamp?: Date;
  entityDefinition?: RuntimeManifest;
  viewDefinition?: unknown;
  layoutDefinition?: unknown;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  const propNames = Object.getOwnPropertyNames(value);
  for (const name of propNames) {
    const prop = (value as Record<string, unknown>)[name];
    if (prop && typeof prop === "object") {
      deepFreeze(prop);
    }
  }

  return Object.freeze(value);
}

export class RuntimeContext {
  readonly requestId: string;
  readonly tenant: RuntimeScopeRef;
  readonly organization: RuntimeScopeRef;
  readonly module: RuntimeScopeRef;
  readonly entity: RuntimeScopeRef;
  readonly currentUser: RuntimePrincipal;

  readonly tenantId: string;
  readonly organizationId: string;
  readonly moduleId: string;
  readonly entityId: string;
  readonly entityDefinition?: RuntimeManifest;
  readonly viewDefinition?: unknown;
  readonly layoutDefinition?: unknown;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly operation: RuntimeOperation;
  readonly recordId?: string;
  readonly correlationId: string;
  readonly transaction: RuntimeTransaction;
  readonly transactionId: string;
  readonly culture: string;
  readonly timezone: string;
  readonly executionMode: RuntimeExecutionMode;
  readonly triggerSource: RuntimeTriggerSource;
  readonly workflowState: Readonly<Record<string, unknown>>;
  readonly currentRecord: Readonly<Record<string, unknown>>;
  readonly currentValues: Readonly<Record<string, unknown>>;
  readonly originalValues: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;

  private constructor(init: RuntimeContextInit) {
    this.requestId = init.requestId ?? randomUUID();

    this.tenant = Object.freeze(init.tenant ?? { id: init.tenantId });
    this.organization = Object.freeze(init.organization ?? { id: init.organizationId });
    this.module = Object.freeze(init.module ?? { id: init.moduleId });
    this.entity = Object.freeze(init.entity ?? { id: init.entityId });

    this.tenantId = this.tenant.id;
    this.organizationId = this.organization.id;
    this.moduleId = this.module.id;
    this.entityId = this.entity.id;

    this.entityDefinition = init.entityDefinition ? deepFreeze({ ...init.entityDefinition }) : undefined;
    this.viewDefinition = init.viewDefinition ? deepFreeze({ ...(init.viewDefinition as Record<string, unknown>) }) : undefined;
    this.layoutDefinition = init.layoutDefinition ? deepFreeze({ ...(init.layoutDefinition as Record<string, unknown>) }) : undefined;

    this.currentUser = Object.freeze({
      id: init.currentUser?.id ?? init.userId,
      roles: Object.freeze([...(init.currentUser?.roles ?? init.roles ?? [])]),
      permissions: Object.freeze([...(init.currentUser?.permissions ?? init.permissions ?? [])]),
    });

    this.userId = init.userId;
    this.roles = this.currentUser.roles;
    this.permissions = this.currentUser.permissions;
    this.operation = init.operation;
    this.recordId = init.recordId;
    this.correlationId = init.correlationId ?? randomUUID();
    this.transaction = init.transaction ?? RuntimeTransaction.create({ id: init.transactionId });
    this.transactionId = this.transaction.id;
    this.culture = init.culture ?? "en-US";
    this.timezone = init.timezone ?? "UTC";
    this.executionMode = init.executionMode ?? "Interactive";
    this.triggerSource = init.triggerSource ?? "API";
    this.workflowState = Object.freeze({ ...(init.workflowState ?? {}) });
    this.currentRecord = Object.freeze({ ...(init.currentRecord ?? {}) });
    this.currentValues = Object.freeze({ ...(init.currentValues ?? {}) });
    this.originalValues = Object.freeze({ ...(init.originalValues ?? {}) });
    this.timestamp = init.timestamp ?? new Date();

    Object.freeze(this);
  }

  static create(init: RuntimeContextInit): RuntimeContext {
    return new RuntimeContext(init);
  }

  with(overrides: Partial<RuntimeContextInit>): RuntimeContext {
    return RuntimeContext.create({
      requestId: overrides.requestId ?? this.requestId,
      tenantId: overrides.tenantId ?? this.tenantId,
      tenant: overrides.tenant ?? this.tenant,
      organizationId: overrides.organizationId ?? this.organizationId,
      organization: overrides.organization ?? this.organization,
      moduleId: overrides.moduleId ?? this.moduleId,
      module: overrides.module ?? this.module,
      entityId: overrides.entityId ?? this.entityId,
      entity: overrides.entity ?? this.entity,
      operation: overrides.operation ?? this.operation,
      userId: overrides.userId ?? this.userId,
      currentUser: overrides.currentUser ?? this.currentUser,
      roles: overrides.roles ?? [...this.currentUser.roles],
      permissions: overrides.permissions ?? [...this.currentUser.permissions],
      recordId: overrides.recordId ?? this.recordId,
      correlationId: overrides.correlationId ?? this.correlationId,
      transactionId: overrides.transactionId ?? this.transactionId,
      transaction: overrides.transaction ?? this.transaction,
      culture: overrides.culture ?? this.culture,
      timezone: overrides.timezone ?? this.timezone,
      executionMode: overrides.executionMode ?? this.executionMode,
      triggerSource: overrides.triggerSource ?? this.triggerSource,
      workflowState: overrides.workflowState ?? this.workflowState,
      currentRecord: overrides.currentRecord ?? this.currentRecord,
      currentValues: overrides.currentValues ?? this.currentValues,
      originalValues: overrides.originalValues ?? this.originalValues,
      timestamp: overrides.timestamp ?? this.timestamp,
      entityDefinition: overrides.entityDefinition ?? this.entityDefinition,
      viewDefinition: overrides.viewDefinition ?? this.viewDefinition,
      layoutDefinition: overrides.layoutDefinition ?? this.layoutDefinition,
    });
  }
}
