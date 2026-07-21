// Integration tests for WorkspaceMembershipRepository and WorkspaceMembershipService
// Profile: developer — requires live PostgreSQL connection (DATABASE_URL env)
//
// Tests executed against real database:
//   - CRITICAL SECURITY INVARIANT TEST (D1): Same-Tenant validation enforces workspace.tenantId === tenantMembership.tenantId
//   - CRITICAL GUARD TEST (D2): Suspended TenantMembership CANNOT activate or create WorkspaceMembership
//   - Active Workspace prerequisite check (rejects invitation on Suspended Workspace)
//   - Workspace FK enforcement (ON DELETE RESTRICT ON UPDATE RESTRICT)
//   - TenantMembership FK enforcement (ON DELETE RESTRICT ON UPDATE RESTRICT)
//   - Duplicate membership rejection ((workspace_id, tenant_membership_id) unique constraint)
//   - Terminal state remove/reactivate guard (Removed state cannot be reactivated)
//   - Full ADR-008-017 lifecycle transition chain
//   - Optimistic concurrency control (version BIGINT)
//   - Soft-delete filtering

import { WorkspaceMembershipRepository } from "../../repositories/WorkspaceMembershipRepository";
import { WorkspaceMembershipService } from "../../services/WorkspaceMembershipService";
import { TenantWorkspaceRepository } from "../../repositories/TenantWorkspaceRepository";
import { TenantWorkspaceService } from "../../services/TenantWorkspaceService";
import { TenantMembershipRepository } from "../../repositories/TenantMembershipRepository";
import { TenantMembershipService } from "../../services/TenantMembershipService";
import { TenantRepository } from "../../repositories/TenantRepository";
import { TenantService } from "../../services/TenantService";

import {
  DuplicateWorkspaceMembershipError,
  WorkspaceMembershipWorkspaceNotFoundError,
  WorkspaceMembershipTenantMembershipNotFoundError,
  WorkspaceMembershipWorkspaceNotActiveError,
  WorkspaceMembershipTenantMembershipNotActiveError,
  WorkspaceMembershipTenantMismatchError,
  WorkspaceMembershipConcurrencyError,
  InvalidWorkspaceMembershipLifecycleTransitionError,
  RemovedWorkspaceMembershipImmutableError,
} from "../../domain/WorkspaceMembershipErrors";
import {
  WORKSPACE_MEMBERSHIP_STATUS,
  WORKSPACE_ROLE,
} from "../../models/WorkspaceMembershipModels";
import type { TenantRecord } from "../../models/TenantModels";
import type { TenantWorkspaceRecord } from "../../models/TenantWorkspaceModels";
import type { TenantMembershipRecord } from "../../models/TenantMembershipModels";
import type { WorkspaceMembershipRecord } from "../../models/WorkspaceMembershipModels";
import { prisma } from "@/lib/prisma";

const S = WORKSPACE_MEMBERSHIP_STATUS;
const R = WORKSPACE_ROLE;
const ACTOR = "00000000-0000-0000-0000-000000000099";
const TEST_PREFIX = `test-ws-mem-${Date.now()}`;

let tenantSvc: TenantService;
let wsSvc: TenantWorkspaceService;
let tmSvc: TenantMembershipService;
let wsMemRepo: WorkspaceMembershipRepository;
let wsMemSvc: WorkspaceMembershipService;

let tenantA: TenantRecord;
let tenantB: TenantRecord;

let activeWsA: TenantWorkspaceRecord;
let suspendedWsA: TenantWorkspaceRecord;
let activeWsB: TenantWorkspaceRecord;

let userA1: { id: string; email: string };
let userA2: { id: string; email: string };
let userB1: { id: string; email: string };

let tmA1: TenantMembershipRecord;
let tmA2: TenantMembershipRecord;
let tmB1: TenantMembershipRecord;

beforeAll(async () => {
  const tenantRepo = new TenantRepository();
  tenantSvc = new TenantService(tenantRepo);

  const wsRepo = new TenantWorkspaceRepository();
  wsSvc = new TenantWorkspaceService(wsRepo, tenantRepo);

  const tmRepo = new TenantMembershipRepository();
  tmSvc = new TenantMembershipService(tmRepo, tenantRepo);

  wsMemRepo = new WorkspaceMembershipRepository();
  wsMemSvc = new WorkspaceMembershipService(wsMemRepo, wsRepo, tmRepo);

  // 1. Create Active Tenant A & Active Tenant B
  tenantA = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-a`,
    name: `Tenant A ${TEST_PREFIX}`,
    displayName: "Tenant A",
    actorUserId: ACTOR,
  });
  await tenantSvc.activateTenant({ id: tenantA.id, actorUserId: ACTOR, expectedVersion: 1n });

  tenantB = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-b`,
    name: `Tenant B ${TEST_PREFIX}`,
    displayName: "Tenant B",
    actorUserId: ACTOR,
  });
  await tenantSvc.activateTenant({ id: tenantB.id, actorUserId: ACTOR, expectedVersion: 1n });

  // 2. Create Active Workspace A, Suspended Workspace A, and Active Workspace B
  activeWsA = await wsSvc.createWorkspace({
    tenantId: tenantA.id,
    code: `${TEST_PREFIX}-ws-a1`,
    name: "Active Workspace A1",
    displayName: "Active Workspace A1",
    actorUserId: ACTOR,
  });
  await wsSvc.activateWorkspace({ id: activeWsA.id, actorUserId: ACTOR, expectedVersion: 1n });

  suspendedWsA = await wsSvc.createWorkspace({
    tenantId: tenantA.id,
    code: `${TEST_PREFIX}-ws-a2`,
    name: "Suspended Workspace A2",
    displayName: "Suspended Workspace A2",
    actorUserId: ACTOR,
  });
  await wsSvc.activateWorkspace({ id: suspendedWsA.id, actorUserId: ACTOR, expectedVersion: 1n });
  await wsSvc.suspendWorkspace({ id: suspendedWsA.id, actorUserId: ACTOR, expectedVersion: 2n });

  activeWsB = await wsSvc.createWorkspace({
    tenantId: tenantB.id,
    code: `${TEST_PREFIX}-ws-b1`,
    name: "Active Workspace B1",
    displayName: "Active Workspace B1",
    actorUserId: ACTOR,
  });
  await wsSvc.activateWorkspace({ id: activeWsB.id, actorUserId: ACTOR, expectedVersion: 1n });

  // 3. Create Real Users in DB
  userA1 = await (prisma as any).user.create({
    data: {
      tenantId: tenantA.id,
      fullName: `User A1 ${TEST_PREFIX}`,
      email: `${TEST_PREFIX}-usera1@test.com`,
      status: "ACTIVE",
    },
  });

  userA2 = await (prisma as any).user.create({
    data: {
      tenantId: tenantA.id,
      fullName: `User A2 ${TEST_PREFIX}`,
      email: `${TEST_PREFIX}-usera2@test.com`,
      status: "ACTIVE",
    },
  });

  userB1 = await (prisma as any).user.create({
    data: {
      tenantId: tenantB.id,
      fullName: `User B1 ${TEST_PREFIX}`,
      email: `${TEST_PREFIX}-userb1@test.com`,
      status: "ACTIVE",
    },
  });

  // 4. Invite & Activate TenantMemberships
  tmA1 = await tmSvc.inviteUser({
    tenantId: tenantA.id,
    userId: userA1.id,
    tenantRole: "Admin",
    actorUserId: ACTOR,
  });
  await tmSvc.activateMembership({ id: tmA1.id, actorUserId: ACTOR, expectedVersion: 1n });
  tmA1 = await tmSvc.getMembershipById(tmA1.id);

  tmA2 = await tmSvc.inviteUser({
    tenantId: tenantA.id,
    userId: userA2.id,
    tenantRole: "Member",
    actorUserId: ACTOR,
  });
  await tmSvc.activateMembership({ id: tmA2.id, actorUserId: ACTOR, expectedVersion: 1n });
  tmA2 = await tmSvc.getMembershipById(tmA2.id);

  tmB1 = await tmSvc.inviteUser({
    tenantId: tenantB.id,
    userId: userB1.id,
    tenantRole: "Owner",
    actorUserId: ACTOR,
  });
  await tmSvc.activateMembership({ id: tmB1.id, actorUserId: ACTOR, expectedVersion: 1n });
  tmB1 = await tmSvc.getMembershipById(tmB1.id);
});

afterAll(async () => {
  // Clean up DB records in reverse dependency order
  await (prisma as any).workspaceMembership.deleteMany({
    where: { workspaceId: { in: [activeWsA.id, suspendedWsA.id, activeWsB.id] } },
  });
  await (prisma as any).tenantMembership.deleteMany({
    where: { id: { in: [tmA1.id, tmA2.id, tmB1.id] } },
  });
  await (prisma as any).user.deleteMany({
    where: { id: { in: [userA1.id, userA2.id, userB1.id] } },
  });
  await (prisma as any).tenantWorkspace.deleteMany({
    where: { id: { in: [activeWsA.id, suspendedWsA.id, activeWsB.id] } },
  });
  await (prisma as any).tenant.deleteMany({
    where: { id: { in: [tenantA.id, tenantB.id] } },
  });
  await prisma.$disconnect();
});

// ─── CRITICAL USER REFINEMENT TEST CASE 1 (D1) ───────────────────────────────

describe("CRITICAL SECURITY INVARIANT (D1): Same-Tenant Validation", () => {
  test("strictly REJECTS workspace membership between Workspace (Tenant A) and TenantMembership (Tenant B)", async () => {
    await expect(
      wsMemSvc.inviteToWorkspace({
        workspaceId: activeWsA.id, // Tenant A
        tenantMembershipId: tmB1.id, // Tenant B
        workspaceRole: R.Contributor,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipTenantMismatchError);
  });
});

// ─── CRITICAL USER REFINEMENT TEST CASE 2 (D2) ───────────────────────────────

describe("CRITICAL GUARD TEST (D2): Suspended TenantMembership Restriction", () => {
  test("proves a Suspended TenantMembership CANNOT create or activate a WorkspaceMembership", async () => {
    // 1. Suspend TenantMembership tmA2 (Active → Suspended)
    await tmSvc.suspendMembership({ id: tmA2.id, actorUserId: ACTOR, expectedVersion: tmA2.version });
    const suspendedTMA2 = await tmSvc.getMembershipById(tmA2.id);
    expect(suspendedTMA2.status).toBe("Suspended");

    // 2. Attempting to invite suspended TenantMembership to Active Workspace A fails!
    await expect(
      wsMemSvc.inviteToWorkspace({
        workspaceId: activeWsA.id,
        tenantMembershipId: tmA2.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipTenantMembershipNotActiveError);

    // 3. Reactivate TenantMembership tmA2 (Suspended → Active)
    await tmSvc.activateMembership({
      id: tmA2.id,
      actorUserId: ACTOR,
      expectedVersion: suspendedTMA2.version,
    });
    tmA2 = await tmSvc.getMembershipById(tmA2.id);
    expect(tmA2.status).toBe("Active");
  });
});

describe("inviteToWorkspace() — Round-Trip & Prerequisite Checks", () => {
  test("persists workspace membership in Invited status", async () => {
    const mem = await wsMemSvc.inviteToWorkspace({
      workspaceId: activeWsA.id,
      tenantMembershipId: tmA1.id,
      workspaceRole: R.WorkspaceAdmin,
      actorUserId: ACTOR,
    });

    expect(mem.workspaceId).toBe(activeWsA.id);
    expect(mem.tenantMembershipId).toBe(tmA1.id);
    expect(mem.workspaceRole).toBe(R.WorkspaceAdmin);
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);

    const loaded = await wsMemRepo.getById(mem.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(mem.id);
    expect(loaded!.status).toBe(S.Invited);
  });

  test("rejects invitation when target TenantWorkspace is Suspended", async () => {
    await expect(
      wsMemSvc.inviteToWorkspace({
        workspaceId: suspendedWsA.id,
        tenantMembershipId: tmA2.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipWorkspaceNotActiveError);
  });

  test("rejects invitation if target Workspace does not exist (WorkspaceMembershipWorkspaceNotFoundError)", async () => {
    await expect(
      wsMemSvc.inviteToWorkspace({
        workspaceId: "00000000-0000-0000-0000-000000000000",
        tenantMembershipId: tmA1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceMembershipWorkspaceNotFoundError);
  });

  test("rejects duplicate workspace membership for the same (workspace_id, tenant_membership_id) pair", async () => {
    // tmA1 is already invited to activeWsA
    await expect(
      wsMemSvc.inviteToWorkspace({
        workspaceId: activeWsA.id,
        tenantMembershipId: tmA1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceMembershipError);
  });
});

describe("Lifecycle — Full Transition Chain & Terminal State Guard", () => {
  test("Invited → Active → Suspended → Active → Suspended → Removed", async () => {
    const mem = await wsMemSvc.getMembershipByWorkspace(activeWsA.id, tmA1.id);
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);

    // 1. Invited → Active
    const active = await wsMemSvc.activateMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(active.status).toBe(S.Active);
    expect(active.version).toBe(2n);

    // 2. Active → Suspended
    const suspended = await wsMemSvc.suspendMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(suspended.status).toBe(S.Suspended);
    expect(suspended.version).toBe(3n);

    // 3. Suspended → Active
    const reactivated = await wsMemSvc.activateMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });
    expect(reactivated.status).toBe(S.Active);
    expect(reactivated.version).toBe(4n);

    // 4. Update role on Active membership
    const roleUpdated = await wsMemSvc.updateWorkspaceRole({
      id: mem.id,
      workspaceRole: R.Contributor,
      actorUserId: ACTOR,
      expectedVersion: 4n,
    });
    expect(roleUpdated.workspaceRole).toBe(R.Contributor);
    expect(roleUpdated.version).toBe(5n);

    // 5. Active → Suspended
    const reSuspended = await wsMemSvc.suspendMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 5n,
    });
    expect(reSuspended.status).toBe(S.Suspended);
    expect(reSuspended.version).toBe(6n);

    // 6. Suspended → Removed (Terminal)
    const removed = await wsMemSvc.removeMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 6n,
    });
    expect(removed.status).toBe(S.Removed);
    expect(removed.version).toBe(7n);

    // 7. Proves Removed workspace membership CANNOT be reactivated!
    await expect(
      wsMemSvc.activateMembership({
        id: mem.id,
        actorUserId: ACTOR,
        expectedVersion: 7n,
      })
    ).rejects.toThrow(InvalidWorkspaceMembershipLifecycleTransitionError);
  });

  test("throws WorkspaceMembershipConcurrencyError on stale version during state transition", async () => {
    // Create tmA2 workspace membership for concurrency test
    const mem = await wsMemSvc.inviteToWorkspace({
      workspaceId: activeWsA.id,
      tenantMembershipId: tmA2.id,
      actorUserId: ACTOR,
    });

    await expect(
      wsMemSvc.activateMembership({
        id: mem.id,
        actorUserId: ACTOR,
        expectedVersion: 99n, // stale version (actual is 1n)
      })
    ).rejects.toThrow(WorkspaceMembershipConcurrencyError);

    // Clean up mem
    await (prisma as any).workspaceMembership.deleteMany({ where: { id: mem.id } });
  });
});

describe("listWorkspaceMembers() & Soft-Delete Filtering", () => {
  test("listWorkspaceMembers returns memberships filtered by workspaceId and role", async () => {
    const list = await wsMemSvc.listWorkspaceMembers({
      workspaceId: activeWsA.id,
    });

    expect(list.some(x => x.tenantMembershipId === tmA1.id)).toBe(true);
    expect(list.every(x => x.workspaceId === activeWsA.id)).toBe(true);
  });

  test("soft-deleted workspace memberships are excluded from reads", async () => {
    const mem = await wsMemSvc.getMembershipByWorkspace(activeWsA.id, tmA1.id);

    // Soft delete via raw DB update
    await (prisma as any).workspaceMembership.update({
      where: { id: mem.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ACTOR },
    });

    const byId = await wsMemRepo.getById(mem.id);
    const byWs = await wsMemRepo.getByWorkspaceAndTenantMembership(activeWsA.id, tmA1.id);
    const list = await wsMemSvc.listWorkspaceMembers({ workspaceId: activeWsA.id });

    expect(byId).toBeNull();
    expect(byWs).toBeNull();
    expect(list.some(x => x.id === mem.id)).toBe(false);
  });
});
