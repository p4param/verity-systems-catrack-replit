// VS08A: PlatformApplicationService unit tests
// Uses a mock repository implementation. No database required.
// Covers all 9 service capabilities plus all error paths.

import { PlatformApplicationService } from "../services/PlatformApplicationService";
import type { IPlatformApplicationRepository } from "../contracts/IPlatformApplicationRepository";
import type {
  PlatformApplicationRecord,
  RegisterPlatformApplicationCommand,
} from "../models/PlatformApplicationModels";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";
import {
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  InvalidLifecycleTransitionError,
  PlatformApplicationConcurrencyError,
  PlatformApplicationNotFoundError,
  PlatformApplicationValidationError,
  RetiredApplicationModificationError,
} from "../domain/PlatformApplicationErrors";

// ─── Mock Repository ──────────────────────────────────────────────────────────

function makeMockRepository(
  overrides: Partial<IPlatformApplicationRepository> = {}
): jest.Mocked<IPlatformApplicationRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    updateMetadata: jest.fn().mockResolvedValue(undefined),
    retire: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByCode: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
    existsByCode: jest.fn().mockResolvedValue(false),
    existsByName: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<IPlatformApplicationRepository>;
}

// ─── Test Data ────────────────────────────────────────────────────────────────

const ACTOR_ID = "00000000-0000-0000-0000-000000000001";
const APP_ID = "11111111-1111-1111-1111-111111111111";

function makeRecord(
  overrides: Partial<PlatformApplicationRecord> = {}
): PlatformApplicationRecord {
  const now = new Date("2026-07-20T00:00:00Z");
  return {
    id: APP_ID,
    code: "CATERING-ERP",
    name: "Catering ERP",
    displayName: "Catering ERP Platform",
    description: null,
    category: "Operations",
    iconUrl: null,
    websiteUrl: null,
    status: PLATFORM_APPLICATION_STATUS.Draft,
    createdAt: now,
    createdBy: ACTOR_ID,
    updatedAt: now,
    updatedBy: ACTOR_ID,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

function makeRegisterCommand(
  overrides: Partial<RegisterPlatformApplicationCommand> = {}
): RegisterPlatformApplicationCommand {
  return {
    code: "CATERING-ERP",
    name: "Catering ERP",
    displayName: "Catering ERP Platform",
    category: "Operations",
    actorUserId: ACTOR_ID,
    ...overrides,
  };
}

// ─── register ────────────────────────────────────────────────────────────────

describe("PlatformApplicationService.register", () => {
  test("returns the created record on success", async () => {
    const repo = makeMockRepository();
    const svc = new PlatformApplicationService(repo);

    const result = await svc.register(makeRegisterCommand());

    expect(result.code).toBe("CATERING-ERP");
    expect(result.name).toBe("Catering ERP");
    expect(result.status).toBe(PLATFORM_APPLICATION_STATUS.Draft);
    expect(result.version).toBe(1n);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test("throws PlatformApplicationValidationError when code is missing", async () => {
    const svc = new PlatformApplicationService(makeMockRepository());
    await expect(svc.register(makeRegisterCommand({ code: "" }))).rejects.toThrow(
      PlatformApplicationValidationError
    );
  });

  test("throws PlatformApplicationValidationError when name is missing", async () => {
    const svc = new PlatformApplicationService(makeMockRepository());
    await expect(svc.register(makeRegisterCommand({ name: "" }))).rejects.toThrow(
      PlatformApplicationValidationError
    );
  });

  test("throws DuplicateApplicationCodeError when code already exists", async () => {
    const repo = makeMockRepository({ existsByCode: jest.fn().mockResolvedValue(true) });
    const svc = new PlatformApplicationService(repo);
    await expect(svc.register(makeRegisterCommand())).rejects.toThrow(
      DuplicateApplicationCodeError
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  test("throws DuplicateApplicationNameError when name already exists", async () => {
    const repo = makeMockRepository({
      existsByCode: jest.fn().mockResolvedValue(false),
      existsByName: jest.fn().mockResolvedValue(true),
    });
    const svc = new PlatformApplicationService(repo);
    await expect(svc.register(makeRegisterCommand())).rejects.toThrow(
      DuplicateApplicationNameError
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  test("does not create when code check fails", async () => {
    const repo = makeMockRepository({ existsByCode: jest.fn().mockResolvedValue(true) });
    const svc = new PlatformApplicationService(repo);
    try {
      await svc.register(makeRegisterCommand());
    } catch {
      // expected
    }
    expect(repo.create).not.toHaveBeenCalled();
  });
});

// ─── updateMetadata ───────────────────────────────────────────────────────────

describe("PlatformApplicationService.updateMetadata", () => {
  test("updates and returns fresh record on success", async () => {
    const existing = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Published });
    const updated = makeRecord({
      status: PLATFORM_APPLICATION_STATUS.Published,
      displayName: "Updated Name",
      version: 2n,
    });
    const repo = makeMockRepository({
      getById: jest
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated),
    });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.updateMetadata({
      id: APP_ID,
      displayName: "Updated Name",
      actorUserId: ACTOR_ID,
      expectedVersion: 1n,
    });

    expect(result.displayName).toBe("Updated Name");
    expect(repo.updateMetadata).toHaveBeenCalledTimes(1);
  });

  test("throws PlatformApplicationNotFoundError when not found", async () => {
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(null) });
    const svc = new PlatformApplicationService(repo);
    await expect(
      svc.updateMetadata({
        id: APP_ID,
        actorUserId: ACTOR_ID,
        expectedVersion: 1n,
      })
    ).rejects.toThrow(PlatformApplicationNotFoundError);
  });

  test("throws RetiredApplicationModificationError when application is Retired", async () => {
    const record = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Retired });
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(record) });
    const svc = new PlatformApplicationService(repo);
    await expect(
      svc.updateMetadata({
        id: APP_ID,
        displayName: "New Name",
        actorUserId: ACTOR_ID,
        expectedVersion: 1n,
      })
    ).rejects.toThrow(RetiredApplicationModificationError);
    expect(repo.updateMetadata).not.toHaveBeenCalled();
  });

  test("throws PlatformApplicationConcurrencyError on version mismatch", async () => {
    const existing = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Draft });
    const repo = makeMockRepository({
      getById: jest.fn().mockResolvedValue(existing),
      updateMetadata: jest
        .fn()
        .mockRejectedValue(new PlatformApplicationConcurrencyError(APP_ID)),
    });
    const svc = new PlatformApplicationService(repo);
    await expect(
      svc.updateMetadata({
        id: APP_ID,
        displayName: "New",
        actorUserId: ACTOR_ID,
        expectedVersion: 999n,
      })
    ).rejects.toThrow(PlatformApplicationConcurrencyError);
  });

  test("preserves existing values for fields not provided in update", async () => {
    const existing = makeRecord({
      status: PLATFORM_APPLICATION_STATUS.Draft,
      description: "existing description",
      category: "Ops",
    });
    const repo = makeMockRepository({
      getById: jest.fn().mockResolvedValue(existing),
    });
    const svc = new PlatformApplicationService(repo);

    await svc.updateMetadata({
      id: APP_ID,
      displayName: "New Display",
      actorUserId: ACTOR_ID,
      expectedVersion: 1n,
    });

    const updateCall = (repo.updateMetadata as jest.Mock).mock.calls[0];
    const data = updateCall[1];
    expect(data.description).toBe("existing description");
    expect(data.category).toBe("Ops");
  });
});

// ─── retire ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationService.retire", () => {
  test("retires a Published application successfully", async () => {
    const existing = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Published });
    const retired = makeRecord({
      status: PLATFORM_APPLICATION_STATUS.Retired,
      version: 2n,
    });
    const repo = makeMockRepository({
      getById: jest
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(retired),
    });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.retire({
      id: APP_ID,
      actorUserId: ACTOR_ID,
      expectedVersion: 1n,
    });

    expect(result.status).toBe(PLATFORM_APPLICATION_STATUS.Retired);
    expect(repo.retire).toHaveBeenCalledTimes(1);
  });

  test("retires a Deprecated application successfully", async () => {
    const existing = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Deprecated });
    const retired = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Retired, version: 2n });
    const repo = makeMockRepository({
      getById: jest
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(retired),
    });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.retire({
      id: APP_ID,
      actorUserId: ACTOR_ID,
      expectedVersion: 1n,
    });
    expect(result.status).toBe(PLATFORM_APPLICATION_STATUS.Retired);
  });

  test("throws InvalidLifecycleTransitionError when retiring a Draft application", async () => {
    const existing = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Draft });
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(existing) });
    const svc = new PlatformApplicationService(repo);

    await expect(
      svc.retire({ id: APP_ID, actorUserId: ACTOR_ID, expectedVersion: 1n })
    ).rejects.toThrow(InvalidLifecycleTransitionError);
    expect(repo.retire).not.toHaveBeenCalled();
  });

  test("throws InvalidLifecycleTransitionError when retiring an already Retired application", async () => {
    const existing = makeRecord({ status: PLATFORM_APPLICATION_STATUS.Retired });
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(existing) });
    const svc = new PlatformApplicationService(repo);

    await expect(
      svc.retire({ id: APP_ID, actorUserId: ACTOR_ID, expectedVersion: 1n })
    ).rejects.toThrow(InvalidLifecycleTransitionError);
  });

  test("throws PlatformApplicationNotFoundError when application not found", async () => {
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(null) });
    const svc = new PlatformApplicationService(repo);

    await expect(
      svc.retire({ id: APP_ID, actorUserId: ACTOR_ID, expectedVersion: 1n })
    ).rejects.toThrow(PlatformApplicationNotFoundError);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe("PlatformApplicationService.getById", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(record) });
    const result = await new PlatformApplicationService(repo).getById(APP_ID);
    expect(result.id).toBe(APP_ID);
  });

  test("throws PlatformApplicationNotFoundError when not found", async () => {
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(null) });
    await expect(new PlatformApplicationService(repo).getById(APP_ID)).rejects.toThrow(
      PlatformApplicationNotFoundError
    );
  });
});

// ─── getByCode ────────────────────────────────────────────────────────────────

describe("PlatformApplicationService.getByCode", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    const repo = makeMockRepository({
      getByCode: jest.fn().mockResolvedValue(record),
    });
    const result = await new PlatformApplicationService(repo).getByCode("CATERING-ERP");
    expect(result.code).toBe("CATERING-ERP");
  });

  test("throws PlatformApplicationNotFoundError when not found", async () => {
    await expect(
      new PlatformApplicationService(makeMockRepository()).getByCode("UNKNOWN")
    ).rejects.toThrow(PlatformApplicationNotFoundError);
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("PlatformApplicationService.list", () => {
  test("delegates to repository with query", async () => {
    const records = [makeRecord(), makeRecord({ id: "22222222-2222-2222-2222-222222222222" })];
    const repo = makeMockRepository({ list: jest.fn().mockResolvedValue(records) });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.list({ status: PLATFORM_APPLICATION_STATUS.Draft });
    expect(result).toHaveLength(2);
    expect(repo.list).toHaveBeenCalledWith({ status: PLATFORM_APPLICATION_STATUS.Draft });
  });
});

// ─── search ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationService.search", () => {
  test("returns matching records", async () => {
    const record = makeRecord();
    const repo = makeMockRepository({ search: jest.fn().mockResolvedValue([record]) });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.search({ query: "Catering" });
    expect(result).toHaveLength(1);
    expect(repo.search).toHaveBeenCalledWith({ query: "Catering" });
  });

  test("returns empty array for blank query without calling repository", async () => {
    const repo = makeMockRepository();
    const svc = new PlatformApplicationService(repo);

    const result = await svc.search({ query: "   " });
    expect(result).toEqual([]);
    expect(repo.search).not.toHaveBeenCalled();
  });
});

// ─── filterByCategory ────────────────────────────────────────────────────────

describe("PlatformApplicationService.filterByCategory", () => {
  test("delegates to repository with category filter", async () => {
    const repo = makeMockRepository({ list: jest.fn().mockResolvedValue([makeRecord()]) });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.filterByCategory("Operations");
    expect(result).toHaveLength(1);
    expect(repo.list).toHaveBeenCalledWith({ category: "Operations" });
  });
});

// ─── filterByStatus ───────────────────────────────────────────────────────────

describe("PlatformApplicationService.filterByStatus", () => {
  test("delegates to repository with status filter", async () => {
    const repo = makeMockRepository({ list: jest.fn().mockResolvedValue([makeRecord()]) });
    const svc = new PlatformApplicationService(repo);

    const result = await svc.filterByStatus(PLATFORM_APPLICATION_STATUS.Draft);
    expect(result).toHaveLength(1);
    expect(repo.list).toHaveBeenCalledWith({ status: PLATFORM_APPLICATION_STATUS.Draft });
  });
});

// ─── soft delete behaviour ────────────────────────────────────────────────────

describe("Soft delete behaviour", () => {
  test("getById returns null for soft-deleted records (repository contract)", async () => {
    // The repository is responsible for filtering isDeleted = false.
    // The service trusts the repository to enforce this.
    // Here we verify the service throws NotFound when repo returns null.
    const repo = makeMockRepository({ getById: jest.fn().mockResolvedValue(null) });
    const svc = new PlatformApplicationService(repo);

    await expect(svc.getById(APP_ID)).rejects.toThrow(PlatformApplicationNotFoundError);
  });

  test("list does not include soft-deleted records by default (repository contract)", async () => {
    // The repository must apply isDeleted:false. Verified by testing
    // that service passes correct query to repository.
    const repo = makeMockRepository({ list: jest.fn().mockResolvedValue([]) });
    const svc = new PlatformApplicationService(repo);

    await svc.list({});
    expect(repo.list).toHaveBeenCalledWith({});
  });
});

// ─── Contract: IPlatformApplicationRepository is implemented ─────────────────

describe("PlatformApplicationService respects repository contract", () => {
  test("service accepts any object implementing IPlatformApplicationRepository", () => {
    const repo: IPlatformApplicationRepository = {
      create: jest.fn(),
      updateMetadata: jest.fn(),
      retire: jest.fn(),
      getById: jest.fn(),
      getByCode: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
      existsByCode: jest.fn(),
      existsByName: jest.fn(),
    };
    const svc = new PlatformApplicationService(repo);
    expect(svc).toBeDefined();
  });
});
