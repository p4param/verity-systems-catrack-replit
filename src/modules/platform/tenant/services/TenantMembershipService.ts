// VS08A: TenantMembershipService — application service
// Orchestrates prerequisite validations, role updates, lifecycle state transitions, and repository persistence.
//
// PlatformUser identity is owned by CM-002 Authentication & Identity Engine (D1).
// All membership lifecycle state transitions occur in-place on a single record (D2).
// inviteUser creates the membership record only and does not dispatch notifications (D3).

import { prisma } from "@/lib/prisma";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type { ITenantMembershipService } from "../contracts/ITenantMembershipService";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import type {
  TenantMembershipRecord,
  InviteUserCommand,
  ActivateMembershipCommand,
  SuspendMembershipCommand,
  RemoveMembershipCommand,
  UpdateTenantRoleCommand,
  ListTenantMembershipsQuery,
} from "../models/TenantMembershipModels";
import { TENANT_MEMBERSHIP_STATUS } from "../models/TenantMembershipModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { TenantMembership } from "../domain/TenantMembership";
import { TenantMembershipLifecycle } from "../domain/TenantMembershipLifecycle";
import { TenantMembershipValidator } from "../domain/TenantMembershipValidator";
import {
  MembershipNotFoundError,
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipTenantNotActiveError,
  MembershipUserNotFoundError,
} from "../domain/TenantMembershipErrors";

export class TenantMembershipService implements ITenantMembershipService {
  constructor(
    private readonly repository: ITenantMembershipRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  // ─── Invite User (Prerequisite Validation) ──────────────────────────────

  async inviteUser(command: InviteUserCommand): Promise<TenantMembershipRecord> {
    // 1. Validate fields
    TenantMembershipValidator.validateInviteCommand(command);

    const { tenantId, userId } = command;

    // 2. Validate Tenant exists & is Active
    const tenant = await this.tenantRepository.getById(tenantId);
    if (!tenant) {
      throw new MembershipTenantNotFoundError(tenantId);
    }
    if (tenant.status !== TENANT_STATUS.Active) {
      throw new MembershipTenantNotActiveError(tenantId, tenant.status);
    }

    // 3. Validate User exists (User entity owned by CM-002 Identity Engine)
    const user = await (prisma as any).user.findFirst({
      where: { id: userId },
    });
    if (!user) {
      throw new MembershipUserNotFoundError(userId);
    }

    // 4. Validate duplicate membership in tenant does not exist
    if (await this.repository.existsMembership(tenantId, userId)) {
      throw new DuplicateTenantMembershipError(tenantId, userId);
    }

    // 5. Create aggregate in Invited status (D3: no email/notification dispatched)
    const membership = TenantMembership.invite(command);

    // 6. Persist
    await this.repository.invite(membership.toRecord());

    return membership.toRecord();
  }

  // ─── Activate Membership (Invited/Suspended → Active) ─────────────────────

  async activateMembership(
    command: ActivateMembershipCommand
  ): Promise<TenantMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new MembershipNotFoundError(command.id);
    }

    TenantMembershipLifecycle.validateTransition(
      existing.status,
      TENANT_MEMBERSHIP_STATUS.Active
    );

    await this.repository.activate(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Suspend Membership (Active → Suspended) ─────────────────────────────

  async suspendMembership(
    command: SuspendMembershipCommand
  ): Promise<TenantMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new MembershipNotFoundError(command.id);
    }

    TenantMembershipLifecycle.validateTransition(
      existing.status,
      TENANT_MEMBERSHIP_STATUS.Suspended
    );

    await this.repository.suspend(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Remove Membership (Active/Suspended → Removed) ──────────────────────

  async removeMembership(
    command: RemoveMembershipCommand
  ): Promise<TenantMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new MembershipNotFoundError(command.id);
    }

    TenantMembershipLifecycle.validateTransition(
      existing.status,
      TENANT_MEMBERSHIP_STATUS.Removed
    );

    await this.repository.remove(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Update Tenant Role ───────────────────────────────────────────────────

  async updateTenantRole(
    command: UpdateTenantRoleCommand
  ): Promise<TenantMembershipRecord> {
    TenantMembershipValidator.validateUpdateRoleCommand(command);

    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new MembershipNotFoundError(command.id);
    }

    const membership = TenantMembership.reconstitute(existing);
    membership.assertModifiable(); // Throws RemovedMembershipImmutableError if Removed

    await this.repository.updateRole(
      command.id,
      command.tenantRole,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getMembershipById(id: string): Promise<TenantMembershipRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new MembershipNotFoundError(id);
    return record;
  }

  async getMembershipByUser(
    tenantId: string,
    userId: string
  ): Promise<TenantMembershipRecord> {
    const record = await this.repository.getByUserAndTenant(tenantId, userId);
    if (!record) {
      throw new MembershipNotFoundError(`${tenantId}@${userId}`);
    }
    return record;
  }

  async listTenantMemberships(
    query: ListTenantMembershipsQuery
  ): Promise<TenantMembershipRecord[]> {
    return this.repository.listByTenant(query);
  }
}
