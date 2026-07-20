// VS08A: TenantWorkspace models
// Domain types, record DTO, commands, and queries for TenantWorkspace.

// ─── Status ───────────────────────────────────────────────────────────────────

export type TenantWorkspaceStatus =
  | "Provisioning"
  | "Active"
  | "Suspended"
  | "Archived";

export const TENANT_WORKSPACE_STATUS = {
  Provisioning: "Provisioning",
  Active: "Active",
  Suspended: "Suspended",
  Archived: "Archived",
} as const satisfies Record<string, TenantWorkspaceStatus>;

// ─── Record (DTO) ──────────────────────────────────────────────────────────────

/**
 * Flat data transfer object representing a persisted TenantWorkspace record.
 */
export interface TenantWorkspaceRecord {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  timeZone: string;
  culture: string;
  currency: string;
  status: TenantWorkspaceStatus;
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

export interface CreateWorkspaceCommand {
  tenantId: string;
  code: string;
  name: string;
  displayName: string;
  description?: string;

  /**
   * Workspace default settings.
   * If omitted during creation, defaults inherit from owning Tenant settings (D3 / ADR-008-014).
   */
  timeZone?: string;
  culture?: string;
  currency?: string;

  actorUserId: string;
}

export interface UpdateWorkspaceMetadataCommand {
  id: string;
  displayName?: string;
  description?: string | null;
  timeZone?: string;
  culture?: string;
  currency?: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface ActivateWorkspaceCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface SuspendWorkspaceCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface ArchiveWorkspaceCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListWorkspacesQuery {
  tenantId: string;
  status?: TenantWorkspaceStatus;
  includeDeleted?: boolean;
}
