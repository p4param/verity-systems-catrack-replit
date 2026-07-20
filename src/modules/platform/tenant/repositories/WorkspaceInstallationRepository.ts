// VS08A: WorkspaceInstallationRepository — Prisma implementation
// Persistence logic for the WorkspaceInstallation aggregate.
// Write operations use $executeRaw for atomic optimistic concurrency enforcement.
// Read operations use Prisma ORM.

import { prisma } from "@/lib/prisma";
import type { IWorkspaceInstallationRepository } from "../contracts/IWorkspaceInstallationRepository";
import type {
  WorkspaceInstallationRecord,
  WorkspaceInstallationStatus,
  ListWorkspaceInstallationsQuery,
} from "../models/WorkspaceInstallationModels";
import {
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  WorkspaceInstallationConcurrencyError,
} from "../domain/WorkspaceInstallationErrors";

function toRecord(row: {
  id: string;
  workspaceId: string;
  packageId: string;
  status: string;
  installedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}): WorkspaceInstallationRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    packageId: row.packageId,
    status: row.status as WorkspaceInstallationStatus,
    installedAt: row.installedAt,
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
  packageId: string
): never {
  const e = error as {
    code?: string;
    meta?: { target?: string[] | string; constraint_name?: string };
    message?: string;
    cause?: { code?: string };
    errorCode?: string;
  };

  const msg = (e.message ?? "").toLowerCase();

  // ── Unique constraint violation (workspace_id, application_package_id) ──
  if (e.code === "P2002") {
    throw new DuplicateWorkspaceInstallationError(workspaceId, packageId);
  }

  const rawCode = e.cause?.code ?? e.errorCode;
  if (rawCode === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicateWorkspaceInstallationError(workspaceId, packageId);
  }

  // ── FK constraint violations ──
  if (e.code === "P2003" || rawCode === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
    if (msg.includes("workspace") || msg.includes("tenant_workspaces")) {
      throw new InstallationWorkspaceNotFoundError(workspaceId);
    }
    if (msg.includes("package") || msg.includes("platform_application_packages")) {
      throw new InstallationPackageNotFoundError(packageId);
    }
    throw new InstallationWorkspaceNotFoundError(workspaceId);
  }

  throw error;
}

export class WorkspaceInstallationRepository
  implements IWorkspaceInstallationRepository
{
  // ─── Writes ─────────────────────────────────────────────────────────────

  async install(record: WorkspaceInstallationRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO workspace_installations (
          id, workspace_id, application_package_id, status, installed_at,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid,
          ${record.workspaceId}::uuid,
          ${record.packageId}::uuid,
          ${record.status},
          ${record.installedAt},
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
      rethrowConstraintViolation(error, record.workspaceId, record.packageId);
    }
  }

  async completeInstallation(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations
      SET
        status       = 'Installed',
        installed_at = COALESCE(installed_at, NOW()),
        updated_at   = NOW(),
        updated_by   = ${actorUserId}::uuid,
        version      = version + 1
      WHERE
        id           = ${id}::uuid
        AND version      = ${expectedVersion}
        AND is_deleted   = false
    `;
    if (affected === 0) {
      throw new WorkspaceInstallationConcurrencyError(id);
    }
  }

  async suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations
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
      throw new WorkspaceInstallationConcurrencyError(id);
    }
  }

  async resume(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations
      SET
        status     = 'Installed',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new WorkspaceInstallationConcurrencyError(id);
    }
  }

  async uninstall(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations
      SET
        status     = 'Uninstalled',
        updated_at = NOW(),
        updated_by = ${actorUserId}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;
    if (affected === 0) {
      throw new WorkspaceInstallationConcurrencyError(id);
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<WorkspaceInstallationRecord | null> {
    const row = await (prisma as any).workspaceInstallation.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async getByWorkspaceAndPackage(
    workspaceId: string,
    packageId: string
  ): Promise<WorkspaceInstallationRecord | null> {
    const row = await (prisma as any).workspaceInstallation.findFirst({
      where: {
        workspaceId,
        packageId,
        isDeleted: false,
      },
    });
    return row ? toRecord(row) : null;
  }

  async listByWorkspace(
    query: ListWorkspaceInstallationsQuery
  ): Promise<WorkspaceInstallationRecord[]> {
    const where: Record<string, unknown> = {
      workspaceId: query.workspaceId,
    };
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    const rows = await (prisma as any).workspaceInstallation.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async existsInstallation(
    workspaceId: string,
    packageId: string
  ): Promise<boolean> {
    const count = await (prisma as any).workspaceInstallation.count({
      where: {
        workspaceId,
        packageId,
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
