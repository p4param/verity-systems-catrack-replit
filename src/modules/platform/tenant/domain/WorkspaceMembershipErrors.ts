// VS08A: WorkspaceMembership domain errors
// Structured domain error classes carrying payload properties for programmatic inspection.

export class WorkspaceMembershipNotFoundError extends Error {
  readonly identifier: string;

  constructor(identifier: string) {
    super(`WorkspaceMembership not found: ${identifier}`);
    this.name = "WorkspaceMembershipNotFoundError";
    this.identifier = identifier;
  }
}

export class DuplicateWorkspaceMembershipError extends Error {
  readonly workspaceId: string;
  readonly tenantMembershipId: string;

  constructor(workspaceId: string, tenantMembershipId: string) {
    super(`TenantMembership '${tenantMembershipId}' is already a member of workspace '${workspaceId}'`);
    this.name = "DuplicateWorkspaceMembershipError";
    this.workspaceId = workspaceId;
    this.tenantMembershipId = tenantMembershipId;
  }
}

export class WorkspaceMembershipWorkspaceNotFoundError extends Error {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    super(`Target TenantWorkspace '${workspaceId}' does not exist`);
    this.name = "WorkspaceMembershipWorkspaceNotFoundError";
    this.workspaceId = workspaceId;
  }
}

export class WorkspaceMembershipWorkspaceNotActiveError extends Error {
  readonly workspaceId: string;
  readonly status: string;

  constructor(workspaceId: string, status: string) {
    super(`Cannot modify workspace membership: target workspace '${workspaceId}' status is '${status}' (must be Active)`);
    this.name = "WorkspaceMembershipWorkspaceNotActiveError";
    this.workspaceId = workspaceId;
    this.status = status;
  }
}

export class WorkspaceMembershipTenantMembershipNotFoundError extends Error {
  readonly tenantMembershipId: string;

  constructor(tenantMembershipId: string) {
    super(`Target TenantMembership '${tenantMembershipId}' does not exist`);
    this.name = "WorkspaceMembershipTenantMembershipNotFoundError";
    this.tenantMembershipId = tenantMembershipId;
  }
}

export class WorkspaceMembershipTenantMembershipNotActiveError extends Error {
  readonly tenantMembershipId: string;
  readonly status: string;

  constructor(tenantMembershipId: string, status: string) {
    super(`Cannot modify workspace membership: target TenantMembership '${tenantMembershipId}' status is '${status}' (must be Active)`);
    this.name = "WorkspaceMembershipTenantMembershipNotActiveError";
    this.tenantMembershipId = tenantMembershipId;
    this.status = status;
  }
}

export class WorkspaceMembershipTenantMismatchError extends Error {
  readonly workspaceTenantId: string;
  readonly membershipTenantId: string;

  constructor(workspaceTenantId: string, membershipTenantId: string) {
    super(
      `CRITICAL SECURITY INVARIANT VIOLATION: Workspace tenant '${workspaceTenantId}' does not match TenantMembership tenant '${membershipTenantId}'`
    );
    this.name = "WorkspaceMembershipTenantMismatchError";
    this.workspaceTenantId = workspaceTenantId;
    this.membershipTenantId = membershipTenantId;
  }
}

export class RemovedWorkspaceMembershipImmutableError extends Error {
  readonly membershipId: string;

  constructor(membershipId: string) {
    super(`WorkspaceMembership '${membershipId}' is removed and immutable`);
    this.name = "RemovedWorkspaceMembershipImmutableError";
    this.membershipId = membershipId;
  }
}

export class WorkspaceMembershipAssociationImmutableError extends Error {
  readonly membershipId: string;

  constructor(membershipId: string) {
    super(`Workspace and tenant membership associations cannot be modified on WorkspaceMembership '${membershipId}'`);
    this.name = "WorkspaceMembershipAssociationImmutableError";
    this.membershipId = membershipId;
  }
}

export class InvalidWorkspaceMembershipLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition for WorkspaceMembership: ${from} → ${to}`);
    this.name = "InvalidWorkspaceMembershipLifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class WorkspaceMembershipConcurrencyError extends Error {
  readonly membershipId: string;

  constructor(membershipId: string) {
    super(`Concurrency conflict for WorkspaceMembership '${membershipId}': version mismatch`);
    this.name = "WorkspaceMembershipConcurrencyError";
    this.membershipId = membershipId;
  }
}

export class WorkspaceMembershipValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`WorkspaceMembership validation failed — ${detail}`);
    this.name = "WorkspaceMembershipValidationError";
    this.fields = { ...fields };
  }
}
