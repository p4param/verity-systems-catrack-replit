// VS08A: WorkspaceInstallationService — application service
// Orchestrates prerequisite validations, lifecycle transitions, and repository persistence.
//
// Future Rule (D3):
// Currently scoped per package (workspaceId, packageId). Future iterations will support
// "single active installation per application per workspace" to manage in-place version upgrades.

import type { IWorkspaceInstallationRepository } from "../contracts/IWorkspaceInstallationRepository";
import type { IWorkspaceInstallationService } from "../contracts/IWorkspaceInstallationService";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import type { IPlatformApplicationPackageRepository } from "../../catalog/contracts/IPlatformApplicationPackageRepository";
import type {
  WorkspaceInstallationRecord,
  InstallPackageCommand,
  CompleteInstallationCommand,
  SuspendInstallationCommand,
  ResumeInstallationCommand,
  UninstallInstallationCommand,
  ListWorkspaceInstallationsQuery,
} from "../models/WorkspaceInstallationModels";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../../catalog/models/PlatformApplicationPackageModels";
import { WorkspaceInstallation } from "../domain/WorkspaceInstallation";
import { WorkspaceInstallationLifecycle } from "../domain/WorkspaceInstallationLifecycle";
import { WorkspaceInstallationValidator } from "../domain/WorkspaceInstallationValidator";
import {
  InstallationNotFoundError,
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  InstallationPackageNotPublishedError,
  InstallationWorkspaceNotActiveError,
  InstallationTenantNotActiveError,
} from "../domain/WorkspaceInstallationErrors";

export class WorkspaceInstallationService implements IWorkspaceInstallationService {
  constructor(
    private readonly repository: IWorkspaceInstallationRepository,
    private readonly workspaceRepository: ITenantWorkspaceRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly packageRepository: IPlatformApplicationPackageRepository
  ) {}

  // ─── Install Package (Prerequisite Validation) ───────────────────────────

  async installPackage(
    command: InstallPackageCommand
  ): Promise<WorkspaceInstallationRecord> {
    // 1. Validate fields
    WorkspaceInstallationValidator.validateInstallCommand(command);

    const { workspaceId, packageId } = command;

    // 2. Validate PlatformApplicationPackage exists & is Published
    const pkg = await this.packageRepository.getById(packageId);
    if (!pkg) {
      throw new InstallationPackageNotFoundError(packageId);
    }
    if (pkg.status !== PLATFORM_APPLICATION_PACKAGE_STATUS.Published) {
      throw new InstallationPackageNotPublishedError(packageId, pkg.status);
    }

    // 3. Validate TenantWorkspace exists & is Active
    const workspace = await this.workspaceRepository.getById(workspaceId);
    if (!workspace) {
      throw new InstallationWorkspaceNotFoundError(workspaceId);
    }
    if (workspace.status !== TENANT_WORKSPACE_STATUS.Active) {
      throw new InstallationWorkspaceNotActiveError(workspaceId, workspace.status);
    }

    // 4. Validate owning Tenant exists & is Active (D4)
    const tenant = await this.tenantRepository.getById(workspace.tenantId);
    if (!tenant || tenant.status !== TENANT_STATUS.Active) {
      throw new InstallationTenantNotActiveError(
        workspace.tenantId,
        tenant ? tenant.status : "NotFound"
      );
    }

    // 5. Validate duplicate installation in workspace does not exist
    if (await this.repository.existsInstallation(workspaceId, packageId)) {
      throw new DuplicateWorkspaceInstallationError(workspaceId, packageId);
    }

    // 6. Create aggregate in Installing status (D1 / ADR-008-015)
    const installation = WorkspaceInstallation.create(command);

    // 7. Persist
    await this.repository.install(installation.toRecord());

    return installation.toRecord();
  }

  // ─── Complete Installation (Installing → Installed) ─────────────────────

  async completeInstallation(
    command: CompleteInstallationCommand
  ): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new InstallationNotFoundError(command.id);
    }

    WorkspaceInstallationLifecycle.validateTransition(
      existing.status,
      WORKSPACE_INSTALLATION_STATUS.Installed
    );

    await this.repository.completeInstallation(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  // ─── Suspend Installation (Installed → Suspended) ──────────────────────

  async suspendInstallation(
    command: SuspendInstallationCommand
  ): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new InstallationNotFoundError(command.id);
    }

    WorkspaceInstallationLifecycle.validateTransition(
      existing.status,
      WORKSPACE_INSTALLATION_STATUS.Suspended
    );

    await this.repository.suspend(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  // ─── Resume Installation (Suspended → Installed) ──────────────────────

  async resumeInstallation(
    command: ResumeInstallationCommand
  ): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new InstallationNotFoundError(command.id);
    }

    WorkspaceInstallationLifecycle.validateTransition(
      existing.status,
      WORKSPACE_INSTALLATION_STATUS.Installed
    );

    await this.repository.resume(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  // ─── Uninstall Package (Installed/Suspended → Uninstalled) ────────────

  async uninstallPackage(
    command: UninstallInstallationCommand
  ): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new InstallationNotFoundError(command.id);
    }

    WorkspaceInstallationLifecycle.validateTransition(
      existing.status,
      WORKSPACE_INSTALLATION_STATUS.Uninstalled
    );

    await this.repository.uninstall(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getInstallation(id: string): Promise<WorkspaceInstallationRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new InstallationNotFoundError(id);
    return record;
  }

  async getInstallationByPackage(
    workspaceId: string,
    packageId: string
  ): Promise<WorkspaceInstallationRecord> {
    const record = await this.repository.getByWorkspaceAndPackage(
      workspaceId,
      packageId
    );
    if (!record) {
      throw new InstallationNotFoundError(`${workspaceId}@${packageId}`);
    }
    return record;
  }

  async listWorkspaceInstallations(
    query: ListWorkspaceInstallationsQuery
  ): Promise<WorkspaceInstallationRecord[]> {
    return this.repository.listByWorkspace(query);
  }
}
