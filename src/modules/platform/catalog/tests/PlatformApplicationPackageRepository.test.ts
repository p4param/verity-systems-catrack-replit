// Unit tests for PlatformApplicationPackageRepository (mocked Prisma)
// Profile: smoke — no DB connection required

import { PlatformApplicationPackageRepository } from "../repositories/PlatformApplicationPackageRepository";
import {
  DuplicatePackageVersionError,
  PackageApplicationNotFoundError,
  PackageConcurrencyError,
} from "../domain/PlatformApplicationPackageErrors";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../models/PlatformApplicationPackageModels";
import type { PlatformApplicationPackageRecord } from "../models/PlatformApplicationPackageModels";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: jest.fn(),
    platformApplicationPackage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  platformApplicationPackage: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const APP_ID = "00000000-0000-0000-0000-000000000001";
const PKG_ID = "00000000-0000-0000-0000-000000000010";
const ACTOR = "00000000-0000-0000-0000-000000000002";

function makeRecord(
  overrides: Partial<PlatformApplicationPackageRecord> = {}
): PlatformApplicationPackageRecord {
  return {
    id: PKG_ID,
    applicationId: APP_ID,
    packageVersion: "1.0.0",
    displayName: "Test Package",
    description: null,
    releaseNotes: null,
    status: PLATFORM_APPLICATION_PACKAGE_STATUS.Draft,
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

/**
 * The Prisma model stores SemVer as 'semVer' (mapped from package_version).
 * The repository's toRecord() translates semVer → packageVersion.
 */
function makePrismaRow(overrides: Partial<PlatformApplicationPackageRecord> = {}) {
  const r = makeRecord(overrides);
  return {
    ...r,
    semVer: r.packageVersion, // Prisma field name
  };
}

// ─── Repository ──────────────────────────────────────────────────────────────

let repo: PlatformApplicationPackageRepository;

beforeEach(() => {
  repo = new PlatformApplicationPackageRepository();
  jest.clearAllMocks();
});

// ─── create() ─────────────────────────────────────────────────────────────────

describe("create()", () => {
  test("calls $executeRaw with INSERT", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.create(makeRecord());
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("translates P2002 unique violation to DuplicatePackageVersionError", async () => {
    const err = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicatePackageVersionError);
  });

  test("translates PostgreSQL 23505 to DuplicatePackageVersionError", async () => {
    const err = Object.assign(new Error("23505"), {
      cause: { code: "23505" },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicatePackageVersionError);
  });

  test("translates P2003 FK violation to PackageApplicationNotFoundError", async () => {
    const err = Object.assign(new Error("FK violation"), { code: "P2003" });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(PackageApplicationNotFoundError);
  });

  test("translates PostgreSQL 23503 to PackageApplicationNotFoundError", async () => {
    const err = Object.assign(new Error("23503 foreign key"), {
      cause: { code: "23503" },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(PackageApplicationNotFoundError);
  });

  test("re-throws unknown errors", async () => {
    const err = new Error("unknown error");
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow("unknown error");
  });

  test("DuplicatePackageVersionError carries applicationId and packageVersion", async () => {
    const err = Object.assign(new Error("Unique"), { code: "P2002" });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    try {
      await repo.create(makeRecord());
    } catch (e) {
      const typed = e as DuplicatePackageVersionError;
      expect(typed.applicationId).toBe(APP_ID);
      expect(typed.packageVersion).toBe("1.0.0");
    }
  });
});

// ─── publish() / deprecate() / archive() ─────────────────────────────────────

describe.each([
  ["publish", "status='Published'"],
  ["deprecate", "status='Deprecated'"],
  ["archive", "status='Archived'"],
] as const)("%s()", (method) => {
  test(`calls $executeRaw for ${method}`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await (repo as any)[method](PKG_ID, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test(`throws PackageConcurrencyError when 0 rows affected`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect((repo as any)[method](PKG_ID, ACTOR, 1n)).rejects.toThrow(
      PackageConcurrencyError
    );
  });

  test("PackageConcurrencyError carries packageId", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    try {
      await (repo as any)[method](PKG_ID, ACTOR, 1n);
    } catch (e) {
      expect((e as PackageConcurrencyError).packageId).toBe(PKG_ID);
    }
  });
});

// ─── getById() ────────────────────────────────────────────────────────────────

describe("getById()", () => {
  test("returns a record when found", async () => {
    const row = makePrismaRow();
    mockPrisma.platformApplicationPackage.findFirst.mockResolvedValueOnce(row);
    const result = await repo.getById(PKG_ID);
    expect(result).not.toBeNull();
    expect(result!.packageVersion).toBe("1.0.0");
    expect(result!.id).toBe(PKG_ID);
  });

  test("returns null when not found", async () => {
    mockPrisma.platformApplicationPackage.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getById(PKG_ID);
    expect(result).toBeNull();
  });

  test("filters by isDeleted: false", async () => {
    mockPrisma.platformApplicationPackage.findFirst.mockResolvedValueOnce(null);
    await repo.getById(PKG_ID);
    const call = mockPrisma.platformApplicationPackage.findFirst.mock.calls[0]![0];
    expect(call.where.isDeleted).toBe(false);
  });
});

// ─── getByVersion() ───────────────────────────────────────────────────────────

describe("getByVersion()", () => {
  test("queries with applicationId and semVer", async () => {
    const row = makePrismaRow();
    mockPrisma.platformApplicationPackage.findFirst.mockResolvedValueOnce(row);
    const result = await repo.getByVersion(APP_ID, "1.0.0");
    expect(result).not.toBeNull();
    expect(result!.packageVersion).toBe("1.0.0");
    const call = mockPrisma.platformApplicationPackage.findFirst.mock.calls[0]![0];
    expect(call.where.applicationId).toBe(APP_ID);
    expect(call.where.semVer).toBe("1.0.0");
  });

  test("returns null when not found", async () => {
    mockPrisma.platformApplicationPackage.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getByVersion(APP_ID, "9.9.9");
    expect(result).toBeNull();
  });
});

// ─── listByApplication() ──────────────────────────────────────────────────────

describe("listByApplication()", () => {
  test("returns multiple records", async () => {
    const rows = [makePrismaRow({ packageVersion: "1.0.0" }), makePrismaRow({ packageVersion: "1.1.0" })].map(
      (r) => ({ ...r, semVer: r.packageVersion })
    );
    mockPrisma.platformApplicationPackage.findMany.mockResolvedValueOnce(rows);
    const result = await repo.listByApplication({ applicationId: APP_ID });
    expect(result).toHaveLength(2);
  });

  test("filters by status when provided", async () => {
    mockPrisma.platformApplicationPackage.findMany.mockResolvedValueOnce([]);
    await repo.listByApplication({
      applicationId: APP_ID,
      status: PLATFORM_APPLICATION_PACKAGE_STATUS.Published,
    });
    const call = mockPrisma.platformApplicationPackage.findMany.mock.calls[0]![0];
    expect(call.where.status).toBe("Published");
  });

  test("excludes soft-deleted records by default", async () => {
    mockPrisma.platformApplicationPackage.findMany.mockResolvedValueOnce([]);
    await repo.listByApplication({ applicationId: APP_ID });
    const call = mockPrisma.platformApplicationPackage.findMany.mock.calls[0]![0];
    expect(call.where.isDeleted).toBe(false);
  });

  test("includes soft-deleted records when includeDeleted is true", async () => {
    mockPrisma.platformApplicationPackage.findMany.mockResolvedValueOnce([]);
    await repo.listByApplication({ applicationId: APP_ID, includeDeleted: true });
    const call = mockPrisma.platformApplicationPackage.findMany.mock.calls[0]![0];
    expect(call.where.isDeleted).toBeUndefined();
  });
});

// ─── existsVersion() ──────────────────────────────────────────────────────────

describe("existsVersion()", () => {
  test("returns true when count > 0", async () => {
    mockPrisma.platformApplicationPackage.count.mockResolvedValueOnce(1);
    const result = await repo.existsVersion(APP_ID, "1.0.0");
    expect(result).toBe(true);
  });

  test("returns false when count === 0", async () => {
    mockPrisma.platformApplicationPackage.count.mockResolvedValueOnce(0);
    const result = await repo.existsVersion(APP_ID, "1.0.0");
    expect(result).toBe(false);
  });
});
