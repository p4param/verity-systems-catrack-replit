// VS08A: PlatformApplicationPackageService — application service
// Coordinates validation, lifecycle enforcement, and repository interaction.
// Contains no persistence details.
// getLatestPublished performs SemVer comparison in the service layer
// per ADR-008-012 ("Version comparison is performed by platform services").

import type { IPlatformApplicationPackageRepository } from "../contracts/IPlatformApplicationPackageRepository";
import type { IPlatformApplicationPackageService } from "../contracts/IPlatformApplicationPackageService";
import type {
  PlatformApplicationPackageRecord,
  CreatePackageCommand,
  PublishPackageCommand,
  DeprecatePackageCommand,
  ArchivePackageCommand,
  ListPackagesByApplicationQuery,
} from "../models/PlatformApplicationPackageModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../models/PlatformApplicationPackageModels";
import { PlatformApplicationPackage } from "../domain/PlatformApplicationPackage";
import { PlatformApplicationPackageLifecycle } from "../domain/PlatformApplicationPackageLifecycle";
import { PlatformApplicationPackageValidator } from "../domain/PlatformApplicationPackageValidator";
import {
  DuplicatePackageVersionError,
  PackageNotFoundError,
} from "../domain/PlatformApplicationPackageErrors";

// ─── SemVer Comparator ────────────────────────────────────────────────────────

/**
 * Compares two SemVer 2.0.0 version strings per the SemVer specification.
 * Returns a positive number if a > b, negative if a < b, 0 if equal.
 * Used by getLatestPublished per ADR-008-012.
 *
 * Rules:
 *   - Major, minor, patch compared numerically.
 *   - Build metadata (+...) is ignored in precedence.
 *   - Release > pre-release of same major.minor.patch (1.0.0 > 1.0.0-alpha).
 *   - Pre-release identifiers compared left to right; numeric < alphanumeric.
 */
function compareSemVer(a: string, b: string): number {
  const parse = (v: string) => {
    const withoutBuild = v.split("+")[0];
    const dashIdx = withoutBuild.indexOf("-");
    const mainPart =
      dashIdx === -1 ? withoutBuild : withoutBuild.slice(0, dashIdx);
    const preRelease =
      dashIdx === -1 ? null : withoutBuild.slice(dashIdx + 1);
    const parts = mainPart.split(".").map(Number);
    return { major: parts[0] ?? 0, minor: parts[1] ?? 0, patch: parts[2] ?? 0, preRelease };
  };

  const av = parse(a);
  const bv = parse(b);

  if (av.major !== bv.major) return av.major - bv.major;
  if (av.minor !== bv.minor) return av.minor - bv.minor;
  if (av.patch !== bv.patch) return av.patch - bv.patch;

  // Release > pre-release of same version
  if (av.preRelease === null && bv.preRelease !== null) return 1;
  if (av.preRelease !== null && bv.preRelease === null) return -1;

  if (av.preRelease !== null && bv.preRelease !== null) {
    const aIds = av.preRelease.split(".");
    const bIds = bv.preRelease.split(".");
    const len = Math.max(aIds.length, bIds.length);
    for (let i = 0; i < len; i++) {
      if (i >= aIds.length) return -1;
      if (i >= bIds.length) return 1;
      const aId = aIds[i]!;
      const bId = bIds[i]!;
      const aNum = /^\d+$/.test(aId) ? Number(aId) : NaN;
      const bNum = /^\d+$/.test(bId) ? Number(bId) : NaN;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else if (!isNaN(aNum)) {
        return -1; // numeric identifiers have lower precedence than alphanumeric
      } else if (!isNaN(bNum)) {
        return 1;
      } else {
        const cmp = aId.localeCompare(bId);
        if (cmp !== 0) return cmp;
      }
    }
  }

  return 0;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class PlatformApplicationPackageService
  implements IPlatformApplicationPackageService
{
  constructor(
    private readonly repository: IPlatformApplicationPackageRepository
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async createPackage(
    command: CreatePackageCommand
  ): Promise<PlatformApplicationPackageRecord> {
    // 1. Validate command fields
    PlatformApplicationPackageValidator.validateCreateCommand(command);

    // 2. Enforce version uniqueness per application (service-level pre-check)
    const trimmedVersion = command.packageVersion.trim();
    if (await this.repository.existsVersion(command.applicationId, trimmedVersion)) {
      throw new DuplicatePackageVersionError(command.applicationId, trimmedVersion);
    }

    // 3. Create aggregate (Draft status; version = 1n)
    const pkg = PlatformApplicationPackage.create(command);

    // 4. Persist — FK violation surfaces as PackageApplicationNotFoundError
    await this.repository.create(pkg.toRecord());

    return pkg.toRecord();
  }

  // ─── Publish ──────────────────────────────────────────────────────────────

  async publishPackage(
    command: PublishPackageCommand
  ): Promise<PlatformApplicationPackageRecord> {
    // 1. Load existing record
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new PackageNotFoundError(command.id);
    }

    // 2. Validate lifecycle transition (domain layer)
    PlatformApplicationPackageLifecycle.validateTransition(
      existing.status,
      PLATFORM_APPLICATION_PACKAGE_STATUS.Published
    );

    // 3. Persist with optimistic concurrency
    await this.repository.publish(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    // 4. Return fresh state
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new PackageNotFoundError(command.id);
    return updated;
  }

  // ─── Deprecate ────────────────────────────────────────────────────────────

  async deprecatePackage(
    command: DeprecatePackageCommand
  ): Promise<PlatformApplicationPackageRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new PackageNotFoundError(command.id);
    }

    PlatformApplicationPackageLifecycle.validateTransition(
      existing.status,
      PLATFORM_APPLICATION_PACKAGE_STATUS.Deprecated
    );

    await this.repository.deprecate(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new PackageNotFoundError(command.id);
    return updated;
  }

  // ─── Archive ──────────────────────────────────────────────────────────────

  async archivePackage(
    command: ArchivePackageCommand
  ): Promise<PlatformApplicationPackageRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new PackageNotFoundError(command.id);
    }

    PlatformApplicationPackageLifecycle.validateTransition(
      existing.status,
      PLATFORM_APPLICATION_PACKAGE_STATUS.Archived
    );

    await this.repository.archive(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    const updated = await this.repository.getById(command.id);
    if (!updated) throw new PackageNotFoundError(command.id);
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<PlatformApplicationPackageRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new PackageNotFoundError(id);
    return record;
  }

  async getByVersion(
    applicationId: string,
    packageVersion: string
  ): Promise<PlatformApplicationPackageRecord> {
    const record = await this.repository.getByVersion(applicationId, packageVersion);
    if (!record) throw new PackageNotFoundError(`${applicationId}@${packageVersion}`);
    return record;
  }

  async listPackages(
    query: ListPackagesByApplicationQuery
  ): Promise<PlatformApplicationPackageRecord[]> {
    return this.repository.listByApplication(query);
  }

  /**
   * Returns the package with the highest SemVer 2.0.0 among all Published
   * packages for the given application.
   *
   * Per ADR-008-012: "Version comparison and upgrade decisions are performed
   * by platform services using SemVer rules." The repository returns all
   * Published records; the service determines which is the latest.
   */
  async getLatestPublished(
    applicationId: string
  ): Promise<PlatformApplicationPackageRecord> {
    const published = await this.repository.listByApplication({
      applicationId,
      status: PLATFORM_APPLICATION_PACKAGE_STATUS.Published,
    });

    if (published.length === 0) {
      throw new PackageNotFoundError(
        `No published package found for application '${applicationId}'`
      );
    }

    // Sort descending by SemVer; first element is the highest version
    const sorted = [...published].sort((a, b) =>
      compareSemVer(b.packageVersion, a.packageVersion)
    );

    return sorted[0]!;
  }
}
