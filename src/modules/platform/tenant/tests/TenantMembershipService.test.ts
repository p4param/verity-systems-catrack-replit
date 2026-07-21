// Unit tests for TenantMembershipService (mocked repositories & prisma)
// Profile: smoke — no DB connection required

import { TenantMembershipService } from "../services/TenantMembershipService";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import type { ITenantRepository } from "../contracts/ITenantRepository";
import {
  MembershipNotFoundError,
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipTenantNotActiveError,
  MembershipUserNotFoundError,
  RemovedMembershipImmutableError,
  InvalidMembershipLifecycleTransitionError,
} from "../domain/TenantMembershipErrors";
import {
  TENANT_MEMBERSHIP_STATUS,
  TENANT_ROLE,
} from "../models/TenantMembershipModels";
import type { TenantMembershipRecord } from "../models/TenantMembershipModels";
import type { TenantRecord } from "../models/TenantModels";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockUserPrisma = (prisma as any).user as { findFirst: jest.Mock };

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000005";
const MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000050";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = TENANT_MEMBERSHIP_STATUS;
const R = TENANT_ROLE;

function makeMembershipRecord(
  overrides: Partial<TenantMembershipRecord> = {}
): TenantMembershipRecord {
  return {
    id: MEMBERSHIP_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    tenantRole: R.Member,
    status: S.Invited,
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

function makeMockMembershipRepo(
  overrides: Partial<Record<keyof ITenantMembershipRepository, jest.Mock>> = {}
): jest.Mocked<ITenantMembershipRepository> {
  return {
    invite: jest.fn().mockResolvedValue(undefined),
    activate: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    updateRole: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByUserAndTenant: jest.fn().mockResolvedValue(null),
    listByTenant: jest.fn().mockResolvedValue([]),
    existsMembership: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<ITenantMembershipRepository>;
}

function makeMockTenantRepo(tenant: TenantRecord | null = makeTenantRecord()) {
  return {
    getById: jest.fn().mockResolvedValue(tenant),
  } as unknown as jest.Mocked<ITenantRepository>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserPrisma.findFirst.mockResolvedValue({ id: USER_ID });
});

describe("inviteUser() — Prerequisite Validations & Notification Scope (D3)", () => {
  test("creates a membership in Invited status when all prerequisites are met (D3)", async () => {
    const memRepo = makeMockMembershipRepo();
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const result = await svc.inviteUser({
      tenantId: TENANT_ID,
      userId: USER_ID,
      tenantRole: R.Admin,
      actorUserId: ACTOR,
    });

    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.userId).toBe(USER_ID);
    expect(result.tenantRole).toBe(R.Admin);
    expect(result.status).toBe(S.Invited);
    expect(memRepo.invite).toHaveBeenCalledTimes(1);
  });

  test("throws MembershipTenantNotFoundError when target tenant does not exist", async () => {
    const svc = new TenantMembershipService(
      makeMockMembershipRepo(),
      makeMockTenantRepo(null)
    );

    await expect(
      svc.inviteUser({ tenantId: TENANT_ID, userId: USER_ID, actorUserId: ACTOR })
    ).rejects.toThrow(MembershipTenantNotFoundError);
  });

  test("throws MembershipTenantNotActiveError when target tenant is Suspended (must be Active)", async () => {
    const suspendedTenant = makeTenantRecord({ status: "Suspended" });
    const svc = new TenantMembershipService(
      makeMockMembershipRepo(),
      makeMockTenantRepo(suspendedTenant)
    );

    await expect(
      svc.inviteUser({ tenantId: TENANT_ID, userId: USER_ID, actorUserId: ACTOR })
    ).rejects.toThrow(MembershipTenantNotActiveError);
  });

  test("throws MembershipUserNotFoundError when target user does not exist in identity domain (CM-002 / D1)", async () => {
    mockUserPrisma.findFirst.mockResolvedValueOnce(null);
    const svc = new TenantMembershipService(
      makeMockMembershipRepo(),
      makeMockTenantRepo()
    );

    await expect(
      svc.inviteUser({ tenantId: TENANT_ID, userId: USER_ID, actorUserId: ACTOR })
    ).rejects.toThrow(MembershipUserNotFoundError);
  });

  test("throws DuplicateTenantMembershipError when user is already a member of the tenant", async () => {
    const memRepo = makeMockMembershipRepo({
      existsMembership: jest.fn().mockResolvedValue(true),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    await expect(
      svc.inviteUser({ tenantId: TENANT_ID, userId: USER_ID, actorUserId: ACTOR })
    ).rejects.toThrow(DuplicateTenantMembershipError);
  });
});

describe("activateMembership() / suspendMembership() / removeMembership()", () => {
  test("activates an Invited membership", async () => {
    const invitedRec = makeMembershipRecord({ status: S.Invited, version: 1n });
    const activeRec = makeMembershipRecord({ status: S.Active, version: 2n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(invitedRec).mockResolvedValueOnce(activeRec),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const result = await svc.activateMembership({
      id: MEMBERSHIP_ID,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });

    expect(result.status).toBe(S.Active);
    expect(memRepo.activate).toHaveBeenCalledWith(MEMBERSHIP_ID, ACTOR, 1n);
  });

  test("suspends an Active membership", async () => {
    const activeRec = makeMembershipRecord({ status: S.Active, version: 2n });
    const suspendedRec = makeMembershipRecord({ status: S.Suspended, version: 3n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(activeRec).mockResolvedValueOnce(suspendedRec),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const result = await svc.suspendMembership({
      id: MEMBERSHIP_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Suspended);
    expect(memRepo.suspend).toHaveBeenCalledWith(MEMBERSHIP_ID, ACTOR, 2n);
  });

  test("removes an Active membership", async () => {
    const activeRec = makeMembershipRecord({ status: S.Active, version: 2n });
    const removedRec = makeMembershipRecord({ status: S.Removed, version: 3n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(activeRec).mockResolvedValueOnce(removedRec),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const result = await svc.removeMembership({
      id: MEMBERSHIP_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Removed);
    expect(memRepo.remove).toHaveBeenCalledWith(MEMBERSHIP_ID, ACTOR, 2n);
  });

  test("throws InvalidMembershipLifecycleTransitionError for invalid transition (Invited → Suspended)", async () => {
    const invitedRec = makeMembershipRecord({ status: S.Invited });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(invitedRec),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    await expect(
      svc.suspendMembership({ id: MEMBERSHIP_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidMembershipLifecycleTransitionError);
  });
});

describe("updateTenantRole()", () => {
  test("updates tenantRole for Active membership", async () => {
    const existing = makeMembershipRecord({ status: S.Active, tenantRole: R.Member, version: 2n });
    const updated = makeMembershipRecord({ status: S.Active, tenantRole: R.Admin, version: 3n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(updated),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const result = await svc.updateTenantRole({
      id: MEMBERSHIP_ID,
      tenantRole: R.Admin,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.tenantRole).toBe(R.Admin);
    expect(memRepo.updateRole).toHaveBeenCalledWith(MEMBERSHIP_ID, R.Admin, ACTOR, 2n);
  });

  test("throws RemovedMembershipImmutableError when editing Removed membership", async () => {
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(makeMembershipRecord({ status: S.Removed })),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    await expect(
      svc.updateTenantRole({
        id: MEMBERSHIP_ID,
        tenantRole: R.Admin,
        actorUserId: ACTOR,
        expectedVersion: 3n,
      })
    ).rejects.toThrow(RemovedMembershipImmutableError);
  });
});

describe("Queries: getMembershipById / getMembershipByUser / listTenantMemberships", () => {
  test("getMembershipById returns membership or throws MembershipNotFoundError", async () => {
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(makeMembershipRecord()),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const res = await svc.getMembershipById(MEMBERSHIP_ID);
    expect(res.id).toBe(MEMBERSHIP_ID);

    memRepo.getById.mockResolvedValueOnce(null);
    await expect(svc.getMembershipById("missing")).rejects.toThrow(MembershipNotFoundError);
  });

  test("listTenantMemberships delegates to repository", async () => {
    const memRepo = makeMockMembershipRepo({
      listByTenant: jest.fn().mockResolvedValue([makeMembershipRecord()]),
    });
    const svc = new TenantMembershipService(memRepo, makeMockTenantRepo());

    const res = await svc.listTenantMemberships({ tenantId: TENANT_ID });
    expect(res).toHaveLength(1);
  });
});
