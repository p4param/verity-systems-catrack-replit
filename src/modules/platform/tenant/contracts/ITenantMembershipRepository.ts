// VS08A: ITenantMembershipRepository contract

import type {
  TenantMembershipRecord,
  TenantRole,
  ListTenantMembershipsQuery,
} from "../models/TenantMembershipModels";

export interface ITenantMembershipRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  invite(record: TenantMembershipRecord): Promise<void>;

  activate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  remove(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  updateRole(
    id: string,
    tenantRole: TenantRole,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  getById(id: string): Promise<TenantMembershipRecord | null>;

  getByUserAndTenant(
    tenantId: string,
    userId: string
  ): Promise<TenantMembershipRecord | null>;

  listByTenant(
    query: ListTenantMembershipsQuery
  ): Promise<TenantMembershipRecord[]>;

  existsMembership(tenantId: string, userId: string): Promise<boolean>;
}
