// VS08A: ITenantWorkspaceRepository contract

import type {
  TenantWorkspaceRecord,
  ListWorkspacesQuery,
} from "../models/TenantWorkspaceModels";

export interface WorkspaceMetadataUpdate {
  displayName?: string;
  description?: string | null;
  timeZone?: string;
  culture?: string;
  currency?: string;
}

export interface ITenantWorkspaceRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  create(record: TenantWorkspaceRecord): Promise<void>;

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

  archive(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  updateMetadata(
    id: string,
    data: WorkspaceMetadataUpdate,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  getById(id: string): Promise<TenantWorkspaceRecord | null>;

  getByCode(
    tenantId: string,
    code: string
  ): Promise<TenantWorkspaceRecord | null>;

  listByTenant(
    query: ListWorkspacesQuery
  ): Promise<TenantWorkspaceRecord[]>;

  existsCode(tenantId: string, code: string): Promise<boolean>;

  existsName(tenantId: string, name: string): Promise<boolean>;
}
