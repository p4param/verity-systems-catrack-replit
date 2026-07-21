// VS08A: TenantMembership models
// Domain types, record DTO, commands, and queries for TenantMembership.
//
// Identity Ownership (D1): PlatformUser identity is owned by CM-002 Authentication & Identity Engine.
// Lifecycle Rule (D2): All membership lifecycle state transitions occur in-place on a single record.
// Notification Scope (D3): inviteUser creates the membership record only and does not send email/notifications.

// ─── Status ───────────────────────────────────────────────────────────────────

export type TenantMembershipStatus =
  | "Invited"
  | "Active"
  | "Suspended"
  | "Removed";

export const TENANT_MEMBERSHIP_STATUS = {
  Invited: "Invited",
  Active: "Active",
  Suspended: "Suspended",
  Removed: "Removed",
} as const satisfies Record<string, TenantMembershipStatus>;

// ─── Roles ────────────────────────────────────────────────────────────────────

export type TenantRole = "Owner" | "Admin" | "Member" | "Guest";

export const TENANT_ROLE = {
  Owner: "Owner",
  Admin: "Admin",
  Member: "Member",
  Guest: "Guest",
} as const satisfies Record<string, TenantRole>;

// ─── Record (DTO) ──────────────────────────────────────────────────────────────

/**
 * Flat data transfer object representing a persisted TenantMembership record.
 */
export interface TenantMembershipRecord {
  id: string;
  tenantId: string;
  userId: string;
  tenantRole: TenantRole;
  status: TenantMembershipStatus;
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

/**
 * Invites a user to join a Tenant (D3: does not send notification email).
 */
export interface InviteUserCommand {
  tenantId: string;
  userId: string;
  tenantRole?: TenantRole;
  actorUserId: string;
}

export interface ActivateMembershipCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface SuspendMembershipCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface RemoveMembershipCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface UpdateTenantRoleCommand {
  id: string;
  tenantRole: TenantRole;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListTenantMembershipsQuery {
  tenantId: string;
  status?: TenantMembershipStatus;
  tenantRole?: TenantRole;
  includeDeleted?: boolean;
}
