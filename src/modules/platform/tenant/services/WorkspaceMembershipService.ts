// VS08A: WorkspaceMembershipService — application service
// Orchestrates prerequisite validations, role updates, lifecycle state transitions, and repository persistence.
//
// Security Invariant (D1): Same-tenant validation enforces workspace.tenantId === tenantMembership.tenantId.
// Suspended Guard (D2): Non-Active TenantMemberships cannot create or activate WorkspaceMemberships.
// Deferred Permissions (D3): Permission evaluation derives from WorkspaceRole in VS08B (no embedded ACLs).

import type { IWorkspaceMembershipRepository } from "../contracts/IWorkspaceMembershipRepository";
import type { IWorkspaceMembershipService } from "../contracts/IWorkspaceMembershipService";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type {
  WorkspaceMembershipRecord,
  InviteToWorkspaceCommand,
  ActivateWorkspaceMembershipCommand,
  SuspendWorkspaceMembershipCommand,
  RemoveWorkspaceMembershipCommand,
  UpdateWorkspaceRoleCommand,
  ListWorkspaceMembersQuery,
} from "../models/WorkspaceMembershipModels";
import { WORKSPACE_MEMBERSHIP_STATUS } from "../models/WorkspaceMembershipModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { TENANT_MEMBERSHIP_STATUS } from "../models/TenantMembershipModels";
import { WorkspaceMembership } from "../domain/WorkspaceMembership";
import { WorkspaceMembershipLifecycle } from "../domain/WorkspaceMembershipLifecycle";
import { WorkspaceMembershipValidator } from "../domain/WorkspaceMembershipValidator";
import {
  WorkspaceMembershipNotFoundError,
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipWorkspaceNotActiveError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipTenantMembershipNotActiveError,
  WorkspaceMembershipTenantMismatchError,
} from "../domain/WorkspaceMembershipErrors";

export class WorkspaceMembershipService implements IWorkspaceMembershipService {
  constructor(
    private readonly repository: IWorkspaceMembershipRepository,
    private readonly workspaceRepository: ITenantWorkspaceRepository,
    private readonly tenantMembershipRepository: ITenantMembershipRepository
  ) {}

  // ─── Invite to Workspace (Prerequisite Validation) ─────────────────────────

  async inviteToWorkspace(
    command: InviteToWorkspaceCommand
  ): Promise<WorkspaceMembershipRecord> {
    // 1. Validate fields
    WorkspaceMembershipValidator.validateInviteCommand(command);

    const { workspaceId, tenantMembershipId } = command;

    // 2. Validate TenantWorkspace exists & is Active
    const workspace = await this.workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new WorkspaceMembershipWorkspaceNotFoundError(workspaceId);
    }
    if (workspace.status !== TENANT_WORKSPACE_STATUS.Active) {
      throw new WorkspaceMembershipWorkspaceNotActiveError(
        workspaceId,
        workspace.status
      );
    }

    // 3. Validate TenantMembership exists & is Active (D2)
    const tenantMembership = await this.tenantMembershipRepository.getById(
      tenantMembershipId
    );
    if (!tenantMembership) {
      throw new WorkspaceMembershipTenantMembershipNotFoundError(
        tenantMembershipId
      );
    }
    if (tenantMembership.status !== TENANT_MEMBERSHIP_STATUS.Active) {
      throw new WorkspaceMembershipTenantMembershipNotActiveError(
        tenantMembershipId,
        tenantMembership.status
      );
    }

    // 4. CRITICAL SECURITY INVARIANT (D1): Same-Tenant Validation
    if (workspace.tenantId !== tenantMembership.tenantId) {
      throw new WorkspaceMembershipTenantMismatchError(
        workspace.tenantId,
        tenantMembership.tenantId
      );
    }

    // 5. Validate duplicate membership in workspace does not exist
    if (
      await this.repository.existsMembership(
        workspaceId,
        tenantMembershipId
      )
    ) {
      throw new DuplicateWorkspaceMembershipError(
        workspaceId,
        tenantMembershipId
      );
    }

    // 6. Create aggregate in Invited status
    const membership = WorkspaceMembership.invite(command);

    // 7. Persist
    await this.repository.invite(membership.toRecord());

    return membership.toRecord();
  }

  // ─── Activate Membership (Invited/Suspended → Active) ─────────────────────

  async activateMembership(
    command: ActivateWorkspaceMembershipCommand
  ): Promise<WorkspaceMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceMembershipNotFoundError(command.id);
    }

    // Validate TenantMembership prerequisite is STILL Active (D2)
    const tenantMembership = await this.tenantMembershipRepository.getById(
      existing.tenantMembershipId
    );
    if (!tenantMembership || tenantMembership.status !== TENANT_MEMBERSHIP_STATUS.Active) {
      throw new WorkspaceMembershipTenantMembershipNotActiveError(
        existing.tenantMembershipId,
        tenantMembership?.status ?? "Missing"
      );
    }

    WorkspaceMembershipLifecycle.validateTransition(
      existing.status,
      WORKSPACE_MEMBERSHIP_STATUS.Active
    );

    await this.repository.activate(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Suspend Membership (Active → Suspended) ─────────────────────────────

  async suspendMembership(
    command: SuspendWorkspaceMembershipCommand
  ): Promise<WorkspaceMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceMembershipNotFoundError(command.id);
    }

    WorkspaceMembershipLifecycle.validateTransition(
      existing.status,
      WORKSPACE_MEMBERSHIP_STATUS.Suspended
    );

    await this.repository.suspend(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Remove Membership (Active/Suspended → Removed) ──────────────────────

  async removeMembership(
    command: RemoveWorkspaceMembershipCommand
  ): Promise<WorkspaceMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceMembershipNotFoundError(command.id);
    }

    WorkspaceMembershipLifecycle.validateTransition(
      existing.status,
      WORKSPACE_MEMBERSHIP_STATUS.Removed
    );

    await this.repository.remove(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Update Workspace Role ────────────────────────────────────────────────

  async updateWorkspaceRole(
    command: UpdateWorkspaceRoleCommand
  ): Promise<WorkspaceMembershipRecord> {
    WorkspaceMembershipValidator.validateUpdateRoleCommand(command);

    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceMembershipNotFoundError(command.id);
    }

    const membership = WorkspaceMembership.reconstitute(existing);
    membership.assertModifiable(); // Throws RemovedWorkspaceMembershipImmutableError if Removed

    await this.repository.updateRole(
      command.id,
      command.workspaceRole,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getMembershipById(id: string): Promise<WorkspaceMembershipRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new WorkspaceMembershipNotFoundError(id);
    return record;
  }

  async getMembershipByWorkspace(
    workspaceId: string,
    tenantMembershipId: string
  ): Promise<WorkspaceMembershipRecord> {
    const record = await this.repository.getByWorkspaceAndTenantMembership(
      workspaceId,
      tenantMembershipId
    );
    if (!record) {
      throw new WorkspaceMembershipNotFoundError(
        `${workspaceId}@${tenantMembershipId}`
      );
    }
    return record;
  }

  async listWorkspaceMembers(
    query: ListWorkspaceMembersQuery
  ): Promise<WorkspaceMembershipRecord[]> {
    return this.repository.listByWorkspace(query);
  }
}
