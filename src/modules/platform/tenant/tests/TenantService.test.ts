// Unit tests for TenantService (mocked repository)
// Profile: smoke — no DB connection required

import { TenantService } from "../services/TenantService";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import {
  TenantNotFoundError,
  DuplicateTenantCodeError,
  DuplicateTenantNameError,
  InvalidTenantLifecycleTransitionError,
  ArchivedTenantImmutableError,
  TenantConcurrencyError,
  TenantValidationError,
} from "../domain/TenantErrors";
import { TENANT_STATUS } from "../models/TenantModels";
import type { TenantRecord } from "../models/TenantModels";

const TENANT_ID = "00000000-0000-0000-0000-000000000010";
const ACTOR = "00000000-0000-0000-0000-000000000001";
const S = TENANT_STATUS;

function makeRecord(overrides: Partial<TenantRecord> = {}): TenantRecord {
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

function makeMockRepo(
  overrides: Partial<Record<keyof ITenantRepository, jest.Mock>> = {}
): jest.Mocked<ITenantRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    activate: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    updateMetadata: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByCode: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue([]),
    existsCode: jest.fn().mockResolvedValue(false),
    existsName: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<ITenantRepository>;
}

describe("registerTenant()", () => {
  test("creates a Provisioning tenant", async () => {
    const repo = makeMockRepo();
    const svc = new TenantService(repo);

    const result = await svc.registerTenant({
      code: "acme-corp",
      name: "Acme Corporation",
      displayName: "Acme Corp",
      actorUserId: ACTOR,
    });

    expect(result.code).toBe("acme-corp");
    expect(result.status).toBe(S.Provisioning);
    expect(result.version).toBe(1n);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test("throws TenantValidationError for invalid code format", async () => {
    const svc = new TenantService(makeMockRepo());
    await expect(
      svc.registerTenant({
        code: "invalid code!",
        name: "Acme Corporation",
        displayName: "Acme Corp",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(TenantValidationError);
  });

  test("throws DuplicateTenantCodeError when code exists", async () => {
    const repo = makeMockRepo({ existsCode: jest.fn().mockResolvedValue(true) });
    const svc = new TenantService(repo);

    await expect(
      svc.registerTenant({
        code: "acme-corp",
        name: "Acme Corporation",
        displayName: "Acme Corp",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateTenantCodeError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  test("throws DuplicateTenantNameError when name exists", async () => {
    const repo = makeMockRepo({ existsName: jest.fn().mockResolvedValue(true) });
    const svc = new TenantService(repo);

    await expect(
      svc.registerTenant({
        code: "acme-corp",
        name: "Acme Corporation",
        displayName: "Acme Corp",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateTenantNameError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("activateTenant()", () => {
  test("activates a Provisioning tenant", async () => {
    const provisioning = makeRecord({ status: S.Provisioning, version: 1n });
    const active = makeRecord({ status: S.Active, version: 2n });
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValueOnce(provisioning).mockResolvedValueOnce(active),
    });
    const svc = new TenantService(repo);

    const result = await svc.activateTenant({
      id: TENANT_ID,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });

    expect(result.status).toBe(S.Active);
    expect(repo.activate).toHaveBeenCalledWith(TENANT_ID, ACTOR, 1n);
  });

  test("throws TenantNotFoundError when tenant missing", async () => {
    const svc = new TenantService(makeMockRepo());
    await expect(
      svc.activateTenant({ id: "missing", actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(TenantNotFoundError);
  });

  test("throws InvalidTenantLifecycleTransitionError for invalid transition (Provisioning → Suspended)", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Provisioning })),
    });
    const svc = new TenantService(repo);

    await expect(
      svc.suspendTenant({ id: TENANT_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidTenantLifecycleTransitionError);
  });
});

describe("suspendTenant()", () => {
  test("suspends an Active tenant", async () => {
    const active = makeRecord({ status: S.Active, version: 2n });
    const suspended = makeRecord({ status: S.Suspended, version: 3n });
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValueOnce(active).mockResolvedValueOnce(suspended),
    });
    const svc = new TenantService(repo);

    const result = await svc.suspendTenant({
      id: TENANT_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Suspended);
  });
});

describe("archiveTenant()", () => {
  test("archives a Suspended tenant", async () => {
    const suspended = makeRecord({ status: S.Suspended, version: 3n });
    const archived = makeRecord({ status: S.Archived, version: 4n });
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValueOnce(suspended).mockResolvedValueOnce(archived),
    });
    const svc = new TenantService(repo);

    const result = await svc.archiveTenant({
      id: TENANT_ID,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });

    expect(result.status).toBe(S.Archived);
  });

  test("throws InvalidTenantLifecycleTransitionError when archiving Active directly", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Active })),
    });
    const svc = new TenantService(repo);

    await expect(
      svc.archiveTenant({ id: TENANT_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidTenantLifecycleTransitionError);
  });
});

describe("updateTenantMetadata()", () => {
  test("updates metadata for non-archived tenant", async () => {
    const existing = makeRecord({ status: S.Active, version: 2n });
    const updated = makeRecord({ status: S.Active, displayName: "New Name", version: 3n });
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(updated),
    });
    const svc = new TenantService(repo);

    const result = await svc.updateTenantMetadata({
      id: TENANT_ID,
      displayName: "New Name",
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.displayName).toBe("New Name");
    expect(repo.updateMetadata).toHaveBeenCalledTimes(1);
  });

  test("throws ArchivedTenantImmutableError when editing Archived tenant", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Archived })),
    });
    const svc = new TenantService(repo);

    await expect(
      svc.updateTenantMetadata({
        id: TENANT_ID,
        displayName: "New Name",
        actorUserId: ACTOR,
        expectedVersion: 4n,
      })
    ).rejects.toThrow(ArchivedTenantImmutableError);
    expect(repo.updateMetadata).not.toHaveBeenCalled();
  });
});

describe("getById() / getByCode() / listTenants()", () => {
  test("getById returns record or throws TenantNotFoundError", async () => {
    const repo = makeMockRepo({ getById: jest.fn().mockResolvedValue(makeRecord()) });
    const svc = new TenantService(repo);
    const res = await svc.getById(TENANT_ID);
    expect(res.id).toBe(TENANT_ID);

    repo.getById.mockResolvedValueOnce(null);
    await expect(svc.getById("missing")).rejects.toThrow(TenantNotFoundError);
  });

  test("getByCode returns record or throws TenantNotFoundError", async () => {
    const repo = makeMockRepo({ getByCode: jest.fn().mockResolvedValue(makeRecord()) });
    const svc = new TenantService(repo);
    const res = await svc.getByCode("acme-corp");
    expect(res.code).toBe("acme-corp");

    repo.getByCode.mockResolvedValueOnce(null);
    await expect(svc.getByCode("missing")).rejects.toThrow(TenantNotFoundError);
  });

  test("listTenants delegates to repository", async () => {
    const repo = makeMockRepo({ list: jest.fn().mockResolvedValue([makeRecord()]) });
    const svc = new TenantService(repo);
    const res = await svc.listTenants();
    expect(res).toHaveLength(1);
  });
});
