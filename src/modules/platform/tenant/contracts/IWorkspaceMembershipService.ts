// VS08A: IWorkspaceMembershipService contract

import type {
  WorkspaceMembershipRecord,
  InviteToWorkspaceCommand,
  ActivateWorkspaceMembershipCommand,
  SuspendWorkspaceMembershipCommand,
  RemoveWorkspaceMembershipCommand,
  UpdateWorkspaceRoleCommand,
  ListWorkspaceMembersQuery,
} from "../models/WorkspaceMembershipModels";

export interface IWorkspaceMembershipService {
  // ─── Writes ───────────────────────────────────────────────────────────────

  inviteToWorkspace(
    command: InviteToWorkspaceCommand
  ): Promise<WorkspaceMembershipRecord>;

  activateMembership(
    command: ActivateWorkspaceMembershipCommand
  ): Promise<WorkspaceMembershipRecord>;

  suspendMembership(
    command: SuspendWorkspaceMembershipCommand
  ): Promise<WorkspaceMembershipRecord>;

  removeMembership(
    command: RemoveWorkspaceMembershipCommand
  ): Promise<WorkspaceMembershipRecord>;

  updateWorkspaceRole(
    command: UpdateWorkspaceRoleCommand
  ): Promise<WorkspaceMembershipRecord>;

  // ─── Queries ──────────────────────────────────────────────────────────────

  getMembershipById(id: string): Promise<WorkspaceMembershipRecord>;

  getMembershipByWorkspace(
    workspaceId: string,
    tenantMembershipId: string
  ): Promise<WorkspaceMembershipRecord>;

  listWorkspaceMembers(
    query: ListWorkspaceMembersQuery
  ): Promise<WorkspaceMembershipRecord[]>;
}
