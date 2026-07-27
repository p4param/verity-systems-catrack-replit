# RP-007 — Implementation Review Package
## EWP-007: WorkspaceMembership Aggregate
### Engine: VS08 – License, Subscription & Tenant Management Engine  
### Milestone: VS08A – Tenant Foundation (Final Work Package)

**Prepared:** 2026-07-21  
**Status:** Submitted for Implementation Review  
**Certification Candidate:** `src/modules/platform/tenant/`

---

## 1. Summary

EWP-007 implements the **WorkspaceMembership** aggregate — establishing operational participation within a specific `TenantWorkspace` for a user who possesses an active `TenantMembership`.

A `WorkspaceMembership` connects a `TenantMembership` (organizational affiliation) to a `TenantWorkspace` (operational boundary) with a specific `workspaceRole` (`'WorkspaceAdmin'`, `'Contributor'`, `'Viewer'`, `'Guest'`).

### Scope (this work package only)
- Same-Tenant Security Invariant (D1): Service layer strictly enforces that `TenantWorkspace.tenantId` matches `TenantMembership.tenantId` (`WorkspaceMembershipTenantMismatchError`). Integration test explicitly proves cross-tenant workspace access attempts are rejected.
- Suspended TenantMembership Restriction (D2): Service validates that target `TenantMembership` status is `Active`. Integration test proves a `Suspended` `TenantMembership` cannot create or activate a `WorkspaceMembership` (`WorkspaceMembershipTenantMembershipNotActiveError`).
- Deferred Permission Evaluation (D3): Permission evaluation will derive dynamically from `WorkspaceRole` (and workspace policy engines in VS08B), rather than embedding permission flags or ACL lists inside the `WorkspaceMembership` aggregate itself.
- Mandatory Prerequisite Validation (Service Layer):
  1. Target `TenantWorkspace` exists & status is `Active`.
  2. Target `TenantMembership` exists & status is `Active`.
  3. Same-Tenant check: `workspace.tenantId === tenantMembership.tenantId`.
  4. Membership is not duplicated for the same `(workspace_id, tenant_membership_id)` pair.
- Membership Lifecycle (CC-007): `Invited` → `Active` ↔ `Suspended` → `Removed` (strict transition validation; `Removed` is a terminal state).
- Optimistic concurrency via `version BIGINT` on all write operations (`invite`, `activate`, `suspend`, `remove`, `updateRole`).
- Full ES-001 audit trail (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`, `version`).

### Explicitly Out of Scope
Authentication, Tenant membership, Licensing, Billing, Runtime authorization, Permission evaluation, Feature flags.

### Governing Documents Satisfied
ES-001 · ES-008 · ES-009 · ES-010 · DDS-101A · CC-007 · EWP-007 · ADR-008-001 through ADR-008-017

---

## 2. Git Diff

### Key Modified Files

```diff
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -104,2 +104,3 @@ model TenantWorkspace {
+  workspaceMemberships WorkspaceMembership[]

@@ -140,2 +141,3 @@ model TenantMembership {
+  workspaceMemberships WorkspaceMembership[]

+model WorkspaceMembership {
+  id                 String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
+  workspaceId        String           @db.Uuid @map("workspace_id")
+  tenantMembershipId String           @db.Uuid @map("tenant_membership_id")
+  workspaceRole      String           @default("Contributor") @map("workspace_role")
+  status             String           @default("Invited") @map("status")
+  createdAt          DateTime         @default(now()) @map("created_at")
+  createdBy          String?          @db.Uuid @map("created_by")
+  updatedAt          DateTime         @updatedAt @map("updated_at")
+  updatedBy          String?          @db.Uuid @map("updated_by")
+  isDeleted          Boolean          @default(false) @map("is_deleted")
+  deletedAt          DateTime?        @map("deleted_at")
+  deletedBy          String?          @db.Uuid @map("deleted_by")
+  version            BigInt           @default(1) @map("version")
+
+  workspace          TenantWorkspace  @relation(fields: [workspaceId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+  tenantMembership   TenantMembership @relation(fields: [tenantMembershipId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@unique([workspaceId, tenantMembershipId], map: "workspace_memberships_workspace_tenant_mem_unique")
+  @@index([workspaceId], map: "idx_workspace_memberships_workspace_id")
+  @@index([tenantMembershipId], map: "idx_workspace_memberships_tenant_mem_id")
+  @@index([status], map: "idx_workspace_memberships_status")
+  @@index([isDeleted], map: "idx_workspace_memberships_is_deleted")
+  @@map("workspace_memberships")
+}
```

```diff
--- a/src/lib/prisma.ts
+++ b/src/lib/prisma.ts
@@ -8,3 +8,3 @@
-// VS08A EWP-006: Updated to check for tenantMembership (most recent model).
-if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).tenantMembership) {
+// VS08A EWP-007: Updated to check for workspaceMembership (most recent model).
+if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).workspaceMembership) {
```

---

## 3. File Manifest

### Production Files Added for EWP-007 (`src/modules/platform/tenant/`)

| File | Role | Lines | Bytes |
|---|---|---|---|
| `models/WorkspaceMembershipModels.ts` | DTOs, commands, queries, role & status constants | 100 | 3,417 |
| `domain/WorkspaceMembershipErrors.ts` | 12 Domain error classes | 137 | 4,847 |
| `domain/WorkspaceMembershipLifecycle.ts` | State machine & immutability guard (ADR-008-017) | 62 | 2,296 |
| `domain/WorkspaceMembershipValidator.ts` | UUID & role field validator | 78 | 2,905 |
| `domain/WorkspaceMembership.ts` | Aggregate root & invite factory | 133 | 4,563 |
| `contracts/IWorkspaceMembershipRepository.ts` | Repository contract interface | 56 | 1,577 |
| `contracts/IWorkspaceMembershipService.ts` | Service contract interface | 48 | 1,645 |
| `repositories/WorkspaceMembershipRepository.ts` | Raw SQL write repository with in-place updates | 271 | 8,209 |
| `services/WorkspaceMembershipService.ts` | Application service & same-tenant validation | 257 | 9,321 |
| **New Production subtotal** | | **1,142 lines** | **38,780 bytes** |

### Test Files Added for EWP-007 (`src/modules/platform/tenant/tests/`)

| File | Type | Tests | Lines | Bytes |
|---|---|---|---|---|
| `WorkspaceMembership.domain.test.ts` | Unit | 12 | 181 | 6,081 |
| `WorkspaceMembershipLifecycle.test.ts` | Unit | 17 | 119 | 4,536 |
| `WorkspaceMembershipRepository.test.ts` | Unit (mocked) | 15 | 194 | 6,856 |
| `WorkspaceMembershipService.test.ts` | Unit | 19 | 415 | 14,573 |
| `integration/WorkspaceMembershipRepository.integration.test.ts` | Integration (live DB) | 10 | 424 | 15,575 |
| **New Test subtotal** | | **73 tests** | **1,333 lines** | **47,621 bytes** |

### Database Files

| File | Description | Lines | Bytes |
|---|---|---|---|
| `prisma/migrations/20260721110000_vs08a_workspace_membership/migration.sql` | DDL for `workspace_memberships` table | 53 | 2,465 |

---

## 4. Prisma Diff

```prisma
// Back-relation on TenantWorkspace model
workspaceMemberships WorkspaceMembership[]

// Back-relation on TenantMembership model
workspaceMemberships WorkspaceMembership[]

// New WorkspaceMembership model
model WorkspaceMembership {
  id                 String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId        String           @db.Uuid @map("workspace_id")
  tenantMembershipId String           @db.Uuid @map("tenant_membership_id")
  workspaceRole      String           @default("Contributor") @map("workspace_role")
  status             String           @default("Invited") @map("status")
  createdAt          DateTime         @default(now()) @map("created_at")
  createdBy          String?          @db.Uuid @map("created_by")
  updatedAt          DateTime         @updatedAt @map("updated_at")
  updatedBy          String?          @db.Uuid @map("updated_by")
  isDeleted          Boolean          @default(false) @map("is_deleted")
  deletedAt          DateTime?        @map("deleted_at")
  deletedBy          String?          @db.Uuid @map("deleted_by")
  version            BigInt           @default(1) @map("version")

  workspace          TenantWorkspace  @relation(fields: [workspaceId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  tenantMembership   TenantMembership @relation(fields: [tenantMembershipId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([workspaceId, tenantMembershipId], map: "workspace_memberships_workspace_tenant_mem_unique")
  @@index([workspaceId], map: "idx_workspace_memberships_workspace_id")
  @@index([tenantMembershipId], map: "idx_workspace_memberships_tenant_mem_id")
  @@index([status], map: "idx_workspace_memberships_status")
  @@index([isDeleted], map: "idx_workspace_memberships_is_deleted")
  @@map("workspace_memberships")
}
```

---

## 5. Migration SQL

```sql
-- VS08A: WorkspaceMembership aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-017 (Workspace Membership Model — operational access boundary)
--             ES-009 (WorkspaceMembership belongs to 1 workspace and 1 tenant membership)
--             ES-010 (table: workspace_memberships)

CREATE TABLE workspace_memberships (
  -- Identity & Associations
  id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
  workspace_id          UUID          NOT NULL,
  tenant_membership_id  UUID          NOT NULL,

  -- Role within Workspace: WorkspaceAdmin | Contributor | Viewer | Guest
  workspace_role        VARCHAR(50)   NOT NULL DEFAULT 'Contributor',

  -- Lifecycle: Invited | Active | Suspended | Removed
  status                VARCHAR(50)   NOT NULL DEFAULT 'Invited',

  -- ES-001: Mandatory audit columns
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by            UUID,
  is_deleted            BOOLEAN       NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID,

  -- ES-001: Optimistic concurrency counter
  version               BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT workspace_memberships_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions (ES-001 / CC-007)
  CONSTRAINT workspace_memberships_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES tenant_workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT workspace_memberships_tenant_membership_fk
    FOREIGN KEY (tenant_membership_id) REFERENCES tenant_memberships(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- Only one active workspace membership per (workspace_id, tenant_membership_id)
  CONSTRAINT workspace_memberships_workspace_tenant_mem_unique
    UNIQUE (workspace_id, tenant_membership_id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_workspace_memberships_workspace_id ON workspace_memberships (workspace_id);
CREATE INDEX idx_workspace_memberships_tenant_mem_id ON workspace_memberships (tenant_membership_id);
CREATE INDEX idx_workspace_memberships_status ON workspace_memberships (status);
CREATE INDEX idx_workspace_memberships_is_deleted ON workspace_memberships (is_deleted);
```

---

## 6. Aggregate Root

```typescript
// src/modules/platform/tenant/domain/WorkspaceMembership.ts

import { randomUUID } from "crypto";
import type {
  WorkspaceMembershipRecord,
  WorkspaceMembershipStatus,
  WorkspaceRole,
  InviteToWorkspaceCommand,
} from "../models/WorkspaceMembershipModels";
import { WORKSPACE_MEMBERSHIP_STATUS, WORKSPACE_ROLE } from "../models/WorkspaceMembershipModels";
import { WorkspaceMembershipLifecycle } from "./WorkspaceMembershipLifecycle";
import { RemovedWorkspaceMembershipImmutableError } from "./WorkspaceMembershipErrors";

export class WorkspaceMembership {
  private constructor(private readonly _record: WorkspaceMembershipRecord) {}

  get id(): string { return this._record.id; }
  get workspaceId(): string { return this._record.workspaceId; }
  get tenantMembershipId(): string { return this._record.tenantMembershipId; }
  get workspaceRole(): WorkspaceRole { return this._record.workspaceRole; }
  get status(): WorkspaceMembershipStatus { return this._record.status; }
  get createdAt(): Date { return this._record.createdAt; }
  get createdBy(): string | null { return this._record.createdBy; }
  get updatedAt(): Date { return this._record.updatedAt; }
  get updatedBy(): string | null { return this._record.updatedBy; }
  get isDeleted(): boolean { return this._record.isDeleted; }
  get deletedAt(): Date | null { return this._record.deletedAt; }
  get deletedBy(): string | null { return this._record.deletedBy; }
  get version(): bigint { return this._record.version; }

  static invite(command: InviteToWorkspaceCommand): WorkspaceMembership {
    const now = new Date();
    const record: WorkspaceMembershipRecord = {
      id: randomUUID(),
      workspaceId: command.workspaceId.trim(),
      tenantMembershipId: command.tenantMembershipId.trim(),
      workspaceRole: command.workspaceRole ?? WORKSPACE_ROLE.Contributor,
      status: WORKSPACE_MEMBERSHIP_STATUS.Invited,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new WorkspaceMembership(record);
  }

  static reconstitute(record: WorkspaceMembershipRecord): WorkspaceMembership {
    return new WorkspaceMembership({ ...record });
  }

  assertModifiable(): void {
    if (WorkspaceMembershipLifecycle.isImmutable(this._record.status)) {
      throw new RemovedWorkspaceMembershipImmutableError(this._record.id);
    }
  }

  toRecord(): WorkspaceMembershipRecord {
    return { ...this._record };
  }
}
```

---

## 7. Repository

```typescript
// src/modules/platform/tenant/repositories/WorkspaceMembershipRepository.ts

import { prisma } from "@/lib/prisma";
import type { IWorkspaceMembershipRepository } from "../contracts/IWorkspaceMembershipRepository";
import type { WorkspaceMembershipRecord, WorkspaceMembershipStatus, WorkspaceRole, ListWorkspaceMembersQuery } from "../models/WorkspaceMembershipModels";
import {
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipConcurrencyError,
} from "../domain/WorkspaceMembershipErrors";

function toRecord(row: any): WorkspaceMembershipRecord {
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

function rethrowConstraintViolation(error: unknown, workspaceId: string, tenantMembershipId: string): never {
  const e = error as any;
  const msg = (e.message ?? "").toLowerCase();

  if (e.code === "P2002" || e.cause?.code === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicateWorkspaceMembershipError(workspaceId, tenantMembershipId);
  }

  if (e.code === "P2003" || e.cause?.code === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
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
  async invite(record: WorkspaceMembershipRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO workspace_memberships (
          id, workspace_id, tenant_membership_id, workspace_role, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid, ${record.workspaceId}::uuid, ${record.tenantMembershipId}::uuid, ${record.workspaceRole}, ${record.status},
          ${record.createdAt}, ${record.createdBy}::uuid, ${record.updatedAt}, ${record.updatedBy}::uuid,
          ${record.isDeleted}, ${record.deletedAt}, ${record.deletedBy}::uuid, ${record.version}
        )
      `;
    } catch (error) {
      rethrowConstraintViolation(error, record.workspaceId, record.tenantMembershipId);
    }
  }

  async activate(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships SET status = 'Active', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceMembershipConcurrencyError(id);
  }

  async suspend(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships SET status = 'Suspended', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceMembershipConcurrencyError(id);
  }

  async remove(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships SET status = 'Removed', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceMembershipConcurrencyError(id);
  }

  async updateRole(id: string, workspaceRole: WorkspaceRole, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_memberships SET workspace_role = ${workspaceRole}, updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceMembershipConcurrencyError(id);
  }

  async getById(id: string): Promise<WorkspaceMembershipRecord | null> {
    const row = await (prisma as any).workspaceMembership.findFirst({ where: { id, isDeleted: false } });
    return row ? toRecord(row) : null;
  }

  async getByWorkspaceAndTenantMembership(workspaceId: string, tenantMembershipId: string): Promise<WorkspaceMembershipRecord | null> {
    const row = await (prisma as any).workspaceMembership.findFirst({
      where: { workspaceId, tenantMembershipId, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async listByWorkspace(query: ListWorkspaceMembersQuery): Promise<WorkspaceMembershipRecord[]> {
    const where: any = { workspaceId: query.workspaceId };
    if (!query.includeDeleted) where.isDeleted = false;
    if (query.status !== undefined) where.status = query.status;
    if (query.workspaceRole !== undefined) where.workspaceRole = query.workspaceRole;
    const rows = await (prisma as any).workspaceMembership.findMany({ where, orderBy: { createdAt: "asc" } });
    return rows.map(toRecord);
  }

  async existsMembership(workspaceId: string, tenantMembershipId: string): Promise<boolean> {
    const count = await (prisma as any).workspaceMembership.count({
      where: { workspaceId, tenantMembershipId, isDeleted: false },
    });
    return count > 0;
  }
}
```

---

## 8. Service

```typescript
// src/modules/platform/tenant/services/WorkspaceMembershipService.ts

import type { IWorkspaceMembershipRepository } from "../contracts/IWorkspaceMembershipRepository";
import type { IWorkspaceMembershipService } from "../contracts/IWorkspaceMembershipService";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type {
  WorkspaceMembershipRecord,
  InviteToWorkspaceCommand,
  ActivateWorkspaceMembershipCommand,
  SuspendWorkspaceMembershipCommand,
  RemoveWorkspaceMembershipCommand,
  UpdateWorkspaceRoleCommand,
  ListWorkspaceMembersQuery,
} from "../models/WorkspaceMembershipModels";
import { WORKSPACE_MEMBERSHIP_STATUS } from "../models/WorkspaceMembershipModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { TENANT_MEMBERSHIP_STATUS } from "../models/TenantMembershipModels";
import { WorkspaceMembership } from "../domain/WorkspaceMembership";
import { WorkspaceMembershipLifecycle } from "../domain/WorkspaceMembershipLifecycle";
import { WorkspaceMembershipValidator } from "../domain/WorkspaceMembershipValidator";
import {
  WorkspaceMembershipNotFoundError,
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipWorkspaceNotActiveError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipTenantMembershipNotActiveError,
  WorkspaceMembershipTenantMismatchError,
} from "../domain/WorkspaceMembershipErrors";

export class WorkspaceMembershipService implements IWorkspaceMembershipService {
  constructor(
    private readonly repository: IWorkspaceMembershipRepository,
    private readonly workspaceRepository: ITenantWorkspaceRepository,
    private readonly tenantMembershipRepository: ITenantMembershipRepository
  ) {}

  async inviteToWorkspace(command: InviteToWorkspaceCommand): Promise<WorkspaceMembershipRecord> {
    WorkspaceMembershipValidator.validateInviteCommand(command);
    const { workspaceId, tenantMembershipId } = command;

    const workspace = await this.workspaceRepository.getById(workspaceId);
    if (!workspace) throw new WorkspaceMembershipWorkspaceNotFoundError(workspaceId);
    if (workspace.status !== TENANT_WORKSPACE_STATUS.Active) {
      throw new WorkspaceMembershipWorkspaceNotActiveError(workspaceId, workspace.status);
    }

    const tenantMembership = await this.tenantMembershipRepository.getById(tenantMembershipId);
    if (!tenantMembership) throw new WorkspaceMembershipTenantMembershipNotFoundError(tenantMembershipId);
    if (tenantMembership.status !== TENANT_MEMBERSHIP_STATUS.Active) {
      throw new WorkspaceMembershipTenantMembershipNotActiveError(tenantMembershipId, tenantMembership.status);
    }

    // CRITICAL SECURITY INVARIANT (D1): Same-Tenant Validation
    if (workspace.tenantId !== tenantMembership.tenantId) {
      throw new WorkspaceMembershipTenantMismatchError(workspace.tenantId, tenantMembership.tenantId);
    }

    if (await this.repository.existsMembership(workspaceId, tenantMembershipId)) {
      throw new DuplicateWorkspaceMembershipError(workspaceId, tenantMembershipId);
    }

    const membership = WorkspaceMembership.invite(command);
    await this.repository.invite(membership.toRecord());
    return membership.toRecord();
  }

  async activateMembership(command: ActivateWorkspaceMembershipCommand): Promise<WorkspaceMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new WorkspaceMembershipNotFoundError(command.id);

    const tenantMembership = await this.tenantMembershipRepository.getById(existing.tenantMembershipId);
    if (!tenantMembership || tenantMembership.status !== TENANT_MEMBERSHIP_STATUS.Active) {
      throw new WorkspaceMembershipTenantMembershipNotActiveError(existing.tenantMembershipId, tenantMembership?.status ?? "Missing");
    }

    WorkspaceMembershipLifecycle.validateTransition(existing.status, WORKSPACE_MEMBERSHIP_STATUS.Active);
    await this.repository.activate(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  async suspendMembership(command: SuspendWorkspaceMembershipCommand): Promise<WorkspaceMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new WorkspaceMembershipNotFoundError(command.id);
    WorkspaceMembershipLifecycle.validateTransition(existing.status, WORKSPACE_MEMBERSHIP_STATUS.Suspended);
    await this.repository.suspend(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  async removeMembership(command: RemoveWorkspaceMembershipCommand): Promise<WorkspaceMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new WorkspaceMembershipNotFoundError(command.id);
    WorkspaceMembershipLifecycle.validateTransition(existing.status, WORKSPACE_MEMBERSHIP_STATUS.Removed);
    await this.repository.remove(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  async updateWorkspaceRole(command: UpdateWorkspaceRoleCommand): Promise<WorkspaceMembershipRecord> {
    WorkspaceMembershipValidator.validateUpdateRoleCommand(command);
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new WorkspaceMembershipNotFoundError(command.id);
    const membership = WorkspaceMembership.reconstitute(existing);
    membership.assertModifiable();

    await this.repository.updateRole(command.id, command.workspaceRole, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new WorkspaceMembershipNotFoundError(command.id);
    return updated;
  }

  async getMembershipById(id: string): Promise<WorkspaceMembershipRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new WorkspaceMembershipNotFoundError(id);
    return record;
  }

  async getMembershipByWorkspace(workspaceId: string, tenantMembershipId: string): Promise<WorkspaceMembershipRecord> {
    const record = await this.repository.getByWorkspaceAndTenantMembership(workspaceId, tenantMembershipId);
    if (!record) throw new WorkspaceMembershipNotFoundError(`${workspaceId}@${tenantMembershipId}`);
    return record;
  }

  async listWorkspaceMembers(query: ListWorkspaceMembersQuery): Promise<WorkspaceMembershipRecord[]> {
    return this.repository.listByWorkspace(query);
  }
}
```

---

## 9. Integration Test Summary

All 10 integration tests ran against live PostgreSQL (`developer` test profile):

```
  CRITICAL SECURITY INVARIANT (D1): Same-Tenant Validation
    √ strictly REJECTS workspace membership between Workspace (Tenant A) and TenantMembership (Tenant B) (48 ms)
  CRITICAL GUARD TEST (D2): Suspended TenantMembership Restriction
    √ proves a Suspended TenantMembership CANNOT create or activate a WorkspaceMembership (25 ms)
  inviteToWorkspace() — Round-Trip & Prerequisite Checks
    √ persists workspace membership in Invited status (17 ms)
    √ rejects invitation when target TenantWorkspace is Suspended (5 ms)
    √ rejects invitation if target Workspace does not exist (WorkspaceMembershipWorkspaceNotFoundError) (4 ms)
    √ rejects duplicate workspace membership for the same (workspace_id, tenant_membership_id) pair (13 ms)
  Lifecycle — Full Transition Chain & Terminal State Guard
    √ Invited → Active → Suspended → Active → Suspended → Removed (105 ms)
    √ throws WorkspaceMembershipConcurrencyError on stale version during state transition (49 ms)
  listWorkspaceMembers() & Soft-Delete Filtering
    √ listWorkspaceMembers returns memberships filtered by workspaceId and role (8 ms)
    √ soft-deleted workspace memberships are excluded from reads (24 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

---

## 10. Performance Considerations

1. **Composite Unique Index Strategy (ES-001 §8 Compliance):**
   - Composite unique index on `(workspace_id, tenant_membership_id)` enables $O(1)$ workspace membership lookup and enforces duplicate prevention at database engine level.
   - Index on `workspace_id` powers fast `listWorkspaceMembers` queries.
   - Index on `tenant_membership_id` supports user workspace participation discovery.
   - Index on `status` and `is_deleted` speeds up status filtering.

2. **Atomic In-Place Concurrency Updates:**
   - State transition queries (`activate`, `suspend`, `remove`, `updateRole`) execute single `$executeRaw` UPDATE statements with `WHERE id = $id AND version = $expectedVersion`.

---

## 11. Security Review & Compliance

1. **Same-Tenant Security Invariant (D1):**
   - `WorkspaceMembershipService` strictly validates `workspace.tenantId === tenantMembership.tenantId`. Attempts to grant workspace access across tenant boundaries trigger `WorkspaceMembershipTenantMismatchError` and are rejected prior to persistence.

2. **Suspended TenantMembership Protection (D2):**
   - Operational workspace participation requires an active organizational membership. Attempts to create or activate workspace memberships for suspended or non-active tenant memberships throw `WorkspaceMembershipTenantMembershipNotActiveError`.

3. **Deferred Permission Evaluation (D3):**
   - Runtime authorization in VS08B will evaluate permissions dynamically from `WorkspaceRole`. Membership state tracks operational access, not individual permission flags.

4. **Foreign Key Integrity:**
   - `workspace_id` FK references `tenant_workspaces(id)` (`ON DELETE RESTRICT ON UPDATE RESTRICT`).
   - `tenant_membership_id` FK references `tenant_memberships(id)` (`ON DELETE RESTRICT ON UPDATE RESTRICT`).

5. **Audit Trail Integrity:**
   - Every write operation requires `actorUserId` and records `updated_by` / `updated_at`.

---

## 12. Architecture Deviations

**None.**  
The implementation strictly follows CC-007, EWP-007, ES-001, ES-008, ES-009, ES-010, DDS-101A, and ADR-008-017.

---

## 13. Milestone VS08A Conclusion & Readiness

EWP-007 is fully implemented, documented, and verified.
Completion of EWP-007 concludes the **VS08A Tenant Foundation** milestone:

- **EWP-001 — PlatformApplication:** Certified ✅
- **EWP-002 — PlatformApplicationPackage:** Certified ✅
- **EWP-003 — Tenant:** Certified ✅
- **EWP-004 — TenantWorkspace:** Certified ✅
- **EWP-005 — WorkspaceInstallation:** Certified ✅
- **EWP-006 — TenantMembership:** Certified ✅
- **EWP-007 — WorkspaceMembership:** Ready for Implementation Review & Certification Candidate ✅

Together, these 7 work packages establish the baseline for **VS08B – Subscription, Licensing, Entitlements, and Feature Management**.
