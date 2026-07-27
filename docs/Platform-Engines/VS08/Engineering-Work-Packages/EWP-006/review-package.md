# RP-006 — Implementation Review Package
## EWP-006: TenantMembership Aggregate
### Engine: VS08 – License, Subscription & Tenant Management Engine  
### Milestone: VS08A – Tenant Foundation

**Prepared:** 2026-07-21  
**Status:** Submitted for Implementation Review  
**Certification Candidate:** `src/modules/platform/tenant/`

---

## 1. Summary

EWP-006 implements the **TenantMembership** aggregate — establishing organizational affiliation between Platform Users (`User`) and Tenants (`Tenant`).

A `TenantMembership` connects one `User` to one `Tenant` with a specific `tenantRole` (`'Owner'`, `'Admin'`, `'Member'`, `'Guest'`).

### Scope (this work package only)
- Platform Identity Separation (D1): Identity (`PlatformUser`) is owned by `CM-002 Authentication & Identity Engine`. `VS08` models tenant-level membership participation.
- Single-Record In-Place Lifecycle Mutation (D2): All membership lifecycle state transitions occur in-place on a single record (`status` column mutation via atomic `$executeRaw` queries).
- Notification Scope (D3): `inviteUser` creates the membership record in `Invited` status without sending emails or notifications.
- Remove / Reactivate Terminal Guard Test (D4): Integration test suite explicitly proves that `Removed` memberships cannot be reactivated (`InvalidMembershipLifecycleTransitionError`).
- Mandatory Prerequisite Validation (Service Layer):
  1. Target `Tenant` exists & status is `Active`.
  2. Target `User` exists in `users` table.
  3. Membership is not duplicated for the same `(tenant_id, user_id)` pair.
- Membership Lifecycle (CC-006): `Invited` → `Active` ↔ `Suspended` → `Removed` (strict transition validation; `Removed` is a terminal state).
- Optimistic concurrency via `version BIGINT` on all write operations (`invite`, `activate`, `suspend`, `remove`, `updateRole`).
- Full ES-001 audit trail (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`, `version`).

### Explicitly Out of Scope
Authentication, User registration, WorkspaceMembership, Licensing, Billing, Runtime authorization, Permission evaluation.

### Governing Documents Satisfied
ES-001 · ES-008 · ES-009 · ES-010 · DDS-101A · CC-006 · EWP-006 · ADR-008-001 through ADR-008-016

---

## 2. Git Diff

### Key Modified Files

```diff
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -84,2 +84,3 @@ model Tenant {
+    memberships TenantMembership[]

@@ -124,2 +125,3 @@ model User {
+    memberships TenantMembership[]

+model TenantMembership {
+  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
+  tenantId    String    @db.Uuid @map("tenant_id")
+  userId      String    @db.Uuid @map("user_id")
+  tenantRole  String    @default("Member") @map("tenant_role")
+  status      String    @default("Invited") @map("status")
+  createdAt   DateTime  @default(now()) @map("created_at")
+  createdBy   String?   @db.Uuid @map("created_by")
+  updatedAt   DateTime  @updatedAt @map("updated_at")
+  updatedBy   String?   @db.Uuid @map("updated_by")
+  isDeleted   Boolean   @default(false) @map("is_deleted")
+  deletedAt   DateTime? @map("deleted_at")
+  deletedBy   String?   @db.Uuid @map("deleted_by")
+  version     BigInt    @default(1) @map("version")
+
+  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+  user        User      @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@unique([tenantId, userId], map: "tenant_memberships_tenant_user_unique")
+  @@index([tenantId], map: "idx_tenant_memberships_tenant_id")
+  @@index([userId], map: "idx_tenant_memberships_user_id")
+  @@index([status], map: "idx_tenant_memberships_status")
+  @@index([isDeleted], map: "idx_tenant_memberships_is_deleted")
+  @@map("tenant_memberships")
+}
```

```diff
--- a/src/lib/prisma.ts
+++ b/src/lib/prisma.ts
@@ -8,3 +8,3 @@
-// VS08A EWP-005: Updated to check for workspaceInstallation (most recent model).
-if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).workspaceInstallation) {
+// VS08A EWP-006: Updated to check for tenantMembership (most recent model).
+if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).tenantMembership) {
```

---

## 3. File Manifest

### Production Files Added for EWP-006 (`src/modules/platform/tenant/`)

| File | Role | Lines | Bytes |
|---|---|---|---|
| `models/TenantMembershipModels.ts` | DTOs, commands, queries, role & status constants | 99 | 3,314 |
| `domain/TenantMembershipErrors.ts` | 10 Domain error classes | 111 | 3,385 |
| `domain/TenantMembershipLifecycle.ts` | State machine & immutability guard (ADR-008-016 / D2) | 62 | 2,210 |
| `domain/TenantMembershipValidator.ts` | UUID & role field validator | 78 | 2,676 |
| `domain/TenantMembership.ts` | Aggregate root & invite factory (D3) | 133 | 4,359 |
| `contracts/ITenantMembershipRepository.ts` | Repository contract interface | 53 | 1,486 |
| `contracts/ITenantMembershipService.ts` | Service contract interface | 46 | 1,500 |
| `repositories/TenantMembershipRepository.ts` | Raw SQL write repository with in-place updates | 268 | 7,704 |
| `services/TenantMembershipService.ts` | Application service & prerequisite validations | 208 | 7,322 |
| **New Production subtotal** | | **1,058 lines** | **33,956 bytes** |

### Test Files Added for EWP-006 (`src/modules/platform/tenant/tests/`)

| File | Type | Tests | Lines | Bytes |
|---|---|---|---|---|
| `TenantMembership.domain.test.ts` | Unit | 12 | 181 | 5,587 |
| `TenantMembershipLifecycle.test.ts` | Unit | 17 | 119 | 4,401 |
| `TenantMembershipRepository.test.ts` | Unit (mocked) | 15 | 194 | 6,371 |
| `TenantMembershipService.test.ts` | Unit | 18 | 308 | 11,075 |
| `integration/TenantMembershipRepository.integration.test.ts` | Integration (live DB) | 11 | 359 | 12,415 |
| **New Test subtotal** | | **73 tests** | **1,161 lines** | **39,849 bytes** |

### Database Files

| File | Description | Lines | Bytes |
|---|---|---|---|
| `prisma/migrations/20260721100000_vs08a_tenant_membership/migration.sql` | DDL for `tenant_memberships` table | 53 | 2,242 |

---

## 4. Prisma Diff

```prisma
// Back-relation on Tenant model
memberships TenantMembership[]

// Back-relation on User model
memberships TenantMembership[]

// New TenantMembership model
model TenantMembership {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @db.Uuid @map("tenant_id")
  userId      String    @db.Uuid @map("user_id")
  tenantRole  String    @default("Member") @map("tenant_role")
  status      String    @default("Invited") @map("status")
  createdAt   DateTime  @default(now()) @map("created_at")
  createdBy   String?   @db.Uuid @map("created_by")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  updatedBy   String?   @db.Uuid @map("updated_by")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  deletedAt   DateTime? @map("deleted_at")
  deletedBy   String?   @db.Uuid @map("deleted_by")
  version     BigInt    @default(1) @map("version")

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  user        User      @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([tenantId, userId], map: "tenant_memberships_tenant_user_unique")
  @@index([tenantId], map: "idx_tenant_memberships_tenant_id")
  @@index([userId], map: "idx_tenant_memberships_user_id")
  @@index([status], map: "idx_tenant_memberships_status")
  @@index([isDeleted], map: "idx_tenant_memberships_is_deleted")
  @@map("tenant_memberships")
}
```

---

## 5. Migration SQL

```sql
-- VS08A: TenantMembership aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-016 (Tenant Membership Model — identity separate from organizational participation)
--             ES-009 (TenantMembership belongs to 1 tenant and 1 user)
--             ES-010 (table: tenant_memberships)

CREATE TABLE tenant_memberships (
  -- Identity & Associations
  id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL,
  user_id             UUID          NOT NULL,

  -- Role within Tenant: Owner | Admin | Member | Guest
  tenant_role         VARCHAR(50)   NOT NULL DEFAULT 'Member',

  -- Lifecycle: Invited | Active | Suspended | Removed
  status              VARCHAR(50)   NOT NULL DEFAULT 'Invited',

  -- ES-001: Mandatory audit columns
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by          UUID,
  is_deleted          BOOLEAN       NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID,

  -- ES-001: Optimistic concurrency counter
  version             BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT tenant_memberships_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions (ES-001 / CC-006)
  CONSTRAINT tenant_memberships_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT tenant_memberships_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- Only one active membership per (tenant_id, user_id)
  CONSTRAINT tenant_memberships_tenant_user_unique
    UNIQUE (tenant_id, user_id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_tenant_memberships_tenant_id ON tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_user_id ON tenant_memberships (user_id);
CREATE INDEX idx_tenant_memberships_status ON tenant_memberships (status);
CREATE INDEX idx_tenant_memberships_is_deleted ON tenant_memberships (is_deleted);
```

---

## 6. Aggregate Root

```typescript
// src/modules/platform/tenant/domain/TenantMembership.ts

import { randomUUID } from "crypto";
import type {
  TenantMembershipRecord,
  TenantMembershipStatus,
  TenantRole,
  InviteUserCommand,
} from "../models/TenantMembershipModels";
import { TENANT_MEMBERSHIP_STATUS, TENANT_ROLE } from "../models/TenantMembershipModels";
import { TenantMembershipLifecycle } from "./TenantMembershipLifecycle";
import { RemovedMembershipImmutableError } from "./TenantMembershipErrors";

export class TenantMembership {
  private constructor(private readonly _record: TenantMembershipRecord) {}

  get id(): string { return this._record.id; }
  get tenantId(): string { return this._record.tenantId; }
  get userId(): string { return this._record.userId; }
  get tenantRole(): TenantRole { return this._record.tenantRole; }
  get status(): TenantMembershipStatus { return this._record.status; }
  get createdAt(): Date { return this._record.createdAt; }
  get createdBy(): string | null { return this._record.createdBy; }
  get updatedAt(): Date { return this._record.updatedAt; }
  get updatedBy(): string | null { return this._record.updatedBy; }
  get isDeleted(): boolean { return this._record.isDeleted; }
  get deletedAt(): Date | null { return this._record.deletedAt; }
  get deletedBy(): string | null { return this._record.deletedBy; }
  get version(): bigint { return this._record.version; }

  static invite(command: InviteUserCommand): TenantMembership {
    const now = new Date();
    const record: TenantMembershipRecord = {
      id: randomUUID(),
      tenantId: command.tenantId.trim(),
      userId: command.userId.trim(),
      tenantRole: command.tenantRole ?? TENANT_ROLE.Member,
      status: TENANT_MEMBERSHIP_STATUS.Invited,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new TenantMembership(record);
  }

  static reconstitute(record: TenantMembershipRecord): TenantMembership {
    return new TenantMembership({ ...record });
  }

  assertModifiable(): void {
    if (TenantMembershipLifecycle.isImmutable(this._record.status)) {
      throw new RemovedMembershipImmutableError(this._record.id);
    }
  }

  toRecord(): TenantMembershipRecord {
    return { ...this._record };
  }
}
```

---

## 7. Repository

```typescript
// src/modules/platform/tenant/repositories/TenantMembershipRepository.ts

import { prisma } from "@/lib/prisma";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type { TenantMembershipRecord, TenantMembershipStatus, TenantRole, ListTenantMembershipsQuery } from "../models/TenantMembershipModels";
import {
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipUserNotFoundError,
  TenantMembershipConcurrencyError,
} from "../domain/TenantMembershipErrors";

function toRecord(row: any): TenantMembershipRecord {
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

function rethrowConstraintViolation(error: unknown, tenantId: string, userId: string): never {
  const e = error as any;
  const msg = (e.message ?? "").toLowerCase();

  if (e.code === "P2002" || e.cause?.code === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicateTenantMembershipError(tenantId, userId);
  }

  if (e.code === "P2003" || e.cause?.code === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
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
  async invite(record: TenantMembershipRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO tenant_memberships (
          id, tenant_id, user_id, tenant_role, status,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid, ${record.tenantId}::uuid, ${record.userId}::uuid, ${record.tenantRole}, ${record.status},
          ${record.createdAt}, ${record.createdBy}::uuid, ${record.updatedAt}, ${record.updatedBy}::uuid,
          ${record.isDeleted}, ${record.deletedAt}, ${record.deletedBy}::uuid, ${record.version}
        )
      `;
    } catch (error) {
      rethrowConstraintViolation(error, record.tenantId, record.userId);
    }
  }

  async activate(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships SET status = 'Active', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new TenantMembershipConcurrencyError(id);
  }

  async suspend(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships SET status = 'Suspended', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new TenantMembershipConcurrencyError(id);
  }

  async remove(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships SET status = 'Removed', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new TenantMembershipConcurrencyError(id);
  }

  async updateRole(id: string, tenantRole: TenantRole, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE tenant_memberships SET tenant_role = ${tenantRole}, updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new TenantMembershipConcurrencyError(id);
  }

  async getById(id: string): Promise<TenantMembershipRecord | null> {
    const row = await (prisma as any).tenantMembership.findFirst({ where: { id, isDeleted: false } });
    return row ? toRecord(row) : null;
  }

  async getByUserAndTenant(tenantId: string, userId: string): Promise<TenantMembershipRecord | null> {
    const row = await (prisma as any).tenantMembership.findFirst({
      where: { tenantId, userId, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async listByTenant(query: ListTenantMembershipsQuery): Promise<TenantMembershipRecord[]> {
    const where: any = { tenantId: query.tenantId };
    if (!query.includeDeleted) where.isDeleted = false;
    if (query.status !== undefined) where.status = query.status;
    if (query.tenantRole !== undefined) where.tenantRole = query.tenantRole;
    const rows = await (prisma as any).tenantMembership.findMany({ where, orderBy: { createdAt: "asc" } });
    return rows.map(toRecord);
  }

  async existsMembership(tenantId: string, userId: string): Promise<boolean> {
    const count = await (prisma as any).tenantMembership.count({
      where: { tenantId, userId, isDeleted: false },
    });
    return count > 0;
  }
}
```

---

## 8. Service

```typescript
// src/modules/platform/tenant/services/TenantMembershipService.ts

import { prisma } from "@/lib/prisma";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type { ITenantMembershipService } from "../contracts/ITenantMembershipService";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import type {
  TenantMembershipRecord,
  InviteUserCommand,
  ActivateMembershipCommand,
  SuspendMembershipCommand,
  RemoveMembershipCommand,
  UpdateTenantRoleCommand,
  ListTenantMembershipsQuery,
} from "../models/TenantMembershipModels";
import { TENANT_MEMBERSHIP_STATUS } from "../models/TenantMembershipModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { TenantMembership } from "../domain/TenantMembership";
import { TenantMembershipLifecycle } from "../domain/TenantMembershipLifecycle";
import { TenantMembershipValidator } from "../domain/TenantMembershipValidator";
import {
  MembershipNotFoundError,
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipTenantNotActiveError,
  MembershipUserNotFoundError,
} from "../domain/TenantMembershipErrors";

export class TenantMembershipService implements ITenantMembershipService {
  constructor(
    private readonly repository: ITenantMembershipRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  async inviteUser(command: InviteUserCommand): Promise<TenantMembershipRecord> {
    TenantMembershipValidator.validateInviteCommand(command);

    const { tenantId, userId } = command;

    const tenant = await this.tenantRepository.getById(tenantId);
    if (!tenant) throw new MembershipTenantNotFoundError(tenantId);
    if (tenant.status !== TENANT_STATUS.Active) {
      throw new MembershipTenantNotActiveError(tenantId, tenant.status);
    }

    const user = await (prisma as any).user.findFirst({ where: { id: userId } });
    if (!user) throw new MembershipUserNotFoundError(userId);

    if (await this.repository.existsMembership(tenantId, userId)) {
      throw new DuplicateTenantMembershipError(tenantId, userId);
    }

    const membership = TenantMembership.invite(command);
    await this.repository.invite(membership.toRecord());
    return membership.toRecord();
  }

  async activateMembership(command: ActivateMembershipCommand): Promise<TenantMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new MembershipNotFoundError(command.id);
    TenantMembershipLifecycle.validateTransition(existing.status, TENANT_MEMBERSHIP_STATUS.Active);
    await this.repository.activate(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  async suspendMembership(command: SuspendMembershipCommand): Promise<TenantMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new MembershipNotFoundError(command.id);
    TenantMembershipLifecycle.validateTransition(existing.status, TENANT_MEMBERSHIP_STATUS.Suspended);
    await this.repository.suspend(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  async removeMembership(command: RemoveMembershipCommand): Promise<TenantMembershipRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new MembershipNotFoundError(command.id);
    TenantMembershipLifecycle.validateTransition(existing.status, TENANT_MEMBERSHIP_STATUS.Removed);
    await this.repository.remove(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  async updateTenantRole(command: UpdateTenantRoleCommand): Promise<TenantMembershipRecord> {
    TenantMembershipValidator.validateUpdateRoleCommand(command);
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new MembershipNotFoundError(command.id);
    const membership = TenantMembership.reconstitute(existing);
    membership.assertModifiable();

    await this.repository.updateRole(command.id, command.tenantRole, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new MembershipNotFoundError(command.id);
    return updated;
  }

  async getMembershipById(id: string): Promise<TenantMembershipRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new MembershipNotFoundError(id);
    return record;
  }

  async getMembershipByUser(tenantId: string, userId: string): Promise<TenantMembershipRecord> {
    const record = await this.repository.getByUserAndTenant(tenantId, userId);
    if (!record) throw new MembershipNotFoundError(`${tenantId}@${userId}`);
    return record;
  }

  async listTenantMemberships(query: ListTenantMembershipsQuery): Promise<TenantMembershipRecord[]> {
    return this.repository.listByTenant(query);
  }
}
```

---

## 9. Integration Test Summary

All 11 integration tests ran against live PostgreSQL (`developer` test profile):

```
  inviteUser() — Round-Trip & Prerequisite Checks (D3)
    √ persists membership in Invited status and single-record mutation (D2 / D3) (23 ms)
    √ rejects invitation when target Tenant is Suspended (must be Active) (18 ms)
    √ rejects invitation if target Tenant does not exist (FK constraint / MembershipTenantNotFoundError) (3 ms)
    √ rejects invitation if target User does not exist (MembershipUserNotFoundError) (6 ms)
    √ rejects duplicate membership for the same (tenant_id, user_id) pair (9 ms)
  Remove / Reactivate Behavior & Terminal State Guard (D4)
    √ proves Removed memberships CANNOT be reactivated (terminal state / D4) (32 ms)
    √ removed memberships cannot have tenantRole updated (RemovedMembershipImmutableError) (7 ms)
  Lifecycle — Full Transition Chain & Concurrency (ADR-008-016)
    √ Invited → Active → Suspended → Active → Suspended → Removed (49 ms)
    √ throws TenantMembershipConcurrencyError on stale version during state transition (43 ms)
  listTenantMemberships() & Soft-Delete Filtering
    √ listTenantMemberships returns memberships filtered by tenantId and role (4 ms)
    √ soft-deleted memberships are excluded from reads (12 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

---

## 10. Performance Considerations

1. **Composite Unique Index Strategy (ES-001 §8 Compliance):**
   - Composite unique index on `(tenant_id, user_id)` enables $O(1)$ membership lookup and enforces duplicate prevention at database engine level.
   - Index on `tenant_id` powers fast `listTenantMemberships` queries.
   - Index on `user_id` supports multi-tenant user membership discovery.
   - Index on `status` and `is_deleted` speeds up status filtering.

2. **Atomic In-Place Concurrency Updates (D2):**
   - State transition queries (`activate`, `suspend`, `remove`, `updateRole`) execute single `$executeRaw` UPDATE statements with `WHERE id = $id AND version = $expectedVersion`.

---

## 11. Security Review

1. **Tenant Domain Isolation & Foreign Key Protection:**
   - `tenant_id` FK references `tenants(id)` (`ON DELETE RESTRICT ON UPDATE RESTRICT`).
   - `user_id` FK references `users(id)` (`ON DELETE RESTRICT ON UPDATE RESTRICT`). Deleting tenants or users with active memberships is strictly forbidden by DB engine.

2. **Prerequisite Authorization Checks (Service Layer):**
   - Service verifies active status of target tenant (preventing invitations to suspended or non-existent tenants).
   - Service verifies target user exists in `users` table (`CM-002 Identity Engine`).

3. **Immutability & Access Control Guards:**
   - `Removed` memberships are completely immutable — any state transition or role update attempt throws `RemovedMembershipImmutableError` or `InvalidMembershipLifecycleTransitionError` (D4).
   - `tenantId` and `userId` are immutable after creation.

4. **Audit Trail Integrity:**
   - Every write operation requires `actorUserId` and records `updated_by` / `updated_at`.

---

## 12. Architecture Deviations

**None.**  
The implementation strictly follows CC-006, EWP-006, ES-001, ES-008, ES-009, ES-010, DDS-101A, and ADR-008-016.

---

## 13. Ready For Certification

EWP-006 is fully implemented, documented, and verified across unit and integration test suites. It is ready for certification approval.
