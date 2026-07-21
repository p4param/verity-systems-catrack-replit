// VS08A: ITenantMembershipService contract

import type {
  TenantMembershipRecord,
  InviteUserCommand,
  ActivateMembershipCommand,
  SuspendMembershipCommand,
  RemoveMembershipCommand,
  UpdateTenantRoleCommand,
  ListTenantMembershipsQuery,
} from "../models/TenantMembershipModels";

export interface ITenantMembershipService {
  // ─── Writes ───────────────────────────────────────────────────────────────

  inviteUser(command: InviteUserCommand): Promise<TenantMembershipRecord>;

  activateMembership(
    command: ActivateMembershipCommand
  ): Promise<TenantMembershipRecord>;

  suspendMembership(
    command: SuspendMembershipCommand
  ): Promise<TenantMembershipRecord>;

  removeMembership(
    command: RemoveMembershipCommand
  ): Promise<TenantMembershipRecord>;

  updateTenantRole(
    command: UpdateTenantRoleCommand
  ): Promise<TenantMembershipRecord>;

  // ─── Queries ──────────────────────────────────────────────────────────────

  getMembershipById(id: string): Promise<TenantMembershipRecord>;

  getMembershipByUser(
    tenantId: string,
    userId: string
  ): Promise<TenantMembershipRecord>;

  listTenantMemberships(
    query: ListTenantMembershipsQuery
  ): Promise<TenantMembershipRecord[]>;
}
