// Unit tests for TenantMembershipRepository (mocked Prisma)
// Profile: smoke — no DB connection required

import { TenantMembershipRepository } from "../repositories/TenantMembershipRepository";
import {
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipUserNotFoundError,
  TenantMembershipConcurrencyError,
} from "../domain/TenantMembershipErrors";
import {
  TENANT_MEMBERSHIP_STATUS,
  TENANT_ROLE,
} from "../models/TenantMembershipModels";
import type { TenantMembershipRecord } from "../models/TenantMembershipModels";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: jest.fn(),
    tenantMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  tenantMembership: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000005";
const MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000050";
const ACTOR = "00000000-0000-0000-0000-000000000002";

function makeRecord(
  overrides: Partial<TenantMembershipRecord> = {}
): TenantMembershipRecord {
  return {
    id: MEMBERSHIP_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    tenantRole: TENANT_ROLE.Member,
    status: TENANT_MEMBERSHIP_STATUS.Invited,
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

let repo: TenantMembershipRepository;

beforeEach(() => {
  repo = new TenantMembershipRepository();
  jest.clearAllMocks();
});

describe("invite()", () => {
  test("calls $executeRaw with INSERT", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.invite(makeRecord());
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("translates P2002 to DuplicateTenantMembershipError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["tenant_id", "user_id"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.invite(makeRecord())).rejects.toThrow(
      DuplicateTenantMembershipError
    );
  });

  test("translates FK P2003 on tenant to MembershipTenantNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint tenants"), {
      code: "P2003",
      message: "foreign key constraint tenants",
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.invite(makeRecord())).rejects.toThrow(
      MembershipTenantNotFoundError
    );
  });

  test("translates FK P2003 on user to MembershipUserNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint users"), {
      code: "P2003",
      message: "foreign key constraint users",
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.invite(makeRecord())).rejects.toThrow(
      MembershipUserNotFoundError
    );
  });
});

describe.each([
  ["activate", "Active"],
  ["suspend", "Suspended"],
  ["remove", "Removed"],
] as const)("%s()", (method, status) => {
  test(`calls $executeRaw for ${method}`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await (repo as any)[method](MEMBERSHIP_ID, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test(`throws TenantMembershipConcurrencyError when 0 rows affected`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect((repo as any)[method](MEMBERSHIP_ID, ACTOR, 1n)).rejects.toThrow(
      TenantMembershipConcurrencyError
    );
  });
});

describe("updateRole()", () => {
  test("calls $executeRaw to update tenantRole", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.updateRole(MEMBERSHIP_ID, TENANT_ROLE.Admin, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("throws TenantMembershipConcurrencyError when 0 rows affected", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect(
      repo.updateRole(MEMBERSHIP_ID, TENANT_ROLE.Admin, ACTOR, 1n)
    ).rejects.toThrow(TenantMembershipConcurrencyError);
  });
});

describe("getById()", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    mockPrisma.tenantMembership.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getById(MEMBERSHIP_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(MEMBERSHIP_ID);
  });

  test("returns null when not found", async () => {
    mockPrisma.tenantMembership.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getById(MEMBERSHIP_ID);
    expect(result).toBeNull();
  });
});

describe("getByUserAndTenant()", () => {
  test("queries by tenantId and userId", async () => {
    const record = makeRecord();
    mockPrisma.tenantMembership.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getByUserAndTenant(TENANT_ID, USER_ID);
    expect(result).not.toBeNull();
    const call = mockPrisma.tenantMembership.findFirst.mock.calls[0]![0];
    expect(call.where.tenantId).toBe(TENANT_ID);
    expect(call.where.userId).toBe(USER_ID);
  });
});

describe("listByTenant()", () => {
  test("returns records filtered by tenantId", async () => {
    mockPrisma.tenantMembership.findMany.mockResolvedValueOnce([makeRecord()]);
    const results = await repo.listByTenant({ tenantId: TENANT_ID });
    expect(results).toHaveLength(1);
    const call = mockPrisma.tenantMembership.findMany.mock.calls[0]![0];
    expect(call.where.tenantId).toBe(TENANT_ID);
  });
});

describe("existsMembership()", () => {
  test("returns true when count > 0", async () => {
    mockPrisma.tenantMembership.count.mockResolvedValueOnce(1);
    expect(await repo.existsMembership(TENANT_ID, USER_ID)).toBe(true);
  });

  test("returns false when count === 0", async () => {
    mockPrisma.tenantMembership.count.mockResolvedValueOnce(0);
    expect(await repo.existsMembership(TENANT_ID, USER_ID)).toBe(false);
  });
});
