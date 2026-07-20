// VS08A: ITenantWorkspaceService contract

import type {
  TenantWorkspaceRecord,
  CreateWorkspaceCommand,
  ActivateWorkspaceCommand,
  SuspendWorkspaceCommand,
  ArchiveWorkspaceCommand,
  UpdateWorkspaceMetadataCommand,
  ListWorkspacesQuery,
} from "../models/TenantWorkspaceModels";

export interface ITenantWorkspaceService {
  // ─── Writes ───────────────────────────────────────────────────────────────

  createWorkspace(
    command: CreateWorkspaceCommand
  ): Promise<TenantWorkspaceRecord>;

  activateWorkspace(
    command: ActivateWorkspaceCommand
  ): Promise<TenantWorkspaceRecord>;

  suspendWorkspace(
    command: SuspendWorkspaceCommand
  ): Promise<TenantWorkspaceRecord>;

  archiveWorkspace(
    command: ArchiveWorkspaceCommand
  ): Promise<TenantWorkspaceRecord>;

  updateWorkspaceMetadata(
    command: UpdateWorkspaceMetadataCommand
  ): Promise<TenantWorkspaceRecord>;

  // ─── Queries ──────────────────────────────────────────────────────────────

  getWorkspaceById(id: string): Promise<TenantWorkspaceRecord>;

  getWorkspaceByCode(
    tenantId: string,
    code: string
  ): Promise<TenantWorkspaceRecord>;

  listWorkspacesByTenant(
    query: ListWorkspacesQuery
  ): Promise<TenantWorkspaceRecord[]>;
}
