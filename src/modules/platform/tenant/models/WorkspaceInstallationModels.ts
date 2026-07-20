// VS08A: WorkspaceInstallation models
// Domain types, record DTO, commands, and queries for WorkspaceInstallation.

// ─── Status ───────────────────────────────────────────────────────────────────

export type WorkspaceInstallationStatus =
  | "Installing"
  | "Installed"
  | "Suspended"
  | "Uninstalled";

export const WORKSPACE_INSTALLATION_STATUS = {
  Installing: "Installing",
  Installed: "Installed",
  Suspended: "Suspended",
  Uninstalled: "Uninstalled",
} as const satisfies Record<string, WorkspaceInstallationStatus>;

// ─── Record (DTO) ──────────────────────────────────────────────────────────────

/**
 * Flat data transfer object representing a persisted WorkspaceInstallation record.
 * Includes business timestamp `installedAt` (populated when status becomes `Installed`).
 */
export interface WorkspaceInstallationRecord {
  id: string;
  workspaceId: string;
  packageId: string;
  status: WorkspaceInstallationStatus;
  installedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}

// ─── Commands ──────────────────────────────────────────────────────────────────

/**
 * Creates a WorkspaceInstallation in `Installing` status (D1 / ADR-008-015).
 */
export interface InstallPackageCommand {
  workspaceId: string;
  packageId: string;
  actorUserId: string;
}

/**
 * Transitions a WorkspaceInstallation from `Installing` to `Installed` status,
 * populating the business timestamp `installedAt` (D1 / D2).
 */
export interface CompleteInstallationCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface SuspendInstallationCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface ResumeInstallationCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface UninstallInstallationCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListWorkspaceInstallationsQuery {
  workspaceId: string;
  status?: WorkspaceInstallationStatus;
  includeDeleted?: boolean;
}
