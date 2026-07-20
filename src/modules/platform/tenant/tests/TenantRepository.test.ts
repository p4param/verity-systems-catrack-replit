// Unit tests for TenantRepository (mocked Prisma)
// Profile: smoke — no DB connection required

import { TenantRepository } from "../repositories/TenantRepository";
import {
  DuplicateTenantCodeError,
  DuplicateTenantNameError,
  TenantConcurrencyError,
} from "../domain/TenantErrors";
import { TENANT_STATUS } from "../models/TenantModels";
import type { TenantRecord } from "../models/TenantModels";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: jest.fn(),
    tenant: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  tenant: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const TENANT_ID = "00000000-0000-0000-0000-000000000010";
const ACTOR = "00000000-0000-0000-0000-000000000001";

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
    status: TENANT_STATUS.Provisioning,
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

let repo: TenantRepository;

beforeEach(() => {
  repo = new TenantRepository();
  jest.clearAllMocks();
});

describe("create()", () => {
  test("calls $executeRaw with INSERT", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.create(makeRecord());
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("translates code P2002 to DuplicateTenantCodeError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["code"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicateTenantCodeError);
  });

  test("translates name P2002 to DuplicateTenantNameError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["name"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicateTenantNameError);
  });

  test("re-throws unknown error", async () => {
    const err = new Error("unknown error");
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow("unknown error");
  });
});

describe.each([
  ["activate", "Active"],
  ["suspend", "Suspended"],
  ["archive", "Archived"],
] as const)("%s()", (method, status) => {
  test(`calls $executeRaw for ${method}`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await (repo as any)[method](TENANT_ID, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test(`throws TenantConcurrencyError when 0 rows affected`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect((repo as any)[method](TENANT_ID, ACTOR, 1n)).rejects.toThrow(
      TenantConcurrencyError
    );
  });
});

describe("getById()", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getById(TENANT_ID);
    expect(result).not.toBeNull();
    expect(result!.code).toBe("acme-corp");
  });

  test("returns null when not found", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getById(TENANT_ID);
    expect(result).toBeNull();
  });

  test("filters by isDeleted: false", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    await repo.getById(TENANT_ID);
    const call = mockPrisma.tenant.findFirst.mock.calls[0]![0];
    expect(call.where.isDeleted).toBe(false);
  });
});

describe("getByCode()", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getByCode("acme-corp");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("acme-corp");
  });

  test("returns null when not found", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getByCode("unknown");
    expect(result).toBeNull();
  });
});

describe("list()", () => {
  test("returns records", async () => {
    mockPrisma.tenant.findMany.mockResolvedValueOnce([makeRecord()]);
    const results = await repo.list({});
    expect(results).toHaveLength(1);
  });

  test("filters by status when provided", async () => {
    mockPrisma.tenant.findMany.mockResolvedValueOnce([]);
    await repo.list({ status: TENANT_STATUS.Active });
    const call = mockPrisma.tenant.findMany.mock.calls[0]![0];
    expect(call.where.status).toBe("Active");
  });
});

describe("existsCode() / existsName()", () => {
  test("existsCode returns true when count > 0", async () => {
    mockPrisma.tenant.count.mockResolvedValueOnce(1);
    expect(await repo.existsCode("acme-corp")).toBe(true);
  });

  test("existsCode returns false when count === 0", async () => {
    mockPrisma.tenant.count.mockResolvedValueOnce(0);
    expect(await repo.existsCode("unknown")).toBe(false);
  });

  test("existsName returns true when count > 0", async () => {
    mockPrisma.tenant.count.mockResolvedValueOnce(1);
    expect(await repo.existsName("Acme Corp")).toBe(true);
  });
});
