// VS08A: PlatformApplicationRepository — Prisma implementation
// Contains persistence logic only. No business validation.
// Write operations (create, updateMetadata, retire) use $executeRaw for
// atomic optimistic concurrency enforcement.
// Read operations use Prisma ORM for type-safe filtering.

import { prisma } from "@/lib/prisma";
import type { IPlatformApplicationRepository } from "../contracts/IPlatformApplicationRepository";
import type {
  PlatformApplicationMetadataUpdate,
  PlatformApplicationRecord,
  PlatformApplicationStatus,
  ListPlatformApplicationsQuery,
  SearchPlatformApplicationsQuery,
} from "../models/PlatformApplicationModels";
import {
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  PlatformApplicationConcurrencyError,
} from "../domain/PlatformApplicationErrors";

// ─── Type helpers ─────────────────────────────────────────────────────────────

/**
 * Maps a Prisma ORM result (camelCase fields, handled by @map directives)
 * to the domain PlatformApplicationRecord type.
 */
function toRecord(row: {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  iconUrl: string | null;
  websiteUrl: string | null;
  status: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): PlatformApplicationRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    category: row.category,
    iconUrl: row.iconUrl,
    websiteUrl: row.websiteUrl,
    status: row.status as PlatformApplicationStatus,
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
 * Translates a Prisma unique constraint violation into the appropriate domain error.
 * Handles two shapes:
 *   1. PrismaClientKnownRequestError (code: "P2002") — from ORM or $executeRaw.
 *      meta.target may be a string[] of column names or a constraint name string.
 *   2. PrismaClientUnknownRequestError wrapping Postgres error code 23505 —
 *      the violation detail is embedded in the message string.
 */
function rethrowUniqueViolation(error: unknown, code: string, name: string): never {
  const e = error as {
    code?: string;
    meta?: { target?: string[] | string; constraint_name?: string };
    message?: string;
  };

  // Path 1: Standard Prisma P2002 (ORM layer or $executeRaw)
  if (e.code === "P2002") {
    const target = Array.isArray(e.meta?.target)
      ? e.meta.target.join(",")
      : String(e.meta?.target ?? e.meta?.constraint_name ?? "");
    if (target.includes("code")) throw new DuplicateApplicationCodeError(code);
    if (target.includes("name")) throw new DuplicateApplicationNameError(name);
    // Fallback: inspect message
    const msg = (e.message ?? "").toLowerCase();
    if (msg.includes("code")) throw new DuplicateApplicationCodeError(code);
    if (msg.includes("name")) throw new DuplicateApplicationNameError(name);
  }

  // Path 2: Raw Postgres 23505 unique_violation (surfaced by $executeRaw)
  // PostgreSQL includes "Key (column_name)=..." in the error detail.
  // We also check constraint names which contain "code" or "name" as identifiers.
  const rawCode = (e as any).cause?.code ?? (e as any).errorCode;
  const msg = (e.message ?? "").toLowerCase();
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    // Match 'key (code)' or constraint name containing '_code_'
    if (msg.includes("key (code)") || msg.includes("_code_unique") || msg.includes("_code)")) {
      throw new DuplicateApplicationCodeError(code);
    }
    // Match 'key (name)' or constraint name containing '_name_'
    if (msg.includes("key (name)") || msg.includes("_name_unique") || msg.includes("_name)")) {
      throw new DuplicateApplicationNameError(name);
    }
    // Fallback: default to code violation (conservative)
    throw new DuplicateApplicationCodeError(code);
  }


  throw error;
}


// ─── Repository ───────────────────────────────────────────────────────────────

export class PlatformApplicationRepository
  implements IPlatformApplicationRepository
{
  // ─── Writes ─────────────────────────────────────────────────────────────

  async create(record: PlatformApplicationRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO platform_applications (
          id, code, name, display_name, description, category,
          icon_url, website_url, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.code},
          ${record.name},
          ${record.displayName},
          ${record.description},
          ${record.category},
          ${record.iconUrl},
          ${record.websiteUrl},
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
      rethrowUniqueViolation(error, record.code, record.name);
    }
  }

  async updateMetadata(
    id: string,
    data: PlatformApplicationMetadataUpdate,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE platform_applications
      SET
        display_name = ${data.displayName},
        description  = ${data.description},
        category     = ${data.category},
        icon_url     = ${data.iconUrl},
        website_url  = ${data.websiteUrl},
        updated_at   = NOW(),
        updated_by   = ${actorUserId}::uuid,
        version      = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new PlatformApplicationConcurrencyError(id);
    }
  }

  async retire(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE platform_applications
      SET
        status     = 'Retired',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new PlatformApplicationConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<PlatformApplicationRecord | null> {
    const row = await (prisma as any).platformApplication.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByCode(code: string): Promise<PlatformApplicationRecord | null> {
    const row = await (prisma as any).platformApplication.findFirst({
      where: { code: code.trim(), isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async list(
    query: ListPlatformApplicationsQuery
  ): Promise<PlatformApplicationRecord[]> {
    const where: Record<string, unknown> = {};
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.category !== undefined) {
      where.category = query.category;
    }

    const rows = await (prisma as any).platformApplication.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return rows.map(toRecord);
  }

  async search(
    query: SearchPlatformApplicationsQuery
  ): Promise<PlatformApplicationRecord[]> {
    const term = query.query.trim();
    const where: Record<string, unknown> = {
      isDeleted: false,
      OR: [
        { code: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ],
    };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.category !== undefined) {
      where.category = query.category;
    }

    const rows = await (prisma as any).platformApplication.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await (prisma as any).platformApplication.count({
      where: { code: code.trim(), isDeleted: false },
    });
    return count > 0;
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await (prisma as any).platformApplication.count({
      where: {
        name: { equals: name.trim(), mode: "insensitive" },
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
