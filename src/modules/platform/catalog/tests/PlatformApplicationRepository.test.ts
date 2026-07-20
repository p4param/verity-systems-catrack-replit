// VS08A: PlatformApplicationRepository unit tests
// Tests the repository implementation with mocked Prisma.
// Verifies: create/read/update/retire/search operations, optimistic concurrency
// error propagation, and unique constraint rethrow behavior.

import { PlatformApplicationRepository } from "../repositories/PlatformApplicationRepository";
import type { IPlatformApplicationRepository } from "../contracts/IPlatformApplicationRepository";
import type { PlatformApplicationRecord } from "../models/PlatformApplicationModels";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";
import {
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  PlatformApplicationConcurrencyError,
} from "../domain/PlatformApplicationErrors";

// ─── Prisma Mock ──────────────────────────────────────────────────────────────

const mockExecuteRaw = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
    platformApplication: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

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

// Prisma ORM returns camelCase fields (column mapping is transparent)
function makePrismaRow(overrides: Partial<PlatformApplicationRecord> = {}) {
  return makeRecord(overrides);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Contract ─────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository contract", () => {
  test("implements IPlatformApplicationRepository", () => {
    const repo: IPlatformApplicationRepository = new PlatformApplicationRepository();
    expect(repo).toBeDefined();
    expect(typeof repo.create).toBe("function");
    expect(typeof repo.updateMetadata).toBe("function");
    expect(typeof repo.retire).toBe("function");
    expect(typeof repo.getById).toBe("function");
    expect(typeof repo.getByCode).toBe("function");
    expect(typeof repo.list).toBe("function");
    expect(typeof repo.search).toBe("function");
    expect(typeof repo.existsByCode).toBe("function");
    expect(typeof repo.existsByName).toBe("function");
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.create", () => {
  test("calls $executeRaw and resolves when successful", async () => {
    mockExecuteRaw.mockResolvedValue(1);
    const repo = new PlatformApplicationRepository();
    await expect(repo.create(makeRecord())).resolves.toBeUndefined();
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
  });

  test("rethrows DuplicateApplicationCodeError on P2002 code violation", async () => {
    mockExecuteRaw.mockRejectedValue({
      code: "P2002",
      meta: { target: ["code"] },
    });
    const repo = new PlatformApplicationRepository();
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicateApplicationCodeError);
  });

  test("rethrows DuplicateApplicationNameError on P2002 name violation", async () => {
    mockExecuteRaw.mockRejectedValue({
      code: "P2002",
      meta: { target: ["name"] },
    });
    const repo = new PlatformApplicationRepository();
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicateApplicationNameError);
  });

  test("propagates non-P2002 errors unchanged", async () => {
    const original = new Error("unexpected db error");
    mockExecuteRaw.mockRejectedValue(original);
    const repo = new PlatformApplicationRepository();
    await expect(repo.create(makeRecord())).rejects.toThrow("unexpected db error");
  });
});

// ─── updateMetadata ───────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.updateMetadata", () => {
  test("resolves when one row is affected", async () => {
    mockExecuteRaw.mockResolvedValue(1);
    const repo = new PlatformApplicationRepository();
    await expect(
      repo.updateMetadata(
        APP_ID,
        {
          displayName: "Updated",
          description: null,
          category: "Ops",
          iconUrl: null,
          websiteUrl: null,
        },
        ACTOR_ID,
        1n
      )
    ).resolves.toBeUndefined();
  });

  test("throws PlatformApplicationConcurrencyError when zero rows affected", async () => {
    mockExecuteRaw.mockResolvedValue(0);
    const repo = new PlatformApplicationRepository();
    await expect(
      repo.updateMetadata(
        APP_ID,
        {
          displayName: "Updated",
          description: null,
          category: "Ops",
          iconUrl: null,
          websiteUrl: null,
        },
        ACTOR_ID,
        999n
      )
    ).rejects.toThrow(PlatformApplicationConcurrencyError);
  });
});

// ─── retire ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.retire", () => {
  test("resolves when one row is affected", async () => {
    mockExecuteRaw.mockResolvedValue(1);
    const repo = new PlatformApplicationRepository();
    await expect(repo.retire(APP_ID, ACTOR_ID, 1n)).resolves.toBeUndefined();
  });

  test("throws PlatformApplicationConcurrencyError when zero rows affected", async () => {
    mockExecuteRaw.mockResolvedValue(0);
    const repo = new PlatformApplicationRepository();
    await expect(repo.retire(APP_ID, ACTOR_ID, 999n)).rejects.toThrow(
      PlatformApplicationConcurrencyError
    );
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.getById", () => {
  test("returns mapped record when found", async () => {
    mockFindFirst.mockResolvedValue(makePrismaRow());
    const repo = new PlatformApplicationRepository();
    const result = await repo.getById(APP_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(APP_ID);
    expect(result!.code).toBe("CATERING-ERP");
    expect(result!.version).toBe(1n);
  });

  test("returns null when not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const repo = new PlatformApplicationRepository();
    const result = await repo.getById(APP_ID);
    expect(result).toBeNull();
  });

  test("queries with isDeleted: false", async () => {
    mockFindFirst.mockResolvedValue(null);
    const repo = new PlatformApplicationRepository();
    await repo.getById(APP_ID);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isDeleted: false }) })
    );
  });
});

// ─── getByCode ────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.getByCode", () => {
  test("trims whitespace from code before query (RC-005: no uppercase normalization)", async () => {
    mockFindFirst.mockResolvedValue(null);
    const repo = new PlatformApplicationRepository();
    await repo.getByCode("  CATERING-ERP  ");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ code: "CATERING-ERP" }),
      })
    );
  });

  test("returns mapped record when found", async () => {
    mockFindFirst.mockResolvedValue(makePrismaRow());
    const repo = new PlatformApplicationRepository();
    const result = await repo.getByCode("CATERING-ERP");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("CATERING-ERP");
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.list", () => {
  test("returns mapped records", async () => {
    const rows = [makePrismaRow(), makePrismaRow({ id: "22222222-2222-2222-2222-222222222222" })];
    mockFindMany.mockResolvedValue(rows);
    const repo = new PlatformApplicationRepository();
    const result = await repo.list({});
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe("CATERING-ERP");
  });

  test("filters by status when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    const repo = new PlatformApplicationRepository();
    await repo.list({ status: PLATFORM_APPLICATION_STATUS.Published });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "Published" }),
      })
    );
  });

  test("filters by category when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    const repo = new PlatformApplicationRepository();
    await repo.list({ category: "Operations" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "Operations" }),
      })
    );
  });

  test("excludes soft-deleted by default", async () => {
    mockFindMany.mockResolvedValue([]);
    const repo = new PlatformApplicationRepository();
    await repo.list({});
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      })
    );
  });
});

// ─── search ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.search", () => {
  test("calls findMany with OR conditions and returns results", async () => {
    mockFindMany.mockResolvedValue([makePrismaRow()]);
    const repo = new PlatformApplicationRepository();
    const result = await repo.search({ query: "Catering" });
    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  test("filters by status and category in search", async () => {
    mockFindMany.mockResolvedValue([]);
    const repo = new PlatformApplicationRepository();
    await repo.search({
      query: "test",
      status: PLATFORM_APPLICATION_STATUS.Published,
      category: "Operations",
    });
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.status).toBe("Published");
    expect(call.where.category).toBe("Operations");
  });
});

// ─── existsByCode ────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.existsByCode", () => {
  test("returns true when count > 0", async () => {
    mockCount.mockResolvedValue(1);
    const repo = new PlatformApplicationRepository();
    expect(await repo.existsByCode("CATERING-ERP")).toBe(true);
  });

  test("returns false when count === 0", async () => {
    mockCount.mockResolvedValue(0);
    const repo = new PlatformApplicationRepository();
    expect(await repo.existsByCode("UNKNOWN")).toBe(false);
  });
});

// ─── existsByName ────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository.existsByName", () => {
  test("returns true when count > 0", async () => {
    mockCount.mockResolvedValue(1);
    const repo = new PlatformApplicationRepository();
    expect(await repo.existsByName("Catering ERP")).toBe(true);
  });

  test("returns false when count === 0", async () => {
    mockCount.mockResolvedValue(0);
    const repo = new PlatformApplicationRepository();
    expect(await repo.existsByName("Unknown")).toBe(false);
  });
});
