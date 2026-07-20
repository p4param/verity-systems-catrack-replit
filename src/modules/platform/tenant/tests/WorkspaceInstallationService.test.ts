// Unit tests for WorkspaceInstallationService (mocked repositories)
// Profile: smoke — no DB connection required

import { WorkspaceInstallationService } from "../services/WorkspaceInstallationService";
import type { IWorkspaceInstallationRepository } from "../contracts/IWorkspaceInstallationRepository";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import type { IPlatformApplicationPackageRepository } from "../../catalog/contracts/IPlatformApplicationPackageRepository";
import {
  InstallationNotFoundError,
  DuplicateWorkspaceInstallationError,
  InstallationWorkspaceNotFoundError,
  InstallationPackageNotFoundError,
  InstallationPackageNotPublishedError,
  InstallationWorkspaceNotActiveError,
  InstallationTenantNotActiveError,
  InvalidInstallationLifecycleTransitionError,
} from "../domain/WorkspaceInstallationErrors";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import type { WorkspaceInstallationRecord } from "../models/WorkspaceInstallationModels";
import type { TenantWorkspaceRecord } from "../models/TenantWorkspaceModels";
import type { TenantRecord } from "../models/TenantModels";
import type { PlatformApplicationPackageRecord } from "../../catalog/models/PlatformApplicationPackageModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../../catalog/models/PlatformApplicationPackageModels";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const PACKAGE_ID = "00000000-0000-0000-0000-000000000020";
const INSTALLATION_ID = "00000000-0000-0000-0000-000000000030";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = WORKSPACE_INSTALLATION_STATUS;

function makeInstallationRecord(
  overrides: Partial<WorkspaceInstallationRecord> = {}
): WorkspaceInstallationRecord {
  return {
    id: INSTALLATION_ID,
    workspaceId: WORKSPACE_ID,
    packageId: PACKAGE_ID,
    status: S.Installing,
    installedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    createdBy: ACTOR,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

function makeTenantRecord(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: TENANT_ID,
    code: "acme-corp",
    name: "Acme Corporation",
    displayName: "Acme Corp",
    description: null,
    logoUrl: null,
    defaultTimeZone: "UTC",
    defaultCulture: "en-US",
    defaultCurrency: "USD",
    status: "Active",
    createdAt: new Date(),
    createdBy: ACTOR,
    updatedAt: new Date(),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

function makeWorkspaceRecord(
  overrides: Partial<TenantWorkspaceRecord> = {}
): TenantWorkspaceRecord {
  return {
    id: WORKSPACE_ID,
    tenantId: TENANT_ID,
    code: "prod-workspace",
    name: "Production Workspace",
    displayName: "Production",
    description: null,
    timeZone: "UTC",
    culture: "en-US",
    currency: "USD",
    status: "Active",
    createdAt: new Date(),
    createdBy: ACTOR,
    updatedAt: new Date(),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

function makePackageRecord(
  overrides: Partial<PlatformApplicationPackageRecord> = {}
): PlatformApplicationPackageRecord {
  return {
    id: PACKAGE_ID,
    applicationId: "00000000-0000-0000-0000-000000000005",
    packageVersion: "1.0.0",
    manifest: { entryPoint: "index.js" },
    status: PLATFORM_APPLICATION_PACKAGE_STATUS.Published,
    createdAt: new Date(),
    createdBy: ACTOR,
    updatedAt: new Date(),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

function makeMockInstallationRepo(
  overrides: Partial<Record<keyof IWorkspaceInstallationRepository, jest.Mock>> = {}
): jest.Mocked<IWorkspaceInstallationRepository> {
  return {
    install: jest.fn().mockResolvedValue(undefined),
    completeInstallation: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByWorkspaceAndPackage: jest.fn().mockResolvedValue(null),
    listByWorkspace: jest.fn().mockResolvedValue([]),
    existsInstallation: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<IWorkspaceInstallationRepository>;
}

function makeMockWorkspaceRepo(ws: TenantWorkspaceRecord | null = makeWorkspaceRecord()) {
  return {
    getById: jest.fn().mockResolvedValue(ws),
  } as unknown as jest.Mocked<ITenantWorkspaceRepository>;
}

function makeMockTenantRepo(tenant: TenantRecord | null = makeTenantRecord()) {
  return {
    getById: jest.fn().mockResolvedValue(tenant),
  } as unknown as jest.Mocked<ITenantRepository>;
}

function makeMockPackageRepo(pkg: PlatformApplicationPackageRecord | null = makePackageRecord()) {
  return {
    getById: jest.fn().mockResolvedValue(pkg),
  } as unknown as jest.Mocked<IPlatformApplicationPackageRepository>;
}

describe("installPackage() — Prerequisite Validations & Genuine Installing State (D1)", () => {
  test("creates a workspace installation in Installing status when all prerequisites are met (D1)", async () => {
    const instRepo = makeMockInstallationRepo();
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const result = await svc.installPackage({
      workspaceId: WORKSPACE_ID,
      packageId: PACKAGE_ID,
      actorUserId: ACTOR,
    });

    expect(result.workspaceId).toBe(WORKSPACE_ID);
    expect(result.packageId).toBe(PACKAGE_ID);
    expect(result.status).toBe(S.Installing);
    expect(result.installedAt).toBeNull();
    expect(instRepo.install).toHaveBeenCalledTimes(1);
  });

  test("throws InstallationPackageNotFoundError when package does not exist", async () => {
    const svc = new WorkspaceInstallationService(
      makeMockInstallationRepo(),
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo(null)
    );

    await expect(
      svc.installPackage({ workspaceId: WORKSPACE_ID, packageId: PACKAGE_ID, actorUserId: ACTOR })
    ).rejects.toThrow(InstallationPackageNotFoundError);
  });

  test("throws InstallationPackageNotPublishedError when package status is Draft (must be Published)", async () => {
    const draftPkg = makePackageRecord({ status: PLATFORM_APPLICATION_PACKAGE_STATUS.Draft });
    const svc = new WorkspaceInstallationService(
      makeMockInstallationRepo(),
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo(draftPkg)
    );

    await expect(
      svc.installPackage({ workspaceId: WORKSPACE_ID, packageId: PACKAGE_ID, actorUserId: ACTOR })
    ).rejects.toThrow(InstallationPackageNotPublishedError);
  });

  test("throws InstallationWorkspaceNotFoundError when target workspace does not exist", async () => {
    const svc = new WorkspaceInstallationService(
      makeMockInstallationRepo(),
      makeMockWorkspaceRepo(null),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    await expect(
      svc.installPackage({ workspaceId: WORKSPACE_ID, packageId: PACKAGE_ID, actorUserId: ACTOR })
    ).rejects.toThrow(InstallationWorkspaceNotFoundError);
  });

  test("throws InstallationWorkspaceNotActiveError when target workspace is Provisioning (must be Active)", async () => {
    const provWs = makeWorkspaceRecord({ status: "Provisioning" });
    const svc = new WorkspaceInstallationService(
      makeMockInstallationRepo(),
      makeMockWorkspaceRepo(provWs),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    await expect(
      svc.installPackage({ workspaceId: WORKSPACE_ID, packageId: PACKAGE_ID, actorUserId: ACTOR })
    ).rejects.toThrow(InstallationWorkspaceNotActiveError);
  });

  test("throws InstallationTenantNotActiveError when owning Tenant is Suspended (must be Active) (D4)", async () => {
    const suspendedTenant = makeTenantRecord({ status: "Suspended" });
    const svc = new WorkspaceInstallationService(
      makeMockInstallationRepo(),
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(suspendedTenant),
      makeMockPackageRepo()
    );

    await expect(
      svc.installPackage({ workspaceId: WORKSPACE_ID, packageId: PACKAGE_ID, actorUserId: ACTOR })
    ).rejects.toThrow(InstallationTenantNotActiveError);
  });

  test("throws DuplicateWorkspaceInstallationError when package is already installed in workspace", async () => {
    const instRepo = makeMockInstallationRepo({
      existsInstallation: jest.fn().mockResolvedValue(true),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    await expect(
      svc.installPackage({ workspaceId: WORKSPACE_ID, packageId: PACKAGE_ID, actorUserId: ACTOR })
    ).rejects.toThrow(DuplicateWorkspaceInstallationError);
  });
});

describe("completeInstallation() (Installing → Installed)", () => {
  test("transitions Installing installation to Installed status (D1 / D2)", async () => {
    const installingRec = makeInstallationRecord({ status: S.Installing, version: 1n });
    const installedRec = makeInstallationRecord({
      status: S.Installed,
      installedAt: new Date("2026-01-02T12:00:00Z"),
      version: 2n,
    });
    const instRepo = makeMockInstallationRepo({
      getById: jest.fn().mockResolvedValueOnce(installingRec).mockResolvedValueOnce(installedRec),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const result = await svc.completeInstallation({
      id: INSTALLATION_ID,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });

    expect(result.status).toBe(S.Installed);
    expect(result.installedAt).not.toBeNull();
    expect(instRepo.completeInstallation).toHaveBeenCalledWith(INSTALLATION_ID, ACTOR, 1n);
  });
});

describe("suspendInstallation() / resumeInstallation() / uninstallPackage()", () => {
  test("suspends an Installed installation", async () => {
    const installedRec = makeInstallationRecord({ status: S.Installed, version: 2n });
    const suspendedRec = makeInstallationRecord({ status: S.Suspended, version: 3n });
    const instRepo = makeMockInstallationRepo({
      getById: jest.fn().mockResolvedValueOnce(installedRec).mockResolvedValueOnce(suspendedRec),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const result = await svc.suspendInstallation({
      id: INSTALLATION_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Suspended);
    expect(instRepo.suspend).toHaveBeenCalledWith(INSTALLATION_ID, ACTOR, 2n);
  });

  test("resumes a Suspended installation", async () => {
    const suspendedRec = makeInstallationRecord({ status: S.Suspended, version: 3n });
    const installedRec = makeInstallationRecord({ status: S.Installed, version: 4n });
    const instRepo = makeMockInstallationRepo({
      getById: jest.fn().mockResolvedValueOnce(suspendedRec).mockResolvedValueOnce(installedRec),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const result = await svc.resumeInstallation({
      id: INSTALLATION_ID,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });

    expect(result.status).toBe(S.Installed);
    expect(instRepo.resume).toHaveBeenCalledWith(INSTALLATION_ID, ACTOR, 3n);
  });

  test("uninstalls an Installed installation", async () => {
    const installedRec = makeInstallationRecord({ status: S.Installed, version: 2n });
    const uninstalledRec = makeInstallationRecord({ status: S.Uninstalled, version: 3n });
    const instRepo = makeMockInstallationRepo({
      getById: jest.fn().mockResolvedValueOnce(installedRec).mockResolvedValueOnce(uninstalledRec),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const result = await svc.uninstallPackage({
      id: INSTALLATION_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Uninstalled);
    expect(instRepo.uninstall).toHaveBeenCalledWith(INSTALLATION_ID, ACTOR, 2n);
  });

  test("throws InvalidInstallationLifecycleTransitionError for invalid transition (Installing → Suspended)", async () => {
    const installingRec = makeInstallationRecord({ status: S.Installing });
    const instRepo = makeMockInstallationRepo({
      getById: jest.fn().mockResolvedValue(installingRec),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    await expect(
      svc.suspendInstallation({ id: INSTALLATION_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidInstallationLifecycleTransitionError);
  });
});

describe("Queries: getInstallation / getInstallationByPackage / listWorkspaceInstallations", () => {
  test("getInstallation returns installation or throws InstallationNotFoundError", async () => {
    const instRepo = makeMockInstallationRepo({
      getById: jest.fn().mockResolvedValue(makeInstallationRecord()),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const res = await svc.getInstallation(INSTALLATION_ID);
    expect(res.id).toBe(INSTALLATION_ID);

    instRepo.getById.mockResolvedValueOnce(null);
    await expect(svc.getInstallation("missing")).rejects.toThrow(InstallationNotFoundError);
  });

  test("listWorkspaceInstallations delegates to repository", async () => {
    const instRepo = makeMockInstallationRepo({
      listByWorkspace: jest.fn().mockResolvedValue([makeInstallationRecord()]),
    });
    const svc = new WorkspaceInstallationService(
      instRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantRepo(),
      makeMockPackageRepo()
    );

    const res = await svc.listWorkspaceInstallations({ workspaceId: WORKSPACE_ID });
    expect(res).toHaveLength(1);
  });
});
