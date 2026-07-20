// VS08A: TenantService — application service
// Orchestrates command validation, uniqueness pre-checks, domain aggregate lifecycle enforcement, and repository interaction.

import type { ITenantRepository } from "../contracts/ITenantRepository";
import type { ITenantService } from "../contracts/ITenantService";
import type {
  TenantRecord,
  RegisterTenantCommand,
  ActivateTenantCommand,
  SuspendTenantCommand,
  ArchiveTenantCommand,
  UpdateTenantMetadataCommand,
  ListTenantsQuery,
} from "../models/TenantModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { Tenant } from "../domain/Tenant";
import { TenantLifecycle } from "../domain/TenantLifecycle";
import { TenantValidator } from "../domain/TenantValidator";
import {
  DuplicateTenantCodeError,
  DuplicateTenantNameError,
  TenantNotFoundError,
} from "../domain/TenantErrors";

export class TenantService implements ITenantService {
  constructor(private readonly repository: ITenantRepository) {}

  // ─── Register ────────────────────────────────────────────────────────────

  async registerTenant(
    command: RegisterTenantCommand
  ): Promise<TenantRecord> {
    // 1. Validate fields
    TenantValidator.validateRegisterCommand(command);

    // 2. Enforce code uniqueness
    const codeTrimmed = command.code.trim();
    if (await this.repository.existsCode(codeTrimmed)) {
      throw new DuplicateTenantCodeError(codeTrimmed);
    }

    // 3. Enforce name uniqueness
    const nameTrimmed = command.name.trim();
    if (await this.repository.existsName(nameTrimmed)) {
      throw new DuplicateTenantNameError(nameTrimmed);
    }

    // 4. Create aggregate (Provisioning status, version = 1n)
    const tenant = Tenant.create(command);

    // 5. Persist
    await this.repository.create(tenant.toRecord());

    return tenant.toRecord();
  }

  // ─── Activate ───────────────────────────────────────────────────────────

  async activateTenant(
    command: ActivateTenantCommand
  ): Promise<TenantRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new TenantNotFoundError(command.id);
    }

    TenantLifecycle.validateTransition(
      existing.status,
      TENANT_STATUS.Active
    );

    await this.repository.activate(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new TenantNotFoundError(command.id);
    return updated;
  }

  // ─── Suspend ────────────────────────────────────────────────────────────

  async suspendTenant(
    command: SuspendTenantCommand
  ): Promise<TenantRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new TenantNotFoundError(command.id);
    }

    TenantLifecycle.validateTransition(
      existing.status,
      TENANT_STATUS.Suspended
    );

    await this.repository.suspend(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new TenantNotFoundError(command.id);
    return updated;
  }

  // ─── Archive ────────────────────────────────────────────────────────────

  async archiveTenant(
    command: ArchiveTenantCommand
  ): Promise<TenantRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new TenantNotFoundError(command.id);
    }

    TenantLifecycle.validateTransition(
      existing.status,
      TENANT_STATUS.Archived
    );

    await this.repository.archive(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new TenantNotFoundError(command.id);
    return updated;
  }

  // ─── Update Metadata ────────────────────────────────────────────────────

  async updateTenantMetadata(
    command: UpdateTenantMetadataCommand
  ): Promise<TenantRecord> {
    TenantValidator.validateUpdateMetadataCommand(command);

    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new TenantNotFoundError(command.id);
    }

    const tenant = Tenant.reconstitute(existing);
    tenant.assertModifiable(); // Throws ArchivedTenantImmutableError if Archived

    await this.repository.updateMetadata(
      command.id,
      {
        displayName: command.displayName?.trim(),
        description: command.description !== undefined ? command.description?.trim() ?? null : undefined,
        logoUrl: command.logoUrl !== undefined ? command.logoUrl?.trim() ?? null : undefined,
        defaultTimeZone: command.defaultTimeZone?.trim(),
        defaultCulture: command.defaultCulture?.trim(),
        defaultCurrency: command.defaultCurrency?.trim(),
      },
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new TenantNotFoundError(command.id);
    return updated;
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  async getById(id: string): Promise<TenantRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new TenantNotFoundError(id);
    return record;
  }

  async getByCode(code: string): Promise<TenantRecord> {
    const record = await this.repository.getByCode(code);
    if (!record) throw new TenantNotFoundError(code);
    return record;
  }

  async listTenants(query: ListTenantsQuery = {}): Promise<TenantRecord[]> {
    return this.repository.list(query);
  }
}
