# RP-005 — Implementation Review Package
## EWP-005: WorkspaceInstallation Aggregate
### Engine: VS08 – License, Subscription & Tenant Management Engine  
### Milestone: VS08A – Tenant Foundation

**Prepared:** 2026-07-20  
**Status:** Submitted for Implementation Review  
**Certification Candidate:** `src/modules/platform/tenant/`

---

## 1. Summary

EWP-005 implements the **WorkspaceInstallation** aggregate — the runtime deployment anchor connecting the **Platform Catalog** (`PlatformApplicationPackage`) to the **Tenant Domain** (`TenantWorkspace`).

A `WorkspaceInstallation` represents an installed, versioned deployment artifact executing within a `TenantWorkspace`. Every deployed business application operates through a workspace installation.

### Scope (this work package only)
- Runtime anchor: `workspaceId` FK to `tenant_workspaces(id)`, `packageId` FK to `platform_application_packages(id)`.
- Explicit FK referential actions: `ON DELETE RESTRICT ON UPDATE RESTRICT` on both foreign keys (CC-005 / ES-001).
- Genuine `Installing` lifecycle state: `installPackage` creates the aggregate in `Installing` status with `installedAt` null. Transition to `Installed` status occurs via `completeInstallation` (D1).
- `installedAt` business timestamp: `TIMESTAMPTZ` column populated upon transition to `Installed` status (D2).
- Mandatory Prerequisite Validation (Service Layer):
  1. Target `PlatformApplicationPackage` exists & status is `Published`.
  2. Target `TenantWorkspace` exists & status is `Active`.
  3. Owning `Tenant` exists & status is `Active` (D4 — suspended tenant rejection verified in integration tests).
  4. Package is not already installed in the workspace (`(workspace_id, application_package_id)` unique constraint).
- Recorded Future Rule (D3): Recorded "single active installation per application per workspace" rule for future in-place package upgrades.
- Installation Lifecycle (CC-005): `Installing` → `Installed` ↔ `Suspended` → `Uninstalled` (strict transition validation; `Uninstalled` is a terminal state).
- Optimistic concurrency via `version BIGINT` on all write operations (`install`, `completeInstallation`, `suspend`, `resume`, `uninstall`).
- Full ES-001 audit trail (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`, `version`).

### Explicitly Out of Scope
Package upgrades, Rollback, Licensing, Subscription, Feature flags, Runtime execution, Manifest generation, Health monitoring, Usage tracking, Marketplace, Billing.

### Governing Documents Satisfied
ES-001 · ES-008 · ES-009 · ES-010 · DDS-101A · CC-005 · EWP-005 · ADR-008-001 through ADR-008-015

---

## 2. Git Diff

### Key Modified Files

```diff
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -2508,2 +2508,3 @@ model PlatformApplicationPackage {
+    installations WorkspaceInstallation[]
   @@unique([applicationId, semVer], map: "platform_application_packages_app_version_unique")

@@ -2562,2 +2563,3 @@ model TenantWorkspace {
+    installations WorkspaceInstallation[]
   @@unique([tenantId, code], map: "tenant_workspaces_tenant_code_unique")

+model WorkspaceInstallation {
+  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
+  workspaceId          String    @db.Uuid @map("workspace_id")
+  packageId            String    @db.Uuid @map("application_package_id")
+  status               String    @default("Installing") @map("status")
+  installedAt          DateTime? @map("installed_at")
+  createdAt            DateTime  @default(now()) @map("created_at")
+  createdBy            String?   @db.Uuid @map("created_by")
+  updatedAt            DateTime  @updatedAt @map("updated_at")
+  updatedBy            String?   @db.Uuid @map("updated_by")
+  isDeleted            Boolean   @default(false) @map("is_deleted")
+  deletedAt            DateTime? @map("deleted_at")
+  deletedBy            String?   @db.Uuid @map("deleted_by")
+  version              BigInt    @default(1) @map("version")
+
+  workspace            TenantWorkspace            @relation(fields: [workspaceId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+  package              PlatformApplicationPackage @relation(fields: [packageId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@unique([workspaceId, packageId], map: "workspace_installations_workspace_package_unique")
+  @@index([workspaceId], map: "idx_workspace_installations_workspace_id")
+  @@index([packageId], map: "idx_workspace_installations_package_id")
+  @@index([status], map: "idx_workspace_installations_status")
+  @@index([isDeleted], map: "idx_workspace_installations_is_deleted")
+  @@map("workspace_installations")
+}
```

```diff
--- a/src/lib/prisma.ts
+++ b/src/lib/prisma.ts
@@ -8,3 +8,3 @@
-// VS08A EWP-004: Updated to check for tenantWorkspace (most recent model).
-if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).tenantWorkspace) {
+// VS08A EWP-005: Updated to check for workspaceInstallation (most recent model).
+if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).workspaceInstallation) {
```

---

## 3. File Manifest

### Production Files Added for EWP-005 (`src/modules/platform/tenant/`)

| File | Role | Lines | Bytes |
|---|---|---|---|
| `models/WorkspaceInstallationModels.ts` | DTOs, commands, queries, status constants | 86 | 2,824 |
| `domain/WorkspaceInstallationErrors.ts` | 12 Domain error classes | 135 | 4,443 |
| `domain/WorkspaceInstallationLifecycle.ts` | State machine & immutability guard (CC-005 / D1) | 62 | 2,363 |
| `domain/WorkspaceInstallationValidator.ts` | UUID field validation | 39 | 1,396 |
| `domain/WorkspaceInstallation.ts` | Aggregate root & installedAt timestamp (D2) | 128 | 4,289 |
| `contracts/IWorkspaceInstallationRepository.ts` | Repository contract interface | 54 | 1,541 |
| `contracts/IWorkspaceInstallationService.ts` | Service contract interface | 48 | 1,632 |
| `repositories/WorkspaceInstallationRepository.ts` | Raw SQL write repository with optimistic concurrency | 269 | 7,998 |
| `services/WorkspaceInstallationService.ts` | Application service & prerequisite validations (D4) | 229 | 8,493 |
| **New Production subtotal** | | **1,050 lines** | **34,979 bytes** |

### Test Files Added for EWP-005 (`src/modules/platform/tenant/tests/`)

| File | Type | Tests | Lines | Bytes |
|---|---|---|---|---|
| `WorkspaceInstallation.domain.test.ts` | Unit | 11 | 144 | 5,038 |
| `WorkspaceInstallationLifecycle.test.ts` | Unit | 17 | 119 | 4,757 |
| `WorkspaceInstallationRepository.test.ts` | Unit (mocked) | 14 | 177 | 6,191 |
| `WorkspaceInstallationService.test.ts` | Unit | 18 | 419 | 14,953 |
| `integration/WorkspaceInstallationRepository.integration.test.ts` | Integration (live DB) | 12 | 400 | 15,653 |
| **New Test subtotal** | | **72 tests** | **1,259 lines** | **46,592 bytes** |

### Database Files

| File | Description | Lines | Bytes |
|---|---|---|---|
| `prisma/migrations/20260720170000_vs08a_workspace_installation/migration.sql` | DDL for `workspace_installations` table | 51 | 2,502 |

---

## 4. Prisma Diff

```prisma
// Back-relation on PlatformApplicationPackage model
installations WorkspaceInstallation[]

// Back-relation on TenantWorkspace model
installations WorkspaceInstallation[]

// New WorkspaceInstallation model
model WorkspaceInstallation {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId          String    @db.Uuid @map("workspace_id")
  packageId            String    @db.Uuid @map("application_package_id")
  status               String    @default("Installing") @map("status")
  installedAt          DateTime? @map("installed_at")
  createdAt            DateTime  @default(now()) @map("created_at")
  createdBy            String?   @db.Uuid @map("created_by")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  updatedBy            String?   @db.Uuid @map("updated_by")
  isDeleted            Boolean   @default(false) @map("is_deleted")
  deletedAt            DateTime? @map("deleted_at")
  deletedBy            String?   @db.Uuid @map("deleted_by")
  version              BigInt    @default(1) @map("version")

  workspace            TenantWorkspace            @relation(fields: [workspaceId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  package              PlatformApplicationPackage @relation(fields: [packageId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([workspaceId, packageId], map: "workspace_installations_workspace_package_unique")
  @@index([workspaceId], map: "idx_workspace_installations_workspace_id")
  @@index([packageId], map: "idx_workspace_installations_package_id")
  @@index([status], map: "idx_workspace_installations_status")
  @@index([isDeleted], map: "idx_workspace_installations_is_deleted")
  @@map("workspace_installations")
}
```

---

## 5. Migration SQL

```sql
-- VS08A: WorkspaceInstallation aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-015 (Runtime deployment anchor between Platform Catalog and Tenant Workspace)
--             ES-009 (WorkspaceInstallation belongs to 1 workspace and 1 package)
--             ES-010 (table: workspace_installations)

CREATE TABLE workspace_installations (
  -- Identity & Associations
  id                      UUID          NOT NULL DEFAULT gen_random_uuid(),
  workspace_id            UUID          NOT NULL,
  application_package_id  UUID          NOT NULL,

  -- Lifecycle: Installing | Installed | Suspended | Uninstalled
  status                  VARCHAR(50)   NOT NULL DEFAULT 'Installing',
  installed_at            TIMESTAMPTZ,  -- Business timestamp populated upon transition to Installed (D2)

  -- ES-001: Mandatory audit columns
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by              UUID,
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by              UUID,
  is_deleted              BOOLEAN       NOT NULL DEFAULT false,
  deleted_at              TIMESTAMPTZ,
  deleted_by              UUID,

  -- ES-001: Optimistic concurrency counter
  version                 BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT workspace_installations_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions (ES-001 / CC-005)
  CONSTRAINT workspace_installations_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES tenant_workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT workspace_installations_package_fk
    FOREIGN KEY (application_package_id) REFERENCES platform_application_packages(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- A package can only be installed once per workspace (unique composite constraint)
  CONSTRAINT workspace_installations_workspace_package_unique
    UNIQUE (workspace_id, application_package_id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_workspace_installations_workspace_id ON workspace_installations (workspace_id);
CREATE INDEX idx_workspace_installations_package_id ON workspace_installations (application_package_id);
CREATE INDEX idx_workspace_installations_status ON workspace_installations (status);
CREATE INDEX idx_workspace_installations_is_deleted ON workspace_installations (is_deleted);
```

---

## 6. Aggregate Root

```typescript
// src/modules/platform/tenant/domain/WorkspaceInstallation.ts

import { randomUUID } from "crypto";
import type {
  WorkspaceInstallationRecord,
  WorkspaceInstallationStatus,
  InstallPackageCommand,
} from "../models/WorkspaceInstallationModels";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import { WorkspaceInstallationLifecycle } from "./WorkspaceInstallationLifecycle";
import { UninstalledInstallationImmutableError } from "./WorkspaceInstallationErrors";

export class WorkspaceInstallation {
  private constructor(private readonly _record: WorkspaceInstallationRecord) {}

  get id(): string { return this._record.id; }
  get workspaceId(): string { return this._record.workspaceId; }
  get packageId(): string { return this._record.packageId; }
  get status(): WorkspaceInstallationStatus { return this._record.status; }
  get installedAt(): Date | null { return this._record.installedAt; }
  get createdAt(): Date { return this._record.createdAt; }
  get createdBy(): string | null { return this._record.createdBy; }
  get updatedAt(): Date { return this._record.updatedAt; }
  get updatedBy(): string | null { return this._record.updatedBy; }
  get isDeleted(): boolean { return this._record.isDeleted; }
  get deletedAt(): Date | null { return this._record.deletedAt; }
  get deletedBy(): string | null { return this._record.deletedBy; }
  get version(): bigint { return this._record.version; }

  static create(command: InstallPackageCommand): WorkspaceInstallation {
    const now = new Date();
    const record: WorkspaceInstallationRecord = {
      id: randomUUID(),
      workspaceId: command.workspaceId.trim(),
      packageId: command.packageId.trim(),
      status: WORKSPACE_INSTALLATION_STATUS.Installing,
      installedAt: null,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new WorkspaceInstallation(record);
  }

  static reconstitute(record: WorkspaceInstallationRecord): WorkspaceInstallation {
    return new WorkspaceInstallation({ ...record });
  }

  assertModifiable(): void {
    if (WorkspaceInstallationLifecycle.isImmutable(this._record.status)) {
      throw new UninstalledInstallationImmutableError(this._record.id);
    }
  }

  toRecord(): WorkspaceInstallationRecord {
    return { ...this._record };
  }
}
```

---

## 7. Repository

```typescript
// src/modules/platform/tenant/repositories/WorkspaceInstallationRepository.ts

import { prisma } from "@/lib/prisma";
import type { IWorkspaceInstallationRepository } from "../contracts/IWorkspaceInstallationRepository";
import type { WorkspaceInstallationRecord, WorkspaceInstallationStatus, ListWorkspaceInstallationsQuery } from "../models/WorkspaceInstallationModels";
import {
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  WorkspaceInstallationConcurrencyError,
} from "../domain/WorkspaceInstallationErrors";

function toRecord(row: any): WorkspaceInstallationRecord {
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

function rethrowConstraintViolation(error: unknown, workspaceId: string, packageId: string): never {
  const e = error as any;
  const msg = (e.message ?? "").toLowerCase();

  if (e.code === "P2002" || e.cause?.code === "23505" || msg.includes("23505") || msg.includes("unique_violation")) {
    throw new DuplicateWorkspaceInstallationError(workspaceId, packageId);
  }

  if (e.code === "P2003" || e.cause?.code === "23503" || msg.includes("23503") || msg.includes("foreign key")) {
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

export class WorkspaceInstallationRepository implements IWorkspaceInstallationRepository {
  async install(record: WorkspaceInstallationRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO workspace_installations (
          id, workspace_id, application_package_id, status, installed_at,
          created_at, created_by, updated_at, updated_by,
          is_deleted, deleted_at, deleted_by, version
        ) VALUES (
          ${record.id}::uuid, ${record.workspaceId}::uuid, ${record.packageId}::uuid,
          ${record.status}, ${record.installedAt}, ${record.createdAt}, ${record.createdBy}::uuid,
          ${record.updatedAt}, ${record.updatedBy}::uuid, ${record.isDeleted}, ${record.deletedAt}, ${record.deletedBy}::uuid, ${record.version}
        )
      `;
    } catch (error) {
      rethrowConstraintViolation(error, record.workspaceId, record.packageId);
    }
  }

  async completeInstallation(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations
      SET status = 'Installed', installed_at = COALESCE(installed_at, NOW()), updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceInstallationConcurrencyError(id);
  }

  async suspend(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations SET status = 'Suspended', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceInstallationConcurrencyError(id);
  }

  async resume(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations SET status = 'Installed', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceInstallationConcurrencyError(id);
  }

  async uninstall(id: string, actorUserId: string, expectedVersion: bigint): Promise<void> {
    const affected = await prisma.$executeRaw`
      UPDATE workspace_installations SET status = 'Uninstalled', updated_at = NOW(), updated_by = ${actorUserId}::uuid, version = version + 1
      WHERE id = ${id}::uuid AND version = ${expectedVersion} AND is_deleted = false
    `;
    if (affected === 0) throw new WorkspaceInstallationConcurrencyError(id);
  }

  async getById(id: string): Promise<WorkspaceInstallationRecord | null> {
    const row = await (prisma as any).workspaceInstallation.findFirst({ where: { id, isDeleted: false } });
    return row ? toRecord(row) : null;
  }

  async getByWorkspaceAndPackage(workspaceId: string, packageId: string): Promise<WorkspaceInstallationRecord | null> {
    const row = await (prisma as any).workspaceInstallation.findFirst({
      where: { workspaceId, packageId, isDeleted: false },
    });
    return row ? toRecord(row) : null;
  }

  async listByWorkspace(query: ListWorkspaceInstallationsQuery): Promise<WorkspaceInstallationRecord[]> {
    const where: any = { workspaceId: query.workspaceId };
    if (!query.includeDeleted) where.isDeleted = false;
    if (query.status !== undefined) where.status = query.status;
    const rows = await (prisma as any).workspaceInstallation.findMany({ where, orderBy: { createdAt: "asc" } });
    return rows.map(toRecord);
  }

  async existsInstallation(workspaceId: string, packageId: string): Promise<boolean> {
    const count = await (prisma as any).workspaceInstallation.count({
      where: { workspaceId, packageId, isDeleted: false },
    });
    return count > 0;
  }
}
```

---

## 8. Service

```typescript
// src/modules/platform/tenant/services/WorkspaceInstallationService.ts

import type { IWorkspaceInstallationRepository } from "../contracts/IWorkspaceInstallationRepository";
import type { IWorkspaceInstallationService } from "../contracts/IWorkspaceInstallationService";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import type { IPlatformApplicationPackageRepository } from "../../catalog/contracts/IPlatformApplicationPackageRepository";
import type {
  WorkspaceInstallationRecord,
  InstallPackageCommand,
  CompleteInstallationCommand,
  SuspendInstallationCommand,
  ResumeInstallationCommand,
  UninstallInstallationCommand,
  ListWorkspaceInstallationsQuery,
} from "../models/WorkspaceInstallationModels";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../../catalog/models/PlatformApplicationPackageModels";
import { WorkspaceInstallation } from "../domain/WorkspaceInstallation";
import { WorkspaceInstallationLifecycle } from "../domain/WorkspaceInstallationLifecycle";
import { WorkspaceInstallationValidator } from "../domain/WorkspaceInstallationValidator";
import {
  InstallationNotFoundError,
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  InstallationPackageNotPublishedError,
  InstallationWorkspaceNotActiveError,
  InstallationTenantNotActiveError,
} from "../domain/WorkspaceInstallationErrors";

export class WorkspaceInstallationService implements IWorkspaceInstallationService {
  constructor(
    private readonly repository: IWorkspaceInstallationRepository,
    private readonly workspaceRepository: ITenantWorkspaceRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly packageRepository: IPlatformApplicationPackageRepository
  ) {}

  async installPackage(command: InstallPackageCommand): Promise<WorkspaceInstallationRecord> {
    WorkspaceInstallationValidator.validateInstallCommand(command);

    const { workspaceId, packageId } = command;

    const pkg = await this.packageRepository.getById(packageId);
    if (!pkg) throw new InstallationPackageNotFoundError(packageId);
    if (pkg.status !== PLATFORM_APPLICATION_PACKAGE_STATUS.Published) {
      throw new InstallationPackageNotPublishedError(packageId, pkg.status);
    }

    const workspace = await this.workspaceRepository.getById(workspaceId);
    if (!workspace) throw new InstallationWorkspaceNotFoundError(workspaceId);
    if (workspace.status !== TENANT_WORKSPACE_STATUS.Active) {
      throw new InstallationWorkspaceNotActiveError(workspaceId, workspace.status);
    }

    const tenant = await this.tenantRepository.getById(workspace.tenantId);
    if (!tenant || tenant.status !== TENANT_STATUS.Active) {
      throw new InstallationTenantNotActiveError(workspace.tenantId, tenant ? tenant.status : "NotFound");
    }

    if (await this.repository.existsInstallation(workspaceId, packageId)) {
      throw new DuplicateWorkspaceInstallationError(workspaceId, packageId);
    }

    const installation = WorkspaceInstallation.create(command);
    await this.repository.install(installation.toRecord());
    return installation.toRecord();
  }

  async completeInstallation(command: CompleteInstallationCommand): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new InstallationNotFoundError(command.id);
    WorkspaceInstallationLifecycle.validateTransition(existing.status, WORKSPACE_INSTALLATION_STATUS.Installed);
    await this.repository.completeInstallation(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  async suspendInstallation(command: SuspendInstallationCommand): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new InstallationNotFoundError(command.id);
    WorkspaceInstallationLifecycle.validateTransition(existing.status, WORKSPACE_INSTALLATION_STATUS.Suspended);
    await this.repository.suspend(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  async resumeInstallation(command: ResumeInstallationCommand): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new InstallationNotFoundError(command.id);
    WorkspaceInstallationLifecycle.validateTransition(existing.status, WORKSPACE_INSTALLATION_STATUS.Installed);
    await this.repository.resume(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  async uninstallPackage(command: UninstallInstallationCommand): Promise<WorkspaceInstallationRecord> {
    const existing = await this.repository.getById(command.id);
    if (!existing) throw new InstallationNotFoundError(command.id);
    WorkspaceInstallationLifecycle.validateTransition(existing.status, WORKSPACE_INSTALLATION_STATUS.Uninstalled);
    await this.repository.uninstall(command.id, command.actorUserId, command.expectedVersion);
    const updated = await this.repository.getById(command.id);
    if (!updated) throw new InstallationNotFoundError(command.id);
    return updated;
  }

  async getInstallation(id: string): Promise<WorkspaceInstallationRecord> {
    const record = await this.repository.getById(id);
    if (!record) throw new InstallationNotFoundError(id);
    return record;
  }

  async getInstallationByPackage(workspaceId: string, packageId: string): Promise<WorkspaceInstallationRecord> {
    const record = await this.repository.getByWorkspaceAndPackage(workspaceId, packageId);
    if (!record) throw new InstallationNotFoundError(`${workspaceId}@${packageId}`);
    return record;
  }

  async listWorkspaceInstallations(query: ListWorkspaceInstallationsQuery): Promise<WorkspaceInstallationRecord[]> {
    return this.repository.listByWorkspace(query);
  }
}
```

---

## 9. Integration Test Summary

All 12 integration tests ran against live PostgreSQL (`developer` test profile):

```
  installPackage() — Genuine Installing State & Completion (D1 / D2)
    √ creates installation in Installing status with null installedAt, then completes to Installed populating installedAt (D1 / D2) (28 ms)
  Prerequisite Validation Integration Tests
    √ rejects installation when PlatformApplicationPackage status is Draft (must be Published) (13 ms)
    √ rejects installation when TenantWorkspace status is Provisioning (must be Active) (4 ms)
    √ rejects installation when owning Tenant is Suspended (D4) (9 ms)
    √ rejects installation if target workspace does not exist (FK constraint / InstallationWorkspaceNotFoundError) (5 ms)
    √ rejects installation if target package does not exist (FK constraint / InstallationPackageNotFoundError) (3 ms)
    √ rejects duplicate package installation into the same workspace ((workspace_id, application_package_id) unique constraint) (8 ms)
  Lifecycle — Full Transition Chain (CC-005)
    √ Installing → Installed → Suspended → Installed → Suspended → Uninstalled (33 ms)
    √ throws WorkspaceInstallationConcurrencyError on stale version during state transition (10 ms)
    √ forbidden lifecycle transitions throw InvalidInstallationLifecycleTransitionError (13 ms)
  listWorkspaceInstallations() & Soft-Delete Filtering
    √ listWorkspaceInstallations returns all installations for workspace (3 ms)
    √ soft-deleted installations are excluded from reads (16 ms)

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

---

## 10. Performance Considerations

1. **Composite Unique Index Strategy (ES-001 §8 Compliance):**
   - Composite unique index on `(workspace_id, application_package_id)` enables $O(1)$ installation lookup and enforces duplicate prevention at database engine level.
   - Index on `workspace_id` powers fast `listWorkspaceInstallations` queries.
   - Index on `application_package_id` supports package lookup across workspaces.
   - Index on `status` and `is_deleted` speeds up status filtering.

2. **Atomic Concurrency Updates:**
   - State transition queries (`completeInstallation`, `suspend`, `resume`, `uninstall`) execute single `$executeRaw` UPDATE statements with `WHERE id = $id AND version = $expectedVersion`.

---

## 11. Security Review

1. **Tenant Domain Isolation & Foreign Key Protection:**
   - `workspace_id` FK references `tenant_workspaces(id)` (`ON DELETE RESTRICT ON UPDATE RESTRICT`).
   - `application_package_id` FK references `platform_application_packages(id)` (`ON DELETE RESTRICT ON UPDATE RESTRICT`). Deleting workspaces or packages with active installations is strictly forbidden by DB engine.

2. **Prerequisite Authorization Checks (Service Layer):**
   - Service verifies active status of both target workspace AND owning tenant (preventing installations into suspended tenants or provisioning workspaces).
   - Service verifies package status is `Published` (preventing deployment of draft or archived packages).

3. **Immutability & Access Control Guards:**
   - `Uninstalled` installations are completely immutable — any state transition attempt throws `UninstalledInstallationImmutableError` or `InvalidInstallationLifecycleTransitionError`.
   - `workspaceId` and `packageId` are immutable after creation.

4. **Audit Trail Integrity:**
   - Every write operation requires `actorUserId` and records `updated_by` / `updated_at`. `installed_at` records the exact business timestamp when the installation completed to `Installed` status.

---

## 12. Architecture Deviations

**None.**  
The implementation strictly follows CC-005, EWP-005, ES-001, ES-008, ES-009, ES-010, DDS-101A, and ADR-008-015.

---

## 13. Ready For Certification

EWP-005 is fully implemented, documented, and verified across unit and integration test suites. It is ready for certification approval.
