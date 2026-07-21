// VS08A: WorkspaceMembership models
// Domain types, record DTO, commands, and queries for WorkspaceMembership.
//
// Security Invariant (D1): Same-tenant validation enforces workspace.tenantId === tenantMembership.tenantId.
// Suspended Guard (D2): Non-Active TenantMemberships cannot activate or create WorkspaceMemberships.
// Deferred Permissions (D3): Permission evaluation derives from WorkspaceRole in VS08B (no embedded ACLs).

// ─── Status ───────────────────────────────────────────────────────────────────

export type WorkspaceMembershipStatus =
  | "Invited"
  | "Active"
  | "Suspended"
  | "Removed";

export const WORKSPACE_MEMBERSHIP_STATUS = {
  Invited: "Invited",
  Active: "Active",
  Suspended: "Suspended",
  Removed: "Removed",
} as const satisfies Record<string, WorkspaceMembershipStatus>;

// ─── Roles ────────────────────────────────────────────────────────────────────

export type WorkspaceRole =
  | "WorkspaceAdmin"
  | "Contributor"
  | "Viewer"
  | "Guest";

export const WORKSPACE_ROLE = {
  WorkspaceAdmin: "WorkspaceAdmin",
  Contributor: "Contributor",
  Viewer: "Viewer",
  Guest: "Guest",
} as const satisfies Record<string, WorkspaceRole>;

// ─── Record (DTO) ──────────────────────────────────────────────────────────────

/**
 * Flat data transfer object representing a persisted WorkspaceMembership record.
 */
export interface WorkspaceMembershipRecord {
  id: string;
  workspaceId: string;
  tenantMembershipId: string;
  workspaceRole: WorkspaceRole;
  status: WorkspaceMembershipStatus;
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

export interface InviteToWorkspaceCommand {
  workspaceId: string;
  tenantMembershipId: string;
  workspaceRole?: WorkspaceRole;
  actorUserId: string;
}

export interface ActivateWorkspaceMembershipCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface SuspendWorkspaceMembershipCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface RemoveWorkspaceMembershipCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface UpdateWorkspaceRoleCommand {
  id: string;
  workspaceRole: WorkspaceRole;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListWorkspaceMembersQuery {
  workspaceId: string;
  status?: WorkspaceMembershipStatus;
  workspaceRole?: WorkspaceRole;
  includeDeleted?: boolean;
}
