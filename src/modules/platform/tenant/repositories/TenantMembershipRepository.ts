// VS08A: TenantMembershipRepository — Prisma implementation
// Persistence logic for the TenantMembership aggregate.
// Write operations use $executeRaw for atomic optimistic concurrency enforcement (in-place status mutations per D2).
// Read operations use Prisma ORM.

import { prisma } from "@/lib/prisma";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type {
  TenantMembershipRecord,
  TenantMembershipStatus,
  TenantRole,
  ListTenantMembershipsQuery,
} from "../models/TenantMembershipModels";
import {
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipUserNotFoundError,
  TenantMembershipConcurrencyError,
} from "../domain/TenantMembershipErrors";

function toRecord(row: {
  id: string;
  tenantId: string;
  userId: string;
  tenantRole: string;
  status: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): TenantMembershipRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    tenantRole: row.tenantRole as TenantRole,
    status: row.status as TenantMembershipStatus,
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
  userId: string
): never {
  const e = error as {
    code?: string;
    meta?: { target?: string[] | string; constraint_name?: string };
    message?: string;
    cause?: { code?: string };
    errorCode?: string;
  };

  const msg = (e.message ?? "").toLowerCase();

  // ── Unique constraint violation (tenant_id, user_id) ──
  if (e.code === "P2002") {
    throw new DuplicateTenantMembershipError(tenantId, userId);
  }

  const rawCode = e.cause?.code ?? e.errorCode;
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicateTenantMembershipError(tenantId, userId);
  }

  // ── FK constraint violations ──
  if (e.code === "P2003" || rawCode === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
    if (msg.includes("tenant") || msg.includes("tenants")) {
      throw new MembershipTenantNotFoundError(tenantId);
    }
    if (msg.includes("user") || msg.includes("users")) {
      throw new MembershipUserNotFoundError(userId);
    }
    throw new MembershipTenantNotFoundError(tenantId);
  }

  throw error;
}

export class TenantMembershipRepository implements ITenantMembershipRepository {
  // ─── Writes ─────────────────────────────────────────────────────────────

  async invite(record: TenantMembershipRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO tenant_memberships (
          id, tenant_id, user_id, tenant_role, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.tenantId}::uuid,
          ${record.userId}::uuid,
          ${record.tenantRole},
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
      rethrowConstraintViolation(error, record.tenantId, record.userId);
    }
  }

  async activate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships
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
      throw new TenantMembershipConcurrencyError(id);
    }
  }

  async suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships
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
      throw new TenantMembershipConcurrencyError(id);
    }
  }

  async remove(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships
      SET
        status     = 'Removed',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new TenantMembershipConcurrencyError(id);
    }
  }

  async updateRole(
    id: string,
    tenantRole: TenantRole,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships
      SET
        tenant_role = ${tenantRole},
        updated_at  = NOW(),
        updated_by  = ${actorUserId}::uuid,
        version     = version + 1
      WHERE
        id          = ${id}::uuid
        AND version     = ${expectedVersion}
        AND is_deleted  = false
    `;
    if (affected === 0) {
      throw new TenantMembershipConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<TenantMembershipRecord | null> {
    const row = await (prisma as any).tenantMembership.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByUserAndTenant(
    tenantId: string,
    userId: string
  ): Promise<TenantMembershipRecord | null> {
    const row = await (prisma as any).tenantMembership.findFirst({
      where: {
        tenantId,
        userId,
        isDeleted: false,
      },
    });
    return row ? toRecord(row) : null;
  }

  async listByTenant(
    query: ListTenantMembershipsQuery
  ): Promise<TenantMembershipRecord[]> {
    const where: Record<string, unknown> = {
      tenantId: query.tenantId,
    };
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.tenantRole !== undefined) {
      where.tenantRole = query.tenantRole;
    }

    const rows = await (prisma as any).tenantMembership.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsMembership(tenantId: string, userId: string): Promise<boolean> {
    const count = await (prisma as any).tenantMembership.count({
      where: {
        tenantId,
        userId,
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
