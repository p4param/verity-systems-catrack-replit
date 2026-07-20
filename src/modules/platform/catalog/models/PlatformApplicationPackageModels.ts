// VS08A: PlatformApplicationPackage models
// Domain types, record DTO, commands, and queries.
// packageVersion stores the SemVer 2.0.0 string (DB column: package_version).
// version stores the ES-001 optimistic concurrency counter (DB column: version).

// ─── Status ───────────────────────────────────────────────────────────────────

export type PlatformApplicationPackageStatus =
  | "Draft"
  | "Published"
  | "Deprecated"
  | "Archived";

export const PLATFORM_APPLICATION_PACKAGE_STATUS = {
  Draft: "Draft",
  Published: "Published",
  Deprecated: "Deprecated",
  Archived: "Archived",
} as const satisfies Record<string, PlatformApplicationPackageStatus>;

// ─── Record (DTO) ──────────────────────────────────────────────────────────────

/**
 * The flat data transfer object representing a persisted PlatformApplicationPackage.
 * Returned by repositories and services.
 *
 * packageVersion: SemVer 2.0.0 string (stored as DB column package_version).
 * version:        ES-001 optimistic concurrency counter (stored as DB column version).
 */
export interface PlatformApplicationPackageRecord {
  id: string;
  applicationId: string;
  packageVersion: string;
  displayName: string;
  description: string | null;
  releaseNotes: string | null;
  status: PlatformApplicationPackageStatus;
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

export interface CreatePackageCommand {
  applicationId: string;
  packageVersion: string;
  displayName: string;
  description?: string;
  releaseNotes?: string;
  actorUserId: string;
}

export interface PublishPackageCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface DeprecatePackageCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface ArchivePackageCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListPackagesByApplicationQuery {
  applicationId: string;
  status?: PlatformApplicationPackageStatus;
  includeDeleted?: boolean;
}
