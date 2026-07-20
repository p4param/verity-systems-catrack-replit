// Unit tests for TenantWorkspaceService (mocked repositories)
// Profile: smoke — no DB connection required

import { TenantWorkspaceService } from "../services/TenantWorkspaceService";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import {
  WorkspaceNotFoundError,
  WorkspaceTenantNotFoundError,
  DuplicateWorkspaceCodeError,
  DuplicateWorkspaceNameError,
  InvalidWorkspaceLifecycleTransitionError,
  ArchivedWorkspaceImmutableError,
  WorkspaceValidationError,
} from "../domain/TenantWorkspaceErrors";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import type { TenantWorkspaceRecord } from "../models/TenantWorkspaceModels";
import type { TenantRecord } from "../models/TenantModels";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = TENANT_WORKSPACE_STATUS;

function makeRecord(overrides: Partial<TenantWorkspaceRecord> = {}): TenantWorkspaceRecord {
  return {
    id: WORKSPACE_ID,
    tenantId: TENANT_ID,
    code: "dev-workspace",
    name: "Development Workspace",
    displayName: "Dev Environment",
    description: null,
    timeZone: "UTC",
    culture: "en-US",
    currency: "USD",
    status: S.Provisioning,
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

function makeTenantRecord(): TenantRecord {
  return {
    id: TENANT_ID,
    code: "acme-corp",
    name: "Acme Corporation",
    displayName: "Acme Corp",
    description: null,
    logoUrl: null,
    defaultTimeZone: "Europe/London",
    defaultCulture: "en-GB",
    defaultCurrency: "GBP",
    status: "Active",
    createdAt: new Date(),
    createdBy: ACTOR,
    updatedAt: new Date(),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
  };
}

function makeMockWorkspaceRepo(
  overrides: Partial<Record<keyof ITenantWorkspaceRepository, jest.Mock>> = {}
): jest.Mocked<ITenantWorkspaceRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    activate: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    updateMetadata: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByCode: jest.fn().mockResolvedValue(null),
    listByTenant: jest.fn().mockResolvedValue([]),
    existsCode: jest.fn().mockResolvedValue(false),
    existsName: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<ITenantWorkspaceRepository>;
}

function makeMockTenantRepo(
  tenantRecord: TenantRecord | null = makeTenantRecord()
): jest.Mocked<ITenantRepository> {
  return {
    create: jest.fn(),
    activate: jest.fn(),
    suspend: jest.fn(),
    archive: jest.fn(),
    updateMetadata: jest.fn(),
    getById: jest.fn().mockResolvedValue(tenantRecord),
    getByCode: jest.fn(),
    list: jest.fn(),
    existsCode: jest.fn(),
    existsName: jest.fn(),
  } as jest.Mocked<ITenantRepository>;
}

describe("createWorkspace()", () => {
  test("creates a Provisioning workspace and inherits parent Tenant default settings (D3 / ADR-008-014)", async () => {
    const wsRepo = makeMockWorkspaceRepo();
    const tenantRepo = makeMockTenantRepo();
    const svc = new TenantWorkspaceService(wsRepo, tenantRepo);

    const result = await svc.createWorkspace({
      tenantId: TENANT_ID,
      code: "dev-workspace",
      name: "Development Workspace",
      displayName: "Dev Environment",
      actorUserId: ACTOR,
    });

    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.code).toBe("dev-workspace");
    expect(result.status).toBe(S.Provisioning);
    // Inherited from parent Tenant defaults:
    expect(result.timeZone).toBe("Europe/London");
    expect(result.culture).toBe("en-GB");
    expect(result.currency).toBe("GBP");
    expect(wsRepo.create).toHaveBeenCalledTimes(1);
  });

  test("explicit command settings override parent Tenant default settings", async () => {
    const wsRepo = makeMockWorkspaceRepo();
    const tenantRepo = makeMockTenantRepo();
    const svc = new TenantWorkspaceService(wsRepo, tenantRepo);

    const result = await svc.createWorkspace({
      tenantId: TENANT_ID,
      code: "us-workspace",
      name: "US Workspace",
      displayName: "US Workspace",
      timeZone: "America/Chicago",
      currency: "USD",
      actorUserId: ACTOR,
    });

    expect(result.timeZone).toBe("America/Chicago");
    expect(result.culture).toBe("en-GB"); // inherited defaultCulture
    expect(result.currency).toBe("USD"); // explicit override
  });

  test("throws WorkspaceTenantNotFoundError when parent Tenant does not exist", async () => {
    const wsRepo = makeMockWorkspaceRepo();
    const tenantRepo = makeMockTenantRepo(null); // parent tenant absent
    const svc = new TenantWorkspaceService(wsRepo, tenantRepo);

    await expect(
      svc.createWorkspace({
        tenantId: "missing-tenant",
        code: "dev-workspace",
        name: "Development Workspace",
        displayName: "Dev",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceTenantNotFoundError);
    expect(wsRepo.create).not.toHaveBeenCalled();
  });

  test("throws DuplicateWorkspaceCodeError when code exists in owning Tenant", async () => {
    const wsRepo = makeMockWorkspaceRepo({ existsCode: jest.fn().mockResolvedValue(true) });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    await expect(
      svc.createWorkspace({
        tenantId: TENANT_ID,
        code: "dev-workspace",
        name: "Development Workspace",
        displayName: "Dev",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceCodeError);
    expect(wsRepo.create).not.toHaveBeenCalled();
  });

  test("throws DuplicateWorkspaceNameError when name exists in owning Tenant", async () => {
    const wsRepo = makeMockWorkspaceRepo({ existsName: jest.fn().mockResolvedValue(true) });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    await expect(
      svc.createWorkspace({
        tenantId: TENANT_ID,
        code: "dev-workspace",
        name: "Development Workspace",
        displayName: "Dev",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceNameError);
  });
});

describe("activateWorkspace() / suspendWorkspace() / archiveWorkspace()", () => {
  test("activates a Provisioning workspace", async () => {
    const p = makeRecord({ status: S.Provisioning, version: 1n });
    const a = makeRecord({ status: S.Active, version: 2n });
    const wsRepo = makeMockWorkspaceRepo({
      getById: jest.fn().mockResolvedValueOnce(p).mockResolvedValueOnce(a),
    });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    const result = await svc.activateWorkspace({
      id: WORKSPACE_ID,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });

    expect(result.status).toBe(S.Active);
    expect(wsRepo.activate).toHaveBeenCalledWith(WORKSPACE_ID, ACTOR, 1n);
  });

  test("throws InvalidWorkspaceLifecycleTransitionError for invalid transition (Provisioning → Suspended)", async () => {
    const wsRepo = makeMockWorkspaceRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Provisioning })),
    });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    await expect(
      svc.suspendWorkspace({ id: WORKSPACE_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidWorkspaceLifecycleTransitionError);
  });
});

describe("updateWorkspaceMetadata()", () => {
  test("updates metadata for active workspace", async () => {
    const existing = makeRecord({ status: S.Active, version: 2n });
    const updated = makeRecord({ status: S.Active, displayName: "New Dev", version: 3n });
    const wsRepo = makeMockWorkspaceRepo({
      getById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(updated),
    });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    const result = await svc.updateWorkspaceMetadata({
      id: WORKSPACE_ID,
      displayName: "New Dev",
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.displayName).toBe("New Dev");
    expect(wsRepo.updateMetadata).toHaveBeenCalledTimes(1);
  });

  test("throws ArchivedWorkspaceImmutableError when editing Archived workspace", async () => {
    const wsRepo = makeMockWorkspaceRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Archived })),
    });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    await expect(
      svc.updateWorkspaceMetadata({
        id: WORKSPACE_ID,
        displayName: "New Dev",
        actorUserId: ACTOR,
        expectedVersion: 4n,
      })
    ).rejects.toThrow(ArchivedWorkspaceImmutableError);
    expect(wsRepo.updateMetadata).not.toHaveBeenCalled();
  });
});

describe("Queries: getWorkspaceById / getWorkspaceByCode / listWorkspacesByTenant", () => {
  test("getWorkspaceById returns workspace or throws WorkspaceNotFoundError", async () => {
    const wsRepo = makeMockWorkspaceRepo({ getById: jest.fn().mockResolvedValue(makeRecord()) });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    const res = await svc.getWorkspaceById(WORKSPACE_ID);
    expect(res.id).toBe(WORKSPACE_ID);

    wsRepo.getById.mockResolvedValueOnce(null);
    await expect(svc.getWorkspaceById("missing")).rejects.toThrow(WorkspaceNotFoundError);
  });

  test("getWorkspaceByCode returns workspace or throws WorkspaceNotFoundError", async () => {
    const wsRepo = makeMockWorkspaceRepo({ getByCode: jest.fn().mockResolvedValue(makeRecord()) });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    const res = await svc.getWorkspaceByCode(TENANT_ID, "dev-workspace");
    expect(res.code).toBe("dev-workspace");

    wsRepo.getByCode.mockResolvedValueOnce(null);
    await expect(svc.getWorkspaceByCode(TENANT_ID, "missing")).rejects.toThrow(WorkspaceNotFoundError);
  });

  test("listWorkspacesByTenant delegates to repository", async () => {
    const wsRepo = makeMockWorkspaceRepo({ listByTenant: jest.fn().mockResolvedValue([makeRecord()]) });
    const svc = new TenantWorkspaceService(wsRepo, makeMockTenantRepo());

    const res = await svc.listWorkspacesByTenant({ tenantId: TENANT_ID });
    expect(res).toHaveLength(1);
  });
});
