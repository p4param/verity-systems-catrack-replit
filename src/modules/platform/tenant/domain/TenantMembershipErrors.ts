// VS08A: TenantMembership domain errors
// Structured domain error classes carrying payload properties for programmatic inspection.

export class MembershipNotFoundError extends Error {
  readonly identifier: string;

  constructor(identifier: string) {
    super(`TenantMembership not found: ${identifier}`);
    this.name = "MembershipNotFoundError";
    this.identifier = identifier;
  }
}

export class DuplicateTenantMembershipError extends Error {
  readonly tenantId: string;
  readonly userId: string;

  constructor(tenantId: string, userId: string) {
    super(`User '${userId}' is already a member of tenant '${tenantId}'`);
    this.name = "DuplicateTenantMembershipError";
    this.tenantId = tenantId;
    this.userId = userId;
  }
}

export class MembershipTenantNotFoundError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(`Target Tenant '${tenantId}' does not exist`);
    this.name = "MembershipTenantNotFoundError";
    this.tenantId = tenantId;
  }
}

export class MembershipTenantNotActiveError extends Error {
  readonly tenantId: string;
  readonly status: string;

  constructor(tenantId: string, status: string) {
    super(`Cannot modify membership: target tenant '${tenantId}' status is '${status}' (must be Active)`);
    this.name = "MembershipTenantNotActiveError";
    this.tenantId = tenantId;
    this.status = status;
  }
}

export class MembershipUserNotFoundError extends Error {
  readonly userId: string;

  constructor(userId: string) {
    super(`Target User '${userId}' does not exist`);
    this.name = "MembershipUserNotFoundError";
    this.userId = userId;
  }
}

export class RemovedMembershipImmutableError extends Error {
  readonly membershipId: string;

  constructor(membershipId: string) {
    super(`TenantMembership '${membershipId}' is removed and immutable`);
    this.name = "RemovedMembershipImmutableError";
    this.membershipId = membershipId;
  }
}

export class TenantMembershipAssociationImmutableError extends Error {
  readonly membershipId: string;

  constructor(membershipId: string) {
    super(`Tenant and user associations cannot be modified on TenantMembership '${membershipId}'`);
    this.name = "TenantMembershipAssociationImmutableError";
    this.membershipId = membershipId;
  }
}

export class InvalidMembershipLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition for TenantMembership: ${from} → ${to}`);
    this.name = "InvalidMembershipLifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class TenantMembershipConcurrencyError extends Error {
  readonly membershipId: string;

  constructor(membershipId: string) {
    super(`Concurrency conflict for TenantMembership '${membershipId}': version mismatch`);
    this.name = "TenantMembershipConcurrencyError";
    this.membershipId = membershipId;
  }
}

export class TenantMembershipValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`TenantMembership validation failed — ${detail}`);
    this.name = "TenantMembershipValidationError";
    this.fields = { ...fields };
  }
}
