// VS08A: ITenantService contract

import type {
  TenantRecord,
  RegisterTenantCommand,
  ActivateTenantCommand,
  SuspendTenantCommand,
  ArchiveTenantCommand,
  UpdateTenantMetadataCommand,
  ListTenantsQuery,
} from "../models/TenantModels";

export interface ITenantService {
  // ─── Writes ───────────────────────────────────────────────────────────────

  registerTenant(command: RegisterTenantCommand): Promise<TenantRecord>;

  activateTenant(command: ActivateTenantCommand): Promise<TenantRecord>;

  suspendTenant(command: SuspendTenantCommand): Promise<TenantRecord>;

  archiveTenant(command: ArchiveTenantCommand): Promise<TenantRecord>;

  updateTenantMetadata(
    command: UpdateTenantMetadataCommand
  ): Promise<TenantRecord>;

  // ─── Queries ──────────────────────────────────────────────────────────────

  getById(id: string): Promise<TenantRecord>;

  getByCode(code: string): Promise<TenantRecord>;

  listTenants(query?: ListTenantsQuery): Promise<TenantRecord[]>;
}
