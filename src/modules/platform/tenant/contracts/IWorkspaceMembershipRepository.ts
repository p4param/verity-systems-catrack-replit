// VS08A: IWorkspaceMembershipRepository contract

import type {
  WorkspaceMembershipRecord,
  WorkspaceRole,
  ListWorkspaceMembersQuery,
} from "../models/WorkspaceMembershipModels";

export interface IWorkspaceMembershipRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  invite(record: WorkspaceMembershipRecord): Promise<void>;

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
    workspaceRole: WorkspaceRole,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  getById(id: string): Promise<WorkspaceMembershipRecord | null>;

  getByWorkspaceAndTenantMembership(
    workspaceId: string,
    tenantMembershipId: string
  ): Promise<WorkspaceMembershipRecord | null>;

  listByWorkspace(
    query: ListWorkspaceMembersQuery
  ): Promise<WorkspaceMembershipRecord[]>;

  existsMembership(
    workspaceId: string,
    tenantMembershipId: string
  ): Promise<boolean>;
}
