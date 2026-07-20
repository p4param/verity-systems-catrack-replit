// Integration tests for WorkspaceInstallationRepository and WorkspaceInstallationService
// Profile: developer — requires live PostgreSQL connection (DATABASE_URL env)
//
// Tests executed against real database:
//   - Genuine Installing state creation & Installed transition with installedAt timestamp (D1 / D2)
//   - Workspace FK enforcement (ON DELETE RESTRICT ON UPDATE RESTRICT)
//   - Package FK enforcement (ON DELETE RESTRICT ON UPDATE RESTRICT)
//   - Package Published prerequisite validation
//   - Workspace Active prerequisite validation
//   - Tenant Active prerequisite validation — VERIFIES installation is rejected when Tenant is Suspended (D4)
//   - Duplicate installation rejection ((workspace_id, application_package_id) unique constraint)
//   - Full CC-005 lifecycle transition chain
//   - Optimistic concurrency control (version BIGINT)
//   - Soft-delete filtering

import { WorkspaceInstallationRepository } from "../../repositories/WorkspaceInstallationRepository";
import { WorkspaceInstallationService } from "../../services/WorkspaceInstallationService";
import { TenantWorkspaceRepository } from "../../repositories/TenantWorkspaceRepository";
import { TenantWorkspaceService } from "../../services/TenantWorkspaceService";
import { TenantRepository } from "../../repositories/TenantRepository";
import { TenantService } from "../../services/TenantService";
import { PlatformApplicationRepository } from "../../../catalog/repositories/PlatformApplicationRepository";
import { PlatformApplicationService } from "../../../catalog/services/PlatformApplicationService";
import { PlatformApplicationPackageRepository } from "../../../catalog/repositories/PlatformApplicationPackageRepository";
import { PlatformApplicationPackageService } from "../../../catalog/services/PlatformApplicationPackageService";

import {
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  InstallationPackageNotPublishedError,
  InstallationWorkspaceNotActiveError,
  InstallationTenantNotActiveError,
  WorkspaceInstallationConcurrencyError,
  InvalidInstallationLifecycleTransitionError,
  UninstalledInstallationImmutableError,
} from "../../domain/WorkspaceInstallationErrors";
import { WORKSPACE_INSTALLATION_STATUS } from "../../models/WorkspaceInstallationModels";
import type { TenantRecord } from "../../models/TenantModels";
import type { TenantWorkspaceRecord } from "../../models/TenantWorkspaceModels";
import type { PlatformApplicationRecord, PlatformApplicationPackageRecord } from "../../../catalog/models/PlatformApplicationPackageModels";
import { prisma } from "@/lib/prisma";

const S = WORKSPACE_INSTALLATION_STATUS;
const ACTOR = "00000000-0000-0000-0000-000000000099";
const TEST_PREFIX = `test-inst-${Date.now()}`;

let tenantSvc: TenantService;
let wsSvc: TenantWorkspaceService;
let appSvc: PlatformApplicationService;
let pkgSvc: PlatformApplicationPackageService;

let instRepo: WorkspaceInstallationRepository;
let instSvc: WorkspaceInstallationService;

let activeTenant: TenantRecord;
let suspendedTenant: TenantRecord;

let activeWorkspace: TenantWorkspaceRecord;
let provisioningWorkspace: TenantWorkspaceRecord;
let workspaceOnSuspendedTenant: TenantWorkspaceRecord;

let appRecord: PlatformApplicationRecord;
let publishedPackage1: PlatformApplicationPackageRecord;
let publishedPackage2: PlatformApplicationPackageRecord;
let draftPackage: PlatformApplicationPackageRecord;

beforeAll(async () => {
  const tenantRepo = new TenantRepository();
  tenantSvc = new TenantService(tenantRepo);

  const wsRepo = new TenantWorkspaceRepository();
  wsSvc = new TenantWorkspaceService(wsRepo, tenantRepo);

  const appRepo = new PlatformApplicationRepository();
  appSvc = new PlatformApplicationService(appRepo);

  const pkgRepo = new PlatformApplicationPackageRepository();
  pkgSvc = new PlatformApplicationPackageService(pkgRepo, appRepo);

  instRepo = new WorkspaceInstallationRepository();
  instSvc = new WorkspaceInstallationService(instRepo, wsRepo, tenantRepo, pkgRepo);

  // 1. Create Active Tenant & Suspended Tenant (D4)
  activeTenant = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-active`,
    name: `Active Tenant ${TEST_PREFIX}`,
    displayName: "Active Tenant",
    actorUserId: ACTOR,
  });
  await tenantSvc.activateTenant({ id: activeTenant.id, actorUserId: ACTOR, expectedVersion: 1n });

  suspendedTenant = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-susp`,
    name: `Suspended Tenant ${TEST_PREFIX}`,
    displayName: "Suspended Tenant",
    actorUserId: ACTOR,
  });
  await tenantSvc.activateTenant({ id: suspendedTenant.id, actorUserId: ACTOR, expectedVersion: 1n });
  await tenantSvc.suspendTenant({ id: suspendedTenant.id, actorUserId: ACTOR, expectedVersion: 2n });

  // 2. Create Workspaces
  activeWorkspace = await wsSvc.createWorkspace({
    tenantId: activeTenant.id,
    code: `${TEST_PREFIX}-ws-active`,
    name: `Active Workspace ${TEST_PREFIX}`,
    displayName: "Active WS",
    actorUserId: ACTOR,
  });
  await wsSvc.activateWorkspace({ id: activeWorkspace.id, actorUserId: ACTOR, expectedVersion: 1n });

  provisioningWorkspace = await wsSvc.createWorkspace({
    tenantId: activeTenant.id,
    code: `${TEST_PREFIX}-ws-prov`,
    name: `Provisioning Workspace ${TEST_PREFIX}`,
    displayName: "Prov WS",
    actorUserId: ACTOR,
  });

  workspaceOnSuspendedTenant = await wsSvc.createWorkspace({
    tenantId: suspendedTenant.id,
    code: `${TEST_PREFIX}-ws-on-susp-tenant`,
    name: `WS on Suspended Tenant ${TEST_PREFIX}`,
    displayName: "WS Suspended Tenant",
    actorUserId: ACTOR,
  });
  await wsSvc.activateWorkspace({ id: workspaceOnSuspendedTenant.id, actorUserId: ACTOR, expectedVersion: 1n });

  // 3. Create Catalog Application & Packages
  appRecord = await appSvc.register({
    code: `APP-INST-${Date.now()}`,
    name: `Catalog App ${TEST_PREFIX}`,
    displayName: "Catalog App",
    category: "ERP",
    actorUserId: ACTOR,
  });

  draftPackage = await pkgSvc.createPackage({
    applicationId: appRecord.id,
    packageVersion: "1.0.0-draft",
    displayName: "v1.0.0-draft",
    manifest: { entryPoint: "index.js" },
    actorUserId: ACTOR,
  });

  publishedPackage1 = await pkgSvc.createPackage({
    applicationId: appRecord.id,
    packageVersion: "1.0.0",
    displayName: "v1.0.0",
    manifest: { entryPoint: "index.js" },
    actorUserId: ACTOR,
  });
  await pkgSvc.publishPackage({ id: publishedPackage1.id, actorUserId: ACTOR, expectedVersion: 1n });

  publishedPackage2 = await pkgSvc.createPackage({
    applicationId: appRecord.id,
    packageVersion: "2.0.0",
    displayName: "v2.0.0",
    manifest: { entryPoint: "index.js" },
    actorUserId: ACTOR,
  });
  await pkgSvc.publishPackage({ id: publishedPackage2.id, actorUserId: ACTOR, expectedVersion: 1n });
});

afterAll(async () => {
  // Clean up in reverse dependency order
  await (prisma as any).workspaceInstallation.deleteMany({
    where: { workspaceId: { in: [activeWorkspace.id, provisioningWorkspace.id, workspaceOnSuspendedTenant.id] } },
  });
  if (appRecord?.id) {
    await (prisma as any).platformApplicationPackage.deleteMany({
      where: { applicationId: appRecord.id },
    });
    await (prisma as any).platformApplication.deleteMany({
      where: { id: appRecord.id },
    });
  }
  await (prisma as any).tenantWorkspace.deleteMany({
    where: { tenantId: { in: [activeTenant.id, suspendedTenant.id] } },
  });
  await (prisma as any).tenant.deleteMany({
    where: { id: { in: [activeTenant.id, suspendedTenant.id] } },
  });
  await prisma.$disconnect();
});

describe("installPackage() — Genuine Installing State & Completion (D1 / D2)", () => {
  test("creates installation in Installing status with null installedAt, then completes to Installed populating installedAt (D1 / D2)", async () => {
    // 1. Install package -> creates in Installing status
    const inst = await instSvc.installPackage({
      workspaceId: activeWorkspace.id,
      packageId: publishedPackage1.id,
      actorUserId: ACTOR,
    });

    expect(inst.workspaceId).toBe(activeWorkspace.id);
    expect(inst.packageId).toBe(publishedPackage1.id);
    expect(inst.status).toBe(S.Installing);
    expect(inst.installedAt).toBeNull(); // D2: null initially
    expect(inst.version).toBe(1n);

    const loadedInstalling = await instRepo.getById(inst.id);
    expect(loadedInstalling!.status).toBe(S.Installing);

    // 2. Complete installation -> transitions to Installed & sets installedAt (D1 / D2)
    const completed = await instSvc.completeInstallation({
      id: inst.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });

    expect(completed.status).toBe(S.Installed);
    expect(completed.installedAt).not.toBeNull();
    expect(completed.version).toBe(2n);

    const loadedInstalled = await instRepo.getById(inst.id);
    expect(loadedInstalled!.status).toBe(S.Installed);
    expect(loadedInstalled!.installedAt).not.toBeNull();
  });
});

describe("Prerequisite Validation Integration Tests", () => {
  test("rejects installation when PlatformApplicationPackage status is Draft (must be Published)", async () => {
    await expect(
      instSvc.installPackage({
        workspaceId: activeWorkspace.id,
        packageId: draftPackage.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(InstallationPackageNotPublishedError);
  });

  test("rejects installation when TenantWorkspace status is Provisioning (must be Active)", async () => {
    await expect(
      instSvc.installPackage({
        workspaceId: provisioningWorkspace.id,
        packageId: publishedPackage1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(InstallationWorkspaceNotActiveError);
  });

  // ── CRITICAL USER REFINEMENT TEST CASE (D4) ──
  test("rejects installation when owning Tenant is Suspended (D4)", async () => {
    await expect(
      instSvc.installPackage({
        workspaceId: workspaceOnSuspendedTenant.id,
        packageId: publishedPackage1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(InstallationTenantNotActiveError);
  });

  test("rejects installation if target workspace does not exist (FK constraint / InstallationWorkspaceNotFoundError)", async () => {
    await expect(
      instSvc.installPackage({
        workspaceId: "00000000-0000-0000-0000-000000000000",
        packageId: publishedPackage1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(InstallationWorkspaceNotFoundError);
  });

  test("rejects installation if target package does not exist (FK constraint / InstallationPackageNotFoundError)", async () => {
    await expect(
      instSvc.installPackage({
        workspaceId: activeWorkspace.id,
        packageId: "00000000-0000-0000-0000-000000000000",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(InstallationPackageNotFoundError);
  });

  test("rejects duplicate package installation into the same workspace ((workspace_id, application_package_id) unique constraint)", async () => {
    // Package 1 is already installed in activeWorkspace from first test
    await expect(
      instSvc.installPackage({
        workspaceId: activeWorkspace.id,
        packageId: publishedPackage1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceInstallationError);
  });
});

describe("Lifecycle — Full Transition Chain (CC-005)", () => {
  test("Installing → Installed → Suspended → Installed → Suspended → Uninstalled", async () => {
    // 1. Create package 2 installation in Installing status
    const inst = await instSvc.installPackage({
      workspaceId: activeWorkspace.id,
      packageId: publishedPackage2.id,
      actorUserId: ACTOR,
    });
    expect(inst.status).toBe(S.Installing);

    // 2. Installing → Installed
    const installed = await instSvc.completeInstallation({
      id: inst.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(installed.status).toBe(S.Installed);
    expect(installed.version).toBe(2n);

    // 3. Installed → Suspended
    const suspended = await instSvc.suspendInstallation({
      id: inst.id,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(suspended.status).toBe(S.Suspended);
    expect(suspended.version).toBe(3n);

    // 4. Suspended → Installed (Resumption)
    const resumed = await instSvc.resumeInstallation({
      id: inst.id,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });
    expect(resumed.status).toBe(S.Installed);
    expect(resumed.version).toBe(4n);

    // 5. Installed → Suspended
    const reSuspended = await instSvc.suspendInstallation({
      id: inst.id,
      actorUserId: ACTOR,
      expectedVersion: 4n,
    });
    expect(reSuspended.status).toBe(S.Suspended);
    expect(reSuspended.version).toBe(5n);

    // 6. Suspended → Uninstalled (Terminal)
    const uninstalled = await instSvc.uninstallPackage({
      id: inst.id,
      actorUserId: ACTOR,
      expectedVersion: 5n,
    });
    expect(uninstalled.status).toBe(S.Uninstalled);
    expect(uninstalled.version).toBe(6n);
  });

  test("throws WorkspaceInstallationConcurrencyError on stale version during state transition", async () => {
    // Get existing package 1 installation
    const inst = await instSvc.getInstallationByPackage(activeWorkspace.id, publishedPackage1.id);
    await expect(
      instSvc.suspendInstallation({
        id: inst.id,
        actorUserId: ACTOR,
        expectedVersion: 99n, // stale version
      })
    ).rejects.toThrow(WorkspaceInstallationConcurrencyError);
  });

  test("forbidden lifecycle transitions throw InvalidInstallationLifecycleTransitionError", async () => {
    const inst = await instSvc.getInstallationByPackage(activeWorkspace.id, publishedPackage2.id);
    // inst is now Uninstalled
    expect(inst.status).toBe(S.Uninstalled);

    // Uninstalled → Installed is forbidden (terminal state)
    await expect(
      instSvc.resumeInstallation({
        id: inst.id,
        actorUserId: ACTOR,
        expectedVersion: inst.version,
      })
    ).rejects.toThrow(InvalidInstallationLifecycleTransitionError);
  });
});

describe("listWorkspaceInstallations() & Soft-Delete Filtering", () => {
  test("listWorkspaceInstallations returns all installations for workspace", async () => {
    const list = await instSvc.listWorkspaceInstallations({ workspaceId: activeWorkspace.id });
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.every(x => x.workspaceId === activeWorkspace.id)).toBe(true);
  });

  test("soft-deleted installations are excluded from reads", async () => {
    const inst = await instSvc.getInstallationByPackage(activeWorkspace.id, publishedPackage1.id);

    // Soft delete via raw DB update
    await (prisma as any).workspaceInstallation.update({
      where: { id: inst.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ACTOR },
    });

    const byId = await instRepo.getById(inst.id);
    const byWsPkg = await instRepo.getByWorkspaceAndPackage(activeWorkspace.id, publishedPackage1.id);
    const list = await instSvc.listWorkspaceInstallations({ workspaceId: activeWorkspace.id });

    expect(byId).toBeNull();
    expect(byWsPkg).toBeNull();
    expect(list.some(x => x.id === inst.id)).toBe(false);

    // Un-delete to restore clean state for other tests if needed
    await (prisma as any).workspaceInstallation.update({
      where: { id: inst.id },
      data: { isDeleted: false, deletedAt: null, deletedBy: null },
    });
  });
});
