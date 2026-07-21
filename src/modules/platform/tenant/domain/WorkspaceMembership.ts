// VS08A: WorkspaceMembership aggregate root
// Encapsulates domain invariants for the WorkspaceMembership entity.
//
// Security Invariant (D1): Same-tenant validation enforces workspace.tenantId === tenantMembership.tenantId.
// Suspended Guard (D2): Non-Active TenantMemberships cannot activate or create WorkspaceMemberships.
// Deferred Permissions (D3): Permission evaluation derives from WorkspaceRole in VS08B (no embedded ACLs).

import { randomUUID } from "crypto";
import type {
  WorkspaceMembershipRecord,
  WorkspaceMembershipStatus,
  WorkspaceRole,
  InviteToWorkspaceCommand,
} from "../models/WorkspaceMembershipModels";
import {
  WORKSPACE_MEMBERSHIP_STATUS,
  WORKSPACE_ROLE,
} from "../models/WorkspaceMembershipModels";
import { WorkspaceMembershipLifecycle } from "./WorkspaceMembershipLifecycle";
import { RemovedWorkspaceMembershipImmutableError } from "./WorkspaceMembershipErrors";

export class WorkspaceMembership {
  private constructor(private readonly _record: WorkspaceMembershipRecord) {}

  // ─── Identity & Associations ───────────────────────────────────────────────

  get id(): string {
    return this._record.id;
  }

  get workspaceId(): string {
    return this._record.workspaceId;
  }

  get tenantMembershipId(): string {
    return this._record.tenantMembershipId;
  }

  get workspaceRole(): WorkspaceRole {
    return this._record.workspaceRole;
  }

  get status(): WorkspaceMembershipStatus {
    return this._record.status;
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  get createdAt(): Date {
    return this._record.createdAt;
  }

  get createdBy(): string | null {
    return this._record.createdBy;
  }

  get updatedAt(): Date {
    return this._record.updatedAt;
  }

  get updatedBy(): string | null {
    return this._record.updatedBy;
  }

  get isDeleted(): boolean {
    return this._record.isDeleted;
  }

  get deletedAt(): Date | null {
    return this._record.deletedAt;
  }

  get deletedBy(): string | null {
    return this._record.deletedBy;
  }

  get version(): bigint {
    return this._record.version;
  }

  // ─── Factory: Invite ──────────────────────────────────────────────────────

  /**
   * Invites a TenantMember to join a TenantWorkspace in Invited status.
   * Default role is Contributor if omitted.
   */
  static invite(command: InviteToWorkspaceCommand): WorkspaceMembership {
    const now = new Date();
    const record: WorkspaceMembershipRecord = {
      id: randomUUID(),
      workspaceId: command.workspaceId.trim(),
      tenantMembershipId: command.tenantMembershipId.trim(),
      workspaceRole: command.workspaceRole ?? WORKSPACE_ROLE.Contributor,
      status: WORKSPACE_MEMBERSHIP_STATUS.Invited,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new WorkspaceMembership(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a WorkspaceMembership from a persisted record.
   */
  static reconstitute(record: WorkspaceMembershipRecord): WorkspaceMembership {
    return new WorkspaceMembership({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this WorkspaceMembership is not Removed.
   * Throws RemovedWorkspaceMembershipImmutableError if Removed.
   */
  assertModifiable(): void {
    if (WorkspaceMembershipLifecycle.isImmutable(this._record.status)) {
      throw new RemovedWorkspaceMembershipImmutableError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  toRecord(): WorkspaceMembershipRecord {
    return { ...this._record };
  }
}
