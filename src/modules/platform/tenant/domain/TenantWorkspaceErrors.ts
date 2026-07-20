// VS08A: TenantWorkspace domain errors
// Each error carries structured payload properties for programmatic inspection.

export class WorkspaceNotFoundError extends Error {
  readonly identifier: string;

  constructor(identifier: string) {
    super(`TenantWorkspace not found: ${identifier}`);
    this.name = "WorkspaceNotFoundError";
    this.identifier = identifier;
  }
}

export class DuplicateWorkspaceCodeError extends Error {
  readonly tenantId: string;
  readonly code: string;

  constructor(tenantId: string, code: string) {
    super(`Workspace code '${code}' already exists within tenant '${tenantId}'`);
    this.name = "DuplicateWorkspaceCodeError";
    this.tenantId = tenantId;
    this.code = code;
  }
}

export class DuplicateWorkspaceNameError extends Error {
  readonly tenantId: string;
  readonly workspaceName: string;

  constructor(tenantId: string, workspaceName: string) {
    super(`Workspace name '${workspaceName}' already exists within tenant '${tenantId}'`);
    this.name = "DuplicateWorkspaceNameError";
    this.tenantId = tenantId;
    this.workspaceName = workspaceName;
  }
}

export class WorkspaceTenantNotFoundError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(`Owning Tenant '${tenantId}' does not exist`);
    this.name = "WorkspaceTenantNotFoundError";
    this.tenantId = tenantId;
  }
}

export class ArchivedWorkspaceImmutableError extends Error {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    super(`TenantWorkspace '${workspaceId}' is archived and immutable`);
    this.name = "ArchivedWorkspaceImmutableError";
    this.workspaceId = workspaceId;
  }
}

export class WorkspaceCodeImmutableError extends Error {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    super(`Workspace code cannot be modified on TenantWorkspace '${workspaceId}'`);
    this.name = "WorkspaceCodeImmutableError";
    this.workspaceId = workspaceId;
  }
}

export class WorkspaceTenantImmutableError extends Error {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    super(`TenantWorkspace '${workspaceId}' cannot be moved to a different tenant`);
    this.name = "WorkspaceTenantImmutableError";
    this.workspaceId = workspaceId;
  }
}

export class InvalidWorkspaceLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition for TenantWorkspace: ${from} → ${to}`);
    this.name = "InvalidWorkspaceLifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class WorkspaceConcurrencyError extends Error {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    super(`Concurrency conflict for TenantWorkspace '${workspaceId}': version mismatch`);
    this.name = "WorkspaceConcurrencyError";
    this.workspaceId = workspaceId;
  }
}

export class WorkspaceValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`TenantWorkspace validation failed — ${detail}`);
    this.name = "WorkspaceValidationError";
    this.fields = { ...fields };
  }
}
