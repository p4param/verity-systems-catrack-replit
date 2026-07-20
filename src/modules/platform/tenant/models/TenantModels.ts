// VS08A: Tenant models
// Domain types, record DTO, commands, and queries.

// ─── Status ───────────────────────────────────────────────────────────────────

export type TenantStatus =
  | "Provisioning"
  | "Active"
  | "Suspended"
  | "Archived";

export const TENANT_STATUS = {
  Provisioning: "Provisioning",
  Active: "Active",
  Suspended: "Suspended",
  Archived: "Archived",
} as const satisfies Record<string, TenantStatus>;

// ─── Record (DTO) ──────────────────────────────────────────────────────────────

/**
 * Flat data transfer object representing a persisted Tenant record.
 */
export interface TenantRecord {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  defaultTimeZone: string;
  defaultCulture: string;
  defaultCurrency: string;
  status: TenantStatus;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface RegisterTenantCommand {
  code: string;
  name: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  defaultTimeZone?: string;
  defaultCulture?: string;
  defaultCurrency?: string;
  actorUserId: string;
}

export interface UpdateTenantMetadataCommand {
  id: string;
  displayName?: string;
  description?: string | null;
  logoUrl?: string | null;
  defaultTimeZone?: string;
  defaultCulture?: string;
  defaultCurrency?: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface ActivateTenantCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface SuspendTenantCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface ArchiveTenantCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListTenantsQuery {
  status?: TenantStatus;
  includeDeleted?: boolean;
}
