// VS08A: TenantRepository — Prisma implementation
// Persistence logic for the Tenant aggregate.
// Write operations use $executeRaw for atomic optimistic concurrency enforcement.
// Read operations use Prisma ORM.

import { prisma } from "@/lib/prisma";
import type { ITenantRepository, TenantMetadataUpdate } from "../contracts/ITenantRepository";
import type {
  TenantRecord,
  TenantStatus,
  ListTenantsQuery,
} from "../models/TenantModels";
import {
  DuplicateTenantCodeError,
  DuplicateTenantNameError,
  TenantConcurrencyError,
} from "../domain/TenantErrors";

function toRecord(row: {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  defaultTimeZone: string;
  defaultCulture: string;
  defaultCurrency: string;
  status: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): TenantRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    logoUrl: row.logoUrl,
    defaultTimeZone: row.defaultTimeZone,
    defaultCulture: row.defaultCulture,
    defaultCurrency: row.defaultCurrency,
    status: row.status as TenantStatus,
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

function rethrowConstraintViolation(
  error: unknown,
  code: string,
  name: string
): never {
  const e = error as {
    code?: string;
    meta?: { target?: string[] | string; constraint_name?: string };
    message?: string;
    cause?: { code?: string };
    errorCode?: string;
  };

  const msg = (e.message ?? "").toLowerCase();

  if (e.code === "P2002") {
    const target = JSON.stringify(e.meta?.target ?? "").toLowerCase();
    if (target.includes("code")) throw new DuplicateTenantCodeError(code);
    if (target.includes("name")) throw new DuplicateTenantNameError(name);
    // fallback
    throw new DuplicateTenantCodeError(code);
  }

  const rawCode = e.cause?.code ?? e.errorCode;
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    if (msg.includes("tenants_code") || msg.includes("code")) {
      throw new DuplicateTenantCodeError(code);
    }
    if (msg.includes("tenants_name") || msg.includes("name")) {
      throw new DuplicateTenantNameError(name);
    }
    throw new DuplicateTenantCodeError(code);
  }

  throw error;
}

export class TenantRepository implements ITenantRepository {
  // ─── Writes ─────────────────────────────────────────────────────────────

  async create(record: TenantRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO tenants (
          id, code, name, display_name, description, logo_url,
          default_time_zone, default_culture, default_currency,
          status, created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.code},
          ${record.name},
          ${record.displayName},
          ${record.description},
          ${record.logoUrl},
          ${record.defaultTimeZone},
          ${record.defaultCulture},
          ${record.defaultCurrency},
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
      rethrowConstraintViolation(error, record.code, record.name);
    }
  }

  async activate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenants
      SET
        status     = 'Active',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new TenantConcurrencyError(id);
    }
  }

  async suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenants
      SET
        status     = 'Suspended',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new TenantConcurrencyError(id);
    }
  }

  async archive(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenants
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
      throw new TenantConcurrencyError(id);
    }
  }

  async updateMetadata(
    id: string,
    data: TenantMetadataUpdate,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    // Dynamic update building with optimistic concurrency
    const setClauses: string[] = ["updated_at = NOW()", `updated_by = '${actorUserId}'::uuid`, "version = version + 1"];

    if (data.displayName !== undefined) {
      setClauses.push(`display_name = ${JSON.stringify(data.displayName)}`);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = ${data.description ? JSON.stringify(data.description) : "NULL"}`);
    }
    if (data.logoUrl !== undefined) {
      setClauses.push(`logo_url = ${data.logoUrl ? JSON.stringify(data.logoUrl) : "NULL"}`);
    }
    if (data.defaultTimeZone !== undefined) {
      setClauses.push(`default_time_zone = ${JSON.stringify(data.defaultTimeZone)}`);
    }
    if (data.defaultCulture !== undefined) {
      setClauses.push(`default_culture = ${JSON.stringify(data.defaultCulture)}`);
    }
    if (data.defaultCurrency !== undefined) {
      setClauses.push(`default_currency = ${JSON.stringify(data.defaultCurrency)}`);
    }

    const affected = await prisma.$executeRaw`
      UPDATE tenants
      SET
        display_name      = COALESCE(${data.displayName ?? null}, display_name),
        description       = CASE WHEN ${data.description !== undefined} THEN ${data.description ?? null} ELSE description END,
        logo_url          = CASE WHEN ${data.logoUrl !== undefined} THEN ${data.logoUrl ?? null} ELSE logo_url END,
        default_time_zone = COALESCE(${data.defaultTimeZone ?? null}, default_time_zone),
        default_culture   = COALESCE(${data.defaultCulture ?? null}, default_culture),
        default_currency  = COALESCE(${data.defaultCurrency ?? null}, default_currency),
        updated_at        = NOW(),
        updated_by        = ${actorUserId}::uuid,
        version           = version + 1
      WHERE
        id                = ${id}::uuid
        AND version           = ${expectedVersion}
        AND is_deleted        = false
    `;
    if (affected === 0) {
      throw new TenantConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<TenantRecord | null> {
    const row = await (prisma as any).tenant.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByCode(code: string): Promise<TenantRecord | null> {
    const row = await (prisma as any).tenant.findFirst({
      where: { code: code.trim(), isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async list(query: ListTenantsQuery): Promise<TenantRecord[]> {
    const where: Record<string, unknown> = {};
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    const rows = await (prisma as any).tenant.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsCode(code: string): Promise<boolean> {
    const count = await (prisma as any).tenant.count({
      where: { code: code.trim(), isDeleted: false },
    });
    return count > 0;
  }

  async existsName(name: string): Promise<boolean> {
    const count = await (prisma as any).tenant.count({
      where: {
        name: { equals: name.trim(), mode: "insensitive" },
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
