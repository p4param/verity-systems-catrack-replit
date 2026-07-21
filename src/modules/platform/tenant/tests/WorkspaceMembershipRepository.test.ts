// Unit tests for WorkspaceMembershipRepository (mocked Prisma)
// Profile: smoke — no DB connection required

import { WorkspaceMembershipRepository } from "../repositories/WorkspaceMembershipRepository";
import {
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipConcurrencyError,
} from "../domain/WorkspaceMembershipErrors";
import {
  WORKSPACE_MEMBERSHIP_STATUS,
  WORKSPACE_ROLE,
} from "../models/WorkspaceMembershipModels";
import type { WorkspaceMembershipRecord } from "../models/WorkspaceMembershipModels";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: jest.fn(),
    workspaceMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  workspaceMembership: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const TENANT_MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000050";
const MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000060";
const ACTOR = "00000000-0000-0000-0000-000000000002";

function makeRecord(
  overrides: Partial<WorkspaceMembershipRecord> = {}
): WorkspaceMembershipRecord {
  return {
    id: MEMBERSHIP_ID,
    workspaceId: WORKSPACE_ID,
    tenantMembershipId: TENANT_MEMBERSHIP_ID,
    workspaceRole: WORKSPACE_ROLE.Contributor,
    status: WORKSPACE_MEMBERSHIP_STATUS.Invited,
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

let repo: WorkspaceMembershipRepository;

beforeEach(() => {
  repo = new WorkspaceMembershipRepository();
  jest.clearAllMocks();
});

describe("invite()", () => {
  test("calls $executeRaw with INSERT", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.invite(makeRecord());
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("translates P2002 to DuplicateWorkspaceMembershipError", async () => {
    const err = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["workspace_id", "tenant_membership_id"] },
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.invite(makeRecord())).rejects.toThrow(
      DuplicateWorkspaceMembershipError
    );
  });

  test("translates FK P2003 on workspace to WorkspaceMembershipWorkspaceNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint workspace"), {
      code: "P2003",
      message: "foreign key constraint workspace",
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.invite(makeRecord())).rejects.toThrow(
      WorkspaceMembershipWorkspaceNotFoundError
    );
  });

  test("translates FK P2003 on tenant_membership to WorkspaceMembershipTenantMembershipNotFoundError", async () => {
    const err = Object.assign(new Error("FK constraint tenant_membership"), {
      code: "P2003",
      message: "foreign key constraint tenant_membership",
    });
    mockPrisma.$executeRaw.mockRejectedValueOnce(err);
    await expect(repo.invite(makeRecord())).rejects.toThrow(
      WorkspaceMembershipTenantMembershipNotFoundError
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

  test(`throws WorkspaceMembershipConcurrencyError when 0 rows affected`, async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect((repo as any)[method](MEMBERSHIP_ID, ACTOR, 1n)).rejects.toThrow(
      WorkspaceMembershipConcurrencyError
    );
  });
});

describe("updateRole()", () => {
  test("calls $executeRaw to update workspaceRole", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    await repo.updateRole(MEMBERSHIP_ID, WORKSPACE_ROLE.WorkspaceAdmin, ACTOR, 1n);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test("throws WorkspaceMembershipConcurrencyError when 0 rows affected", async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect(
      repo.updateRole(MEMBERSHIP_ID, WORKSPACE_ROLE.WorkspaceAdmin, ACTOR, 1n)
    ).rejects.toThrow(WorkspaceMembershipConcurrencyError);
  });
});

describe("getById()", () => {
  test("returns record when found", async () => {
    const record = makeRecord();
    mockPrisma.workspaceMembership.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getById(MEMBERSHIP_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(MEMBERSHIP_ID);
  });

  test("returns null when not found", async () => {
    mockPrisma.workspaceMembership.findFirst.mockResolvedValueOnce(null);
    const result = await repo.getById(MEMBERSHIP_ID);
    expect(result).toBeNull();
  });
});

describe("getByWorkspaceAndTenantMembership()", () => {
  test("queries by workspaceId and tenantMembershipId", async () => {
    const record = makeRecord();
    mockPrisma.workspaceMembership.findFirst.mockResolvedValueOnce(record);
    const result = await repo.getByWorkspaceAndTenantMembership(WORKSPACE_ID, TENANT_MEMBERSHIP_ID);
    expect(result).not.toBeNull();
    const call = mockPrisma.workspaceMembership.findFirst.mock.calls[0]![0];
    expect(call.where.workspaceId).toBe(WORKSPACE_ID);
    expect(call.where.tenantMembershipId).toBe(TENANT_MEMBERSHIP_ID);
  });
});

describe("listByWorkspace()", () => {
  test("returns records filtered by workspaceId", async () => {
    mockPrisma.workspaceMembership.findMany.mockResolvedValueOnce([makeRecord()]);
    const results = await repo.listByWorkspace({ workspaceId: WORKSPACE_ID });
    expect(results).toHaveLength(1);
    const call = mockPrisma.workspaceMembership.findMany.mock.calls[0]![0];
    expect(call.where.workspaceId).toBe(WORKSPACE_ID);
  });
});

describe("existsMembership()", () => {
  test("returns true when count > 0", async () => {
    mockPrisma.workspaceMembership.count.mockResolvedValueOnce(1);
    expect(await repo.existsMembership(WORKSPACE_ID, TENANT_MEMBERSHIP_ID)).toBe(true);
  });

  test("returns false when count === 0", async () => {
    mockPrisma.workspaceMembership.count.mockResolvedValueOnce(0);
    expect(await repo.existsMembership(WORKSPACE_ID, TENANT_MEMBERSHIP_ID)).toBe(false);
  });
});
