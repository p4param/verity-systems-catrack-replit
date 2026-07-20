// VS08A: TenantWorkspaceRepository — Prisma implementation
// Persistence logic for the TenantWorkspace aggregate.
// Write operations use $executeRaw for atomic optimistic concurrency enforcement.
// Read operations use Prisma ORM.

import { prisma } from "@/lib/prisma";
import type {
  ITenantWorkspaceRepository,
  WorkspaceMetadataUpdate,
} from "../contracts/ITenantWorkspaceRepository";
import type {
  TenantWorkspaceRecord,
  TenantWorkspaceStatus,
  ListWorkspacesQuery,
} from "../models/TenantWorkspaceModels";
import {
  DuplicateWorkspaceCodeError,
  DuplicateWorkspaceNameError,
  WorkspaceTenantNotFoundError,
  WorkspaceConcurrencyError,
} from "../domain/TenantWorkspaceErrors";

function toRecord(row: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  timeZone: string;
  culture: string;
  currency: string;
  status: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): TenantWorkspaceRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    timeZone: row.timeZone,
    culture: row.culture,
    currency: row.currency,
    status: row.status as TenantWorkspaceStatus,
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
  tenantId: string,
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

  // ── Unique constraint violations (code, name per tenant) ──
  if (e.code === "P2002") {
    const target = JSON.stringify(e.meta?.target ?? "").toLowerCase();
    if (target.includes("code")) throw new DuplicateWorkspaceCodeError(tenantId, code);
    if (target.includes("name")) throw new DuplicateWorkspaceNameError(tenantId, name);
    throw new DuplicateWorkspaceCodeError(tenantId, code);
  }

  const rawCode = e.cause?.code ?? e.errorCode;
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    if (msg.includes("code")) throw new DuplicateWorkspaceCodeError(tenantId, code);
    if (msg.includes("name")) throw new DuplicateWorkspaceNameError(tenantId, name);
    throw new DuplicateWorkspaceCodeError(tenantId, code);
  }

  // ── FK constraint violations (owning tenant missing) ──
  if (e.code === "P2003" || rawCode === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
    throw new WorkspaceTenantNotFoundError(tenantId);
  }

  throw error;
}

export class TenantWorkspaceRepository implements ITenantWorkspaceRepository {
  // ─── Writes ─────────────────────────────────────────────────────────────

  async create(record: TenantWorkspaceRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO tenant_workspaces (
          id, tenant_id, code, name, display_name, description,
          time_zone, culture, currency, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.tenantId}::uuid,
          ${record.code},
          ${record.name},
          ${record.displayName},
          ${record.description},
          ${record.timeZone},
          ${record.culture},
          ${record.currency},
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
      rethrowConstraintViolation(error, record.tenantId, record.code, record.name);
    }
  }

  async activate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_workspaces
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
      throw new WorkspaceConcurrencyError(id);
    }
  }

  async suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_workspaces
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
      throw new WorkspaceConcurrencyError(id);
    }
  }

  async archive(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_workspaces
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
      throw new WorkspaceConcurrencyError(id);
    }
  }

  async updateMetadata(
    id: string,
    data: WorkspaceMetadataUpdate,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_workspaces
      SET
        display_name = COALESCE(${data.displayName ?? null}, display_name),
        description  = CASE WHEN ${data.description !== undefined} THEN ${data.description ?? null} ELSE description END,
        time_zone    = COALESCE(${data.timeZone ?? null}, time_zone),
        culture      = COALESCE(${data.culture ?? null}, culture),
        currency     = COALESCE(${data.currency ?? null}, currency),
        updated_at   = NOW(),
        updated_by   = ${actorUserId}::uuid,
        version      = version + 1
      WHERE
        id           = ${id}::uuid
        AND version      = ${expectedVersion}
        AND is_deleted   = false
    `;
    if (affected === 0) {
      throw new WorkspaceConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<TenantWorkspaceRecord | null> {
    const row = await (prisma as any).tenantWorkspace.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByCode(
    tenantId: string,
    code: string
  ): Promise<TenantWorkspaceRecord | null> {
    const row = await (prisma as any).tenantWorkspace.findFirst({
      where: {
        tenantId,
        code: code.trim(),
        isDeleted: false,
      },
    });
    return row ? toRecord(row) : null;
  }

  async listByTenant(
    query: ListWorkspacesQuery
  ): Promise<TenantWorkspaceRecord[]> {
    const where: Record<string, unknown> = {
      tenantId: query.tenantId,
    };
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    const rows = await (prisma as any).tenantWorkspace.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsCode(tenantId: string, code: string): Promise<boolean> {
    const count = await (prisma as any).tenantWorkspace.count({
      where: {
        tenantId,
        code: code.trim(),
        isDeleted: false,
      },
    });
    return count > 0;
  }

  async existsName(tenantId: string, name: string): Promise<boolean> {
    const count = await (prisma as any).tenantWorkspace.count({
      where: {
        tenantId,
        name: { equals: name.trim(), mode: "insensitive" },
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
