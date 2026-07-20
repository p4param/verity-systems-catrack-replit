// VS08A: Tenant domain errors
// Each error carries structured payload properties for programmatic inspection.

export class TenantNotFoundError extends Error {
  readonly identifier: string;

  constructor(identifier: string) {
    super(`Tenant not found: ${identifier}`);
    this.name = "TenantNotFoundError";
    this.identifier = identifier;
  }
}

export class DuplicateTenantCodeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Tenant code '${code}' already exists`);
    this.name = "DuplicateTenantCodeError";
    this.code = code;
  }
}

export class DuplicateTenantNameError extends Error {
  readonly tenantName: string;

  constructor(tenantName: string) {
    super(`Tenant name '${tenantName}' already exists`);
    this.name = "DuplicateTenantNameError";
    this.tenantName = tenantName;
  }
}

export class ArchivedTenantImmutableError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(`Tenant '${tenantId}' is archived and immutable`);
    this.name = "ArchivedTenantImmutableError";
    this.tenantId = tenantId;
  }
}

export class TenantCodeImmutableError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(`Tenant code cannot be modified on Tenant '${tenantId}'`);
    this.name = "TenantCodeImmutableError";
    this.tenantId = tenantId;
  }
}

export class InvalidTenantLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition for Tenant: ${from} → ${to}`);
    this.name = "InvalidTenantLifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class TenantConcurrencyError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(`Concurrency conflict for Tenant '${tenantId}': version mismatch`);
    this.name = "TenantConcurrencyError";
    this.tenantId = tenantId;
  }
}

export class TenantValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`Tenant validation failed — ${detail}`);
    this.name = "TenantValidationError";
    this.fields = { ...fields };
  }
}
