import { RuntimeContext } from "../models/RuntimeContext";
import type { RuntimeOperation } from "../models/RuntimeOperation";
import type { RuntimeManifest } from "../../services/manifest-generator";

interface RuntimeSessionLike {
  tenantId: string;
  sub: string;
  roles?: string[];
  permissions?: string[];
  sid?: string;
}

interface RuntimeContextFactoryInput {
  manifest: RuntimeManifest;
  session: RuntimeSessionLike;
  operation: RuntimeOperation;
  recordId?: string;
  requestId?: string;
  correlationId?: string;
  culture?: string;
  timezone?: string;
}

export function buildRuntimeContext({
  manifest,
  session,
  operation,
  recordId,
  requestId,
  correlationId,
  culture,
  timezone,
}: RuntimeContextFactoryInput): RuntimeContext {
  return RuntimeContext.create({
    requestId,
    tenantId: session.tenantId,
    tenant: { id: session.tenantId },
    organizationId: session.tenantId,
    organization: { id: session.tenantId },
    moduleId: manifest.module,
    module: { id: manifest.module, code: manifest.module },
    entityId: manifest.entity,
    entity: { id: manifest.entity, code: manifest.entity, name: manifest.entityName },
    entityDefinition: manifest,
    viewDefinition: manifest.presentation.defaultDataViewCode,
    layoutDefinition: manifest.presentation.defaultLayoutViewCode,
    userId: session.sub,
    currentUser: {
      id: session.sub,
      roles: session.roles ?? [],
      permissions: session.permissions ?? [],
    },
    roles: session.roles ?? [],
    permissions: session.permissions ?? [],
    operation,
    recordId,
    transactionId: session.sid,
    correlationId,
    culture: culture ?? "en-US",
    timezone: timezone ?? "UTC",
    executionMode: "Interactive",
    triggerSource: "API",
    workflowDefinitionId: undefined,
    workflowVersionId: undefined,
    workflowInstanceId: undefined,
    workflowVariables: {},
    workflowAssignments: [],
    workflowManifest: undefined,
    workflowState: {},
    currentRecord: {},
    currentValues: {},
    originalValues: {},
  });
}
