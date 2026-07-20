// VS08A: IPlatformApplicationPackageService contract

import type {
  PlatformApplicationPackageRecord,
  CreatePackageCommand,
  PublishPackageCommand,
  DeprecatePackageCommand,
  ArchivePackageCommand,
  ListPackagesByApplicationQuery,
} from "../models/PlatformApplicationPackageModels";

export interface IPlatformApplicationPackageService {
  // ─── Writes ───────────────────────────────────────────────────────────────

  /** Validates, creates, and persists a new package in Draft status. */
  createPackage(
    command: CreatePackageCommand
  ): Promise<PlatformApplicationPackageRecord>;

  /** Transitions a Draft package to Published. */
  publishPackage(
    command: PublishPackageCommand
  ): Promise<PlatformApplicationPackageRecord>;

  /** Transitions a Published package to Deprecated. */
  deprecatePackage(
    command: DeprecatePackageCommand
  ): Promise<PlatformApplicationPackageRecord>;

  /** Transitions a Deprecated package to Archived. */
  archivePackage(
    command: ArchivePackageCommand
  ): Promise<PlatformApplicationPackageRecord>;

  // ─── Queries ──────────────────────────────────────────────────────────────

  /** Returns a package by id. Throws PackageNotFoundError if absent. */
  getById(id: string): Promise<PlatformApplicationPackageRecord>;

  /**
   * Returns a package by application and exact SemVer.
   * Throws PackageNotFoundError if absent.
   */
  getByVersion(
    applicationId: string,
    packageVersion: string
  ): Promise<PlatformApplicationPackageRecord>;

  /**
   * Lists packages for an application with optional status filter.
   * Never returns soft-deleted records.
   */
  listPackages(
    query: ListPackagesByApplicationQuery
  ): Promise<PlatformApplicationPackageRecord[]>;

  /**
   * Returns the package with the highest SemVer among all Published packages
   * for the given application.
   * SemVer comparison performed in the service layer per ADR-008-012.
   * Throws PackageNotFoundError if no Published package exists.
   */
  getLatestPublished(
    applicationId: string
  ): Promise<PlatformApplicationPackageRecord>;
}
