// VS08A: PlatformApplicationPackageRepository — Prisma implementation
// Contains persistence logic only. No business validation.
// Write operations (create, publish, deprecate, archive) use $executeRaw for
// atomic optimistic concurrency enforcement.
// Read operations use Prisma ORM for type-safe filtering.

import { prisma } from "@/lib/prisma";
import type { IPlatformApplicationPackageRepository } from "../contracts/IPlatformApplicationPackageRepository";
import type {
  PlatformApplicationPackageRecord,
  PlatformApplicationPackageStatus,
  ListPackagesByApplicationQuery,
} from "../models/PlatformApplicationPackageModels";
import {
  DuplicatePackageVersionError,
  PackageApplicationNotFoundError,
  PackageConcurrencyError,
} from "../domain/PlatformApplicationPackageErrors";

// ─── Type helpers ─────────────────────────────────────────────────────────────

/**
 * Maps a Prisma ORM result to the domain PlatformApplicationPackageRecord type.
 * The Prisma model uses camelCase field names (via @map directives).
 */
function toRecord(row: {
  id: string;
  applicationId: string;
  semVer: string;
  displayName: string;
  description: string | null;
  releaseNotes: string | null;
  status: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): PlatformApplicationPackageRecord {
  return {
    id: row.id,
    applicationId: row.applicationId,
    packageVersion: row.semVer,      // Prisma field: semVer; domain field: packageVersion
    displayName: row.displayName,
    description: row.description,
    releaseNotes: row.releaseNotes,
    status: row.status as PlatformApplicationPackageStatus,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt,
    deletedBy: row.deletedBy,
    version: row.version,
  };
}

/**
 * Translates a Prisma/PostgreSQL constraint violation into the appropriate
 * domain error. Handles:
 *   - P2002 / 23505 unique violation on (application_id, package_version)
 *   - 23503 FK violation on application_id
 */
function rethrowConstraintViolation(
  error: unknown,
  applicationId: string,
  packageVersion: string
): never {
  const e = error as {
    code?: string;
    meta?: { target?: string[] | string; constraint_name?: string };
    message?: string;
    cause?: { code?: string };
    errorCode?: string;
  };

  const msg = (e.message ?? "").toLowerCase();

  // ── Path 1: Prisma P2002 unique violation ─────────────────────────────────
  if (e.code === "P2002") {
    // (application_id, package_version) composite unique — always a duplicate version error
    throw new DuplicatePackageVersionError(applicationId, packageVersion);
  }

  // ── Path 2: Raw PostgreSQL 23505 unique_violation ──────────────────────────
  const rawCode = e.cause?.code ?? e.errorCode;
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicatePackageVersionError(applicationId, packageVersion);
  }

  // ── Path 3: PostgreSQL 23503 FK violation (application_id not found) ───────
  if (rawCode === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
    throw new PackageApplicationNotFoundError(applicationId);
  }

  // Prisma P2003 FK violation
  if (e.code === "P2003") {
    throw new PackageApplicationNotFoundError(applicationId);
  }

  throw error;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PlatformApplicationPackageRepository
  implements IPlatformApplicationPackageRepository
{
  // ─── Writes ─────────────────────────────────────────────────────────────

  async create(record: PlatformApplicationPackageRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO platform_application_packages (
          id, application_id, package_version, display_name,
          description, release_notes, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.applicationId}::uuid,
          ${record.packageVersion},
          ${record.displayName},
          ${record.description},
          ${record.releaseNotes},
          ${record.status},
          ${record.createdAt},
          ${record.createdBy}::uuid,
          ${record.updatedAt},
          ${record.updatedBy}::uuid,
          ${record.isDeleted},
          ${record.deletedAt},
          ${record.deletedBy}::uuid,
          ${record.version}
        )
      `;
    } catch (error) {
      rethrowConstraintViolation(error, record.applicationId, record.packageVersion);
    }
  }

  async publish(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE platform_application_packages
      SET
        status     = 'Published',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new PackageConcurrencyError(id);
    }
  }

  async deprecate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE platform_application_packages
      SET
        status     = 'Deprecated',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new PackageConcurrencyError(id);
    }
  }

  async archive(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE platform_application_packages
      SET
        status     = 'Archived',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new PackageConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(
    id: string
  ): Promise<PlatformApplicationPackageRecord | null> {
    const row = await (prisma as any).platformApplicationPackage.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByVersion(
    applicationId: string,
    packageVersion: string
  ): Promise<PlatformApplicationPackageRecord | null> {
    const row = await (prisma as any).platformApplicationPackage.findFirst({
      where: {
        applicationId,
        semVer: packageVersion.trim(),
        isDeleted: false,
      },
    });
    return row ? toRecord(row) : null;
  }

  async listByApplication(
    query: ListPackagesByApplicationQuery
  ): Promise<PlatformApplicationPackageRecord[]> {
    const where: Record<string, unknown> = {
      applicationId: query.applicationId,
    };
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    const rows = await (prisma as any).platformApplicationPackage.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsVersion(
    applicationId: string,
    packageVersion: string
  ): Promise<boolean> {
    const count = await (prisma as any).platformApplicationPackage.count({
      where: {
        applicationId,
        semVer: packageVersion.trim(),
      },
    });
    return count > 0;
  }
}
