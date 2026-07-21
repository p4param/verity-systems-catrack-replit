// Unit tests for WorkspaceMembershipService (mocked repositories)
// Profile: smoke — no DB connection required

import { WorkspaceMembershipService } from "../services/WorkspaceMembershipService";
import type { IWorkspaceMembershipRepository } from "../contracts/IWorkspaceMembershipRepository";
import type { ITenantWorkspaceRepository } from "../contracts/ITenantWorkspaceRepository";
import type { ITenantMembershipRepository } from "../contracts/ITenantMembershipRepository";
import {
  WorkspaceMembershipNotFoundError,
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipWorkspaceNotActiveError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipTenantMembershipNotActiveError,
  WorkspaceMembershipTenantMismatchError,
  RemovedWorkspaceMembershipImmutableError,
  InvalidWorkspaceMembershipLifecycleTransitionError,
} from "../domain/WorkspaceMembershipErrors";
import {
  WORKSPACE_MEMBERSHIP_STATUS,
  WORKSPACE_ROLE,
} from "../models/WorkspaceMembershipModels";
import type { WorkspaceMembershipRecord } from "../models/WorkspaceMembershipModels";
import type { TenantWorkspaceRecord } from "../models/TenantWorkspaceModels";
import type { TenantMembershipRecord } from "../models/TenantMembershipModels";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const TENANT_MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000050";
const MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000060";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = WORKSPACE_MEMBERSHIP_STATUS;
const R = WORKSPACE_ROLE;

function makeWorkspaceMembershipRecord(
  overrides: Partial<WorkspaceMembershipRecord> = {}
): WorkspaceMembershipRecord {
  return {
    id: MEMBERSHIP_ID,
    workspaceId: WORKSPACE_ID,
    tenantMembershipId: TENANT_MEMBERSHIP_ID,
    workspaceRole: R.Contributor,
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

function makeWorkspaceRecord(
  overrides: Partial<TenantWorkspaceRecord> = {}
): TenantWorkspaceRecord {
  return {
    id: WORKSPACE_ID,
    tenantId: TENANT_ID,
    code: "main-ws",
    name: "Main Workspace",
    displayName: "Main Workspace",
    description: null,
    timeZone: "UTC",
    culture: "en-US",
    currency: "USD",
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

function makeTenantMembershipRecord(
  overrides: Partial<TenantMembershipRecord> = {}
): TenantMembershipRecord {
  return {
    id: TENANT_MEMBERSHIP_ID,
    tenantId: TENANT_ID,
    userId: "00000000-0000-0000-0000-000000000005",
    tenantRole: "Member",
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
  overrides: Partial<Record<keyof IWorkspaceMembershipRepository, jest.Mock>> = {}
): jest.Mocked<IWorkspaceMembershipRepository> {
  return {
    invite: jest.fn().mockResolvedValue(undefined),
    activate: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    updateRole: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByWorkspaceAndTenantMembership: jest.fn().mockResolvedValue(null),
    listByWorkspace: jest.fn().mockResolvedValue([]),
    existsMembership: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<IWorkspaceMembershipRepository>;
}

function makeMockWorkspaceRepo(ws: TenantWorkspaceRecord | null = makeWorkspaceRecord()) {
  return {
    getById: jest.fn().mockResolvedValue(ws),
  } as unknown as jest.Mocked<ITenantWorkspaceRepository>;
}

function makeMockTenantMembershipRepo(
  tm: TenantMembershipRecord | null = makeTenantMembershipRecord()
) {
  return {
    getById: jest.fn().mockResolvedValue(tm),
  } as unknown as jest.Mocked<ITenantMembershipRepository>;
}

describe("inviteToWorkspace() — Prerequisite Validations & Security Invariants", () => {
  test("creates a workspace membership when all prerequisites are met", async () => {
    const memRepo = makeMockMembershipRepo();
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    const result = await svc.inviteToWorkspace({
      workspaceId: WORKSPACE_ID,
      tenantMembershipId: TENANT_MEMBERSHIP_ID,
      workspaceRole: R.WorkspaceAdmin,
      actorUserId: ACTOR,
    });

    expect(result.workspaceId).toBe(WORKSPACE_ID);
    expect(result.tenantMembershipId).toBe(TENANT_MEMBERSHIP_ID);
    expect(result.workspaceRole).toBe(R.WorkspaceAdmin);
    expect(result.status).toBe(S.Invited);
    expect(memRepo.invite).toHaveBeenCalledTimes(1);
  });

  test("throws WorkspaceMembershipWorkspaceNotFoundError when workspace does not exist", async () => {
    const svc = new WorkspaceMembershipService(
      makeMockMembershipRepo(),
      makeMockWorkspaceRepo(null),
      makeMockTenantMembershipRepo()
    );

    await expect(
      svc.inviteToWorkspace({
        workspaceId: WORKSPACE_ID,
        tenantMembershipId: TENANT_MEMBERSHIP_ID,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipWorkspaceNotFoundError);
  });

  test("throws WorkspaceMembershipWorkspaceNotActiveError when target workspace is Suspended", async () => {
    const suspendedWs = makeWorkspaceRecord({ status: "Suspended" });
    const svc = new WorkspaceMembershipService(
      makeMockMembershipRepo(),
      makeMockWorkspaceRepo(suspendedWs),
      makeMockTenantMembershipRepo()
    );

    await expect(
      svc.inviteToWorkspace({
        workspaceId: WORKSPACE_ID,
        tenantMembershipId: TENANT_MEMBERSHIP_ID,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipWorkspaceNotActiveError);
  });

  test("throws WorkspaceMembershipTenantMembershipNotActiveError when target TenantMembership is Suspended (D2)", async () => {
    const suspendedTM = makeTenantMembershipRecord({ status: "Suspended" });
    const svc = new WorkspaceMembershipService(
      makeMockMembershipRepo(),
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo(suspendedTM)
    );

    await expect(
      svc.inviteToWorkspace({
        workspaceId: WORKSPACE_ID,
        tenantMembershipId: TENANT_MEMBERSHIP_ID,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipTenantMembershipNotActiveError);
  });

  test("CRITICAL SECURITY INVARIANT (D1): throws WorkspaceMembershipTenantMismatchError when tenantIds do not match", async () => {
    const otherTenantTM = makeTenantMembershipRecord({ tenantId: OTHER_TENANT_ID });
    const svc = new WorkspaceMembershipService(
      makeMockMembershipRepo(),
      makeMockWorkspaceRepo(), // tenantId = TENANT_ID
      makeMockTenantMembershipRepo(otherTenantTM) // tenantId = OTHER_TENANT_ID
    );

    await expect(
      svc.inviteToWorkspace({
        workspaceId: WORKSPACE_ID,
        tenantMembershipId: TENANT_MEMBERSHIP_ID,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipTenantMismatchError);
  });

  test("throws DuplicateWorkspaceMembershipError when membership already exists", async () => {
    const memRepo = makeMockMembershipRepo({
      existsMembership: jest.fn().mockResolvedValue(true),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    await expect(
      svc.inviteToWorkspace({
        workspaceId: WORKSPACE_ID,
        tenantMembershipId: TENANT_MEMBERSHIP_ID,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceMembershipError);
  });
});

describe("activateMembership() — TenantMembership Active Prerequisite (D2)", () => {
  test("activates Invited workspace membership when TenantMembership is Active", async () => {
    const invitedRec = makeWorkspaceMembershipRecord({ status: S.Invited, version: 1n });
    const activeRec = makeWorkspaceMembershipRecord({ status: S.Active, version: 2n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(invitedRec).mockResolvedValueOnce(activeRec),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    const result = await svc.activateMembership({
      id: MEMBERSHIP_ID,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });

    expect(result.status).toBe(S.Active);
    expect(memRepo.activate).toHaveBeenCalledWith(MEMBERSHIP_ID, ACTOR, 1n);
  });

  test("throws WorkspaceMembershipTenantMembershipNotActiveError when TenantMembership became Suspended (D2)", async () => {
    const invitedRec = makeWorkspaceMembershipRecord({ status: S.Invited, version: 1n });
    const suspendedTM = makeTenantMembershipRecord({ status: "Suspended" });

    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(invitedRec),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo(suspendedTM)
    );

    await expect(
      svc.activateMembership({
        id: MEMBERSHIP_ID,
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).rejects.toThrow(WorkspaceMembershipTenantMembershipNotActiveError);
  });
});

describe("suspendMembership() / removeMembership()", () => {
  test("suspends an Active workspace membership", async () => {
    const activeRec = makeWorkspaceMembershipRecord({ status: S.Active, version: 2n });
    const suspendedRec = makeWorkspaceMembershipRecord({ status: S.Suspended, version: 3n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(activeRec).mockResolvedValueOnce(suspendedRec),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    const result = await svc.suspendMembership({
      id: MEMBERSHIP_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Suspended);
    expect(memRepo.suspend).toHaveBeenCalledWith(MEMBERSHIP_ID, ACTOR, 2n);
  });

  test("removes an Active workspace membership", async () => {
    const activeRec = makeWorkspaceMembershipRecord({ status: S.Active, version: 2n });
    const removedRec = makeWorkspaceMembershipRecord({ status: S.Removed, version: 3n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(activeRec).mockResolvedValueOnce(removedRec),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    const result = await svc.removeMembership({
      id: MEMBERSHIP_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.status).toBe(S.Removed);
    expect(memRepo.remove).toHaveBeenCalledWith(MEMBERSHIP_ID, ACTOR, 2n);
  });

  test("throws InvalidWorkspaceMembershipLifecycleTransitionError for invalid transition", async () => {
    const invitedRec = makeWorkspaceMembershipRecord({ status: S.Invited });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(invitedRec),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    await expect(
      svc.suspendMembership({ id: MEMBERSHIP_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidWorkspaceMembershipLifecycleTransitionError);
  });
});

describe("updateWorkspaceRole()", () => {
  test("updates workspaceRole for Active membership", async () => {
    const existing = makeWorkspaceMembershipRecord({ status: S.Active, workspaceRole: R.Contributor, version: 2n });
    const updated = makeWorkspaceMembershipRecord({ status: S.Active, workspaceRole: R.WorkspaceAdmin, version: 3n });
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(updated),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    const result = await svc.updateWorkspaceRole({
      id: MEMBERSHIP_ID,
      workspaceRole: R.WorkspaceAdmin,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(result.workspaceRole).toBe(R.WorkspaceAdmin);
    expect(memRepo.updateRole).toHaveBeenCalledWith(MEMBERSHIP_ID, R.WorkspaceAdmin, ACTOR, 2n);
  });

  test("throws RemovedWorkspaceMembershipImmutableError when editing Removed membership", async () => {
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(makeWorkspaceMembershipRecord({ status: S.Removed })),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    await expect(
      svc.updateWorkspaceRole({
        id: MEMBERSHIP_ID,
        workspaceRole: R.WorkspaceAdmin,
        actorUserId: ACTOR,
        expectedVersion: 3n,
      })
    ).rejects.toThrow(RemovedWorkspaceMembershipImmutableError);
  });
});

describe("Queries", () => {
  test("getMembershipById returns record or throws WorkspaceMembershipNotFoundError", async () => {
    const memRepo = makeMockMembershipRepo({
      getById: jest.fn().mockResolvedValue(makeWorkspaceMembershipRecord()),
    });
    const svc = new WorkspaceMembershipService(
      memRepo,
      makeMockWorkspaceRepo(),
      makeMockTenantMembershipRepo()
    );

    const res = await svc.getMembershipById(MEMBERSHIP_ID);
    expect(res.id).toBe(MEMBERSHIP_ID);

    memRepo.getById.mockResolvedValueOnce(null);
    await expect(svc.getMembershipById("missing")).rejects.toThrow(WorkspaceMembershipNotFoundError);
  });
});
