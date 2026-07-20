// VS08A: TenantWorkspaceService — application service
// Orchestrates command validation, tenant existence & config inheritance, uniqueness checks, lifecycle enforcement, and repository persistence.

import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantWorkspaceService } from "../contracts/ITenantWorkspaceService";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import type {
  TenantWorkspaceRecord,
  CreateWorkspaceCommand,
  ActivateWorkspaceCommand,
  SuspendWorkspaceCommand,
  ArchiveWorkspaceCommand,
  UpdateWorkspaceMetadataCommand,
  ListWorkspacesQuery,
} from "../models/TenantWorkspaceModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { TenantWorkspace } from "../domain/TenantWorkspace";
import { TenantWorkspaceLifecycle } from "../domain/TenantWorkspaceLifecycle";
import { TenantWorkspaceValidator } from "../domain/TenantWorkspaceValidator";
import {
  DuplicateWorkspaceCodeError,
  DuplicateWorkspaceNameError,
  WorkspaceNotFoundError,
  WorkspaceTenantNotFoundError,
} from "../domain/TenantWorkspaceErrors";

export class TenantWorkspaceService implements ITenantWorkspaceService {
  constructor(
    private readonly repository: ITenantWorkspaceRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  // ─── Create Workspace ─────────────────────────────────────────────────────

  async createWorkspace(
    command: CreateWorkspaceCommand
  ): Promise<TenantWorkspaceRecord> {
    // 1. Validate fields
    TenantWorkspaceValidator.validateCreateCommand(command);

    // 2. Enforce parent Tenant existence & fetch defaults (D3 / ADR-008-014)
    const parentTenant = await this.tenantRepository.getById(command.tenantId);
    if (!parentTenant) {
      throw new WorkspaceTenantNotFoundError(command.tenantId);
    }

    // 3. Enforce code uniqueness within owning Tenant
    const codeTrimmed = command.code.trim();
    if (await this.repository.existsCode(command.tenantId, codeTrimmed)) {
      throw new DuplicateWorkspaceCodeError(command.tenantId, codeTrimmed);
    }

    // 4. Enforce name uniqueness within owning Tenant
    const nameTrimmed = command.name.trim();
    if (await this.repository.existsName(command.tenantId, nameTrimmed)) {
      throw new DuplicateWorkspaceNameError(command.tenantId, nameTrimmed);
    }

    // 5. Create aggregate — inherits parent Tenant defaults if omitted (D3)
    const workspace = TenantWorkspace.create(command, {
      defaultTimeZone: parentTenant.defaultTimeZone,
      defaultCulture: parentTenant.defaultCulture,
      defaultCurrency: parentTenant.defaultCurrency,
    });

    // 6. Persist
    await this.repository.create(workspace.toRecord());

    return workspace.toRecord();
  }

  // ─── Activate Workspace ───────────────────────────────────────────────────

  async activateWorkspace(
    command: ActivateWorkspaceCommand
  ): Promise<TenantWorkspaceRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceNotFoundError(command.id);
    }

    TenantWorkspaceLifecycle.validateTransition(
      existing.status,
      TENANT_WORKSPACE_STATUS.Active
    );

    await this.repository.activate(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceNotFoundError(command.id);
    return updated;
  }

  // ─── Suspend Workspace ────────────────────────────────────────────────────

  async suspendWorkspace(
    command: SuspendWorkspaceCommand
  ): Promise<TenantWorkspaceRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceNotFoundError(command.id);
    }

    TenantWorkspaceLifecycle.validateTransition(
      existing.status,
      TENANT_WORKSPACE_STATUS.Suspended
    );

    await this.repository.suspend(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceNotFoundError(command.id);
    return updated;
  }

  // ─── Archive Workspace ────────────────────────────────────────────────────

  async archiveWorkspace(
    command: ArchiveWorkspaceCommand
  ): Promise<TenantWorkspaceRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceNotFoundError(command.id);
    }

    TenantWorkspaceLifecycle.validateTransition(
      existing.status,
      TENANT_WORKSPACE_STATUS.Archived
    );

    await this.repository.archive(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceNotFoundError(command.id);
    return updated;
  }

  // ─── Update Metadata ──────────────────────────────────────────────────────

  async updateWorkspaceMetadata(
    command: UpdateWorkspaceMetadataCommand
  ): Promise<TenantWorkspaceRecord> {
    TenantWorkspaceValidator.validateUpdateMetadataCommand(command);

    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new WorkspaceNotFoundError(command.id);
    }

    const workspace = TenantWorkspace.reconstitute(existing);
    workspace.assertModifiable(); // Throws ArchivedWorkspaceImmutableError if Archived

    await this.repository.updateMetadata(
      command.id,
      {
        displayName: command.displayName?.trim(),
        description: command.description !== undefined ? command.description?.trim() ?? null : undefined,
        timeZone: command.timeZone?.trim(),
        culture: command.culture?.trim(),
        currency: command.currency?.trim(),
      },
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceNotFoundError(command.id);
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getWorkspaceById(id: string): Promise<TenantWorkspaceRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new WorkspaceNotFoundError(id);
    return record;
  }

  async getWorkspaceByCode(
    tenantId: string,
    code: string
  ): Promise<TenantWorkspaceRecord> {
    const record = await this.repository.getByCode(tenantId, code);
    if (!record) throw new WorkspaceNotFoundError(`${tenantId}@${code}`);
    return record;
  }

  async listWorkspacesByTenant(
    query: ListWorkspacesQuery
  ): Promise<TenantWorkspaceRecord[]> {
    return this.repository.listByTenant(query);
  }
}
