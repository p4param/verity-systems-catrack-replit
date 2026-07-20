// VS08A: IPlatformApplicationPackageRepository contract
// Repository interface — persistence only, no business logic.

import type {
  PlatformApplicationPackageRecord,
  ListPackagesByApplicationQuery,
} from "../models/PlatformApplicationPackageModels";

export interface IPlatformApplicationPackageRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  /** Persists a new package record. Throws DuplicatePackageVersionError or PackageApplicationNotFoundError on constraint violations. */
  create(record: PlatformApplicationPackageRecord): Promise<void>;

  /** Transitions status to Published. Throws PackageConcurrencyError on version mismatch. */
  publish(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  /** Transitions status to Deprecated. Throws PackageConcurrencyError on version mismatch. */
  deprecate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  /** Transitions status to Archived. Throws PackageConcurrencyError on version mismatch. */
  archive(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  /** Returns the package with the given id, or null if not found or soft-deleted. */
  getById(id: string): Promise<PlatformApplicationPackageRecord | null>;

  /**
   * Returns the package for a given application and exact SemVer,
   * or null if not found or soft-deleted.
   */
  getByVersion(
    applicationId: string,
    packageVersion: string
  ): Promise<PlatformApplicationPackageRecord | null>;

  /**
   * Lists packages for an application.
   * If query.status is set, filters by status.
   * Never returns soft-deleted records unless query.includeDeleted is true.
   */
  listByApplication(
    query: ListPackagesByApplicationQuery
  ): Promise<PlatformApplicationPackageRecord[]>;

  /**
   * Returns true if a package with the given version already exists
   * for the given application (regardless of status or soft-delete state).
   */
  existsVersion(
    applicationId: string,
    packageVersion: string
  ): Promise<boolean>;
}
