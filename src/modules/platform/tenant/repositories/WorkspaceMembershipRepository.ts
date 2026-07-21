// VS08A: WorkspaceMembershipRepository — Prisma implementation
// Persistence logic for the WorkspaceMembership aggregate.
// Write operations use $executeRaw for atomic optimistic concurrency enforcement.
// Read operations use Prisma ORM.

import { prisma } from "@/lib/prisma";
import type { IWorkspaceMembershipRepository } from "../contracts/IWorkspaceMembershipRepository";
import type {
  WorkspaceMembershipRecord,
  WorkspaceMembershipStatus,
  WorkspaceRole,
  ListWorkspaceMembersQuery,
} from "../models/WorkspaceMembershipModels";
import {
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipConcurrencyError,
} from "../domain/WorkspaceMembershipErrors";

function toRecord(row: {
  id: string;
  workspaceId: string;
  tenantMembershipId: string;
  workspaceRole: string;
  status: string;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): WorkspaceMembershipRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    tenantMembershipId: row.tenantMembershipId,
    workspaceRole: row.workspaceRole as WorkspaceRole,
    status: row.status as WorkspaceMembershipStatus,
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
  workspaceId: string,
  tenantMembershipId: string
): never {
  const e = error as {
    code?: string;
    meta?: { target?: string[] | string; constraint_name?: string };
    message?: string;
    cause?: { code?: string };
    errorCode?: string;
  };

  const msg = (e.message ?? "").toLowerCase();

  // ── Unique constraint violation (workspace_id, tenant_membership_id) ──
  if (e.code === "P2002") {
    throw new DuplicateWorkspaceMembershipError(workspaceId, tenantMembershipId);
  }

  const rawCode = e.cause?.code ?? e.errorCode;
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicateWorkspaceMembershipError(workspaceId, tenantMembershipId);
  }

  // ── FK constraint violations ──
  if (e.code === "P2003" || rawCode === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
    if (msg.includes("workspace") || msg.includes("tenant_workspaces")) {
      throw new WorkspaceMembershipWorkspaceNotFoundError(workspaceId);
    }
    if (msg.includes("tenant_membership") || msg.includes("tenant_memberships")) {
      throw new WorkspaceMembershipTenantMembershipNotFoundError(tenantMembershipId);
    }
    throw new WorkspaceMembershipWorkspaceNotFoundError(workspaceId);
  }

  throw error;
}

export class WorkspaceMembershipRepository implements IWorkspaceMembershipRepository {
  // ─── Writes ─────────────────────────────────────────────────────────────

  async invite(record: WorkspaceMembershipRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO workspace_memberships (
          id, workspace_id, tenant_membership_id, workspace_role, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.workspaceId}::uuid,
          ${record.tenantMembershipId}::uuid,
          ${record.workspaceRole},
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
      rethrowConstraintViolation(error, record.workspaceId, record.tenantMembershipId);
    }
  }

  async activate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships
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
      throw new WorkspaceMembershipConcurrencyError(id);
    }
  }

  async suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships
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
      throw new WorkspaceMembershipConcurrencyError(id);
    }
  }

  async remove(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships
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
      throw new WorkspaceMembershipConcurrencyError(id);
    }
  }

  async updateRole(
    id: string,
    workspaceRole: WorkspaceRole,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships
      SET
        workspace_role = ${workspaceRole},
        updated_at     = NOW(),
        updated_by     = ${actorUserId}::uuid,
        version        = version + 1
      WHERE
        id             = ${id}::uuid
        AND version        = ${expectedVersion}
        AND is_deleted     = false
    `;
    if (affected === 0) {
      throw new WorkspaceMembershipConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<WorkspaceMembershipRecord | null> {
    const row = await (prisma as any).workspaceMembership.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByWorkspaceAndTenantMembership(
    workspaceId: string,
    tenantMembershipId: string
  ): Promise<WorkspaceMembershipRecord | null> {
    const row = await (prisma as any).workspaceMembership.findFirst({
      where: {
        workspaceId,
        tenantMembershipId,
        isDeleted: false,
      },
    });
    return row ? toRecord(row) : null;
  }

  async listByWorkspace(
    query: ListWorkspaceMembersQuery
  ): Promise<WorkspaceMembershipRecord[]> {
    const where: Record<string, unknown> = {
      workspaceId: query.workspaceId,
    };
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }
    if (query.workspaceRole !== undefined) {
      where.workspaceRole = query.workspaceRole;
    }

    const rows = await (prisma as any).workspaceMembership.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsMembership(
    workspaceId: string,
    tenantMembershipId: string
  ): Promise<boolean> {
    const count = await (prisma as any).workspaceMembership.count({
      where: {
        workspaceId,
        tenantMembershipId,
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
