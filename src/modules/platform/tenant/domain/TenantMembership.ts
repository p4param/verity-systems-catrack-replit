// VS08A: TenantMembership aggregate root
// Encapsulates domain invariants for the TenantMembership entity.
//
// Identity Ownership (D1): PlatformUser identity is owned by CM-002 Authentication & Identity Engine.
// Single Record Lifecycle Mutation (D2): Status changes mutate a single record in-place.
// Notification Scope (D3): Creating a membership does not trigger notification dispatch.

import { randomUUID } from "crypto";
import type {
  TenantMembershipRecord,
  TenantMembershipStatus,
  TenantRole,
  InviteUserCommand,
} from "../models/TenantMembershipModels";
import {
  TENANT_MEMBERSHIP_STATUS,
  TENANT_ROLE,
} from "../models/TenantMembershipModels";
import { TenantMembershipLifecycle } from "./TenantMembershipLifecycle";
import { RemovedMembershipImmutableError } from "./TenantMembershipErrors";

export class TenantMembership {
  private constructor(private readonly _record: TenantMembershipRecord) {}

  // ─── Identity & Associations ───────────────────────────────────────────────

  get id(): string {
    return this._record.id;
  }

  get tenantId(): string {
    return this._record.tenantId;
  }

  get userId(): string {
    return this._record.userId;
  }

  get tenantRole(): TenantRole {
    return this._record.tenantRole;
  }

  get status(): TenantMembershipStatus {
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
   * Invites a User to join a Tenant in Invited status (ADR-008-016 / D3).
   * Default role is Member if omitted. Does not dispatch notifications (D3).
   */
  static invite(command: InviteUserCommand): TenantMembership {
    const now = new Date();
    const record: TenantMembershipRecord = {
      id: randomUUID(),
      tenantId: command.tenantId.trim(),
      userId: command.userId.trim(),
      tenantRole: command.tenantRole ?? TENANT_ROLE.Member,
      status: TENANT_MEMBERSHIP_STATUS.Invited,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new TenantMembership(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a TenantMembership from a persisted record.
   */
  static reconstitute(record: TenantMembershipRecord): TenantMembership {
    return new TenantMembership({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this TenantMembership is not Removed.
   * Throws RemovedMembershipImmutableError if Removed.
   */
  assertModifiable(): void {
    if (TenantMembershipLifecycle.isImmutable(this._record.status)) {
      throw new RemovedMembershipImmutableError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  toRecord(): TenantMembershipRecord {
    return { ...this._record };
  }
}
