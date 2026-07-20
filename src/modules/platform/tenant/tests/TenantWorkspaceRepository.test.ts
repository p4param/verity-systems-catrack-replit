// Unit tests for TenantWorkspaceRepository (mocked Prisma)
// Profile: smoke — no DB connection required

import { TenantWorkspaceRepository } from "../repositories/TenantWorkspaceRepository";
import {
  DuplicateWorkspaceCodeError,
  DuplicateWorkspaceNameError,
  WorkspaceTenantNotFoundError,
  WorkspaceConcurrencyError,
} from "../domain/TenantWorkspaceErrors";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import type { TenantWorkspaceRecord } from "../models/TenantWorkspaceModels";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: jest.fn(),
    tenantWorkspace: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  tenantWorkspace: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const ACTOR = "00000000-0000-0000-0000-000000000002";

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
    status: TENANT_WORKSPACE_STATUS.Provisioning,
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

let repo: TenantWorkspaceRepository;

beforeEach(() => {
  repo = new TenantWorkspaceRepository();
  jest.clearAllMocks();
});

describe("create()", () => {
  test("calls $executeRaw with INSERT", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.create(makeRecord());
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("translates code P2002 to DuplicateWorkspaceCodeError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["code"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicateWorkspaceCodeError);
  });

  test("translates name P2002 to DuplicateWorkspaceNameError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["name"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(DuplicateWorkspaceNameError);
  });

  test("translates FK P2003 to WorkspaceTenantNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint"), { code: "P2003" });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.create(makeRecord())).rejects.toThrow(WorkspaceTenantNotFoundError);
  });
});

describe.each([
  ["activate", "Active"],
  ["suspend", "Suspended"],
  ["archive", "Archived"],
] as const)("%s()", (method, status) => {
  test(`calls $executeRaw for ${method}`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await (repo as any)[method](WORKSPACE_ID, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test(`throws WorkspaceConcurrencyError when 0 rows affected`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect((repo as any)[method](WORKSPACE_ID, ACTOR, 1n)).rejects.toThrow(
      WorkspaceConcurrencyError
    );
  });
});

describe("getById()", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    mockPrisma.tenantWorkspace.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getById(WORKSPACE_ID);
    expect(result).not.toBeNull();
    expect(result!.code).toBe("dev-workspace");
  });

  test("returns null when not found", async () => {
    mockPrisma.tenantWorkspace.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getById(WORKSPACE_ID);
    expect(result).toBeNull();
  });
});

describe("getByCode()", () => {
  test("queries by tenantId and code", async () => {
    const record = makeRecord();
    mockPrisma.tenantWorkspace.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getByCode(TENANT_ID, "dev-workspace");
    expect(result).not.toBeNull();
    const call = mockPrisma.tenantWorkspace.findFirst.mock.calls[0]![0];
    expect(call.where.tenantId).toBe(TENANT_ID);
    expect(call.where.code).toBe("dev-workspace");
  });
});

describe("listByTenant()", () => {
  test("returns records filtered by tenantId", async () => {
    mockPrisma.tenantWorkspace.findMany.mockResolvedValueOnce([makeRecord()]);
    const results = await repo.listByTenant({ tenantId: TENANT_ID });
    expect(results).toHaveLength(1);
    const call = mockPrisma.tenantWorkspace.findMany.mock.calls[0]![0];
    expect(call.where.tenantId).toBe(TENANT_ID);
  });
});

describe("existsCode() / existsName()", () => {
  test("existsCode returns true when count > 0", async () => {
    mockPrisma.tenantWorkspace.count.mockResolvedValueOnce(1);
    expect(await repo.existsCode(TENANT_ID, "dev-workspace")).toBe(true);
  });

  test("existsName returns true when count > 0", async () => {
    mockPrisma.tenantWorkspace.count.mockResolvedValueOnce(1);
    expect(await repo.existsName(TENANT_ID, "Development Workspace")).toBe(true);
  });
});
