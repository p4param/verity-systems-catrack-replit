// VS08A: IWorkspaceInstallationRepository contract

import type {
  WorkspaceInstallationRecord,
  ListWorkspaceInstallationsQuery,
} from "../models/WorkspaceInstallationModels";

export interface IWorkspaceInstallationRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  install(record: WorkspaceInstallationRecord): Promise<void>;

  completeInstallation(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  resume(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  uninstall(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  getById(id: string): Promise<WorkspaceInstallationRecord | null>;

  getByWorkspaceAndPackage(
    workspaceId: string,
    packageId: string
  ): Promise<WorkspaceInstallationRecord | null>;

  listByWorkspace(
    query: ListWorkspaceInstallationsQuery
  ): Promise<WorkspaceInstallationRecord[]>;

  existsInstallation(
    workspaceId: string,
    packageId: string
  ): Promise<boolean>;
}
