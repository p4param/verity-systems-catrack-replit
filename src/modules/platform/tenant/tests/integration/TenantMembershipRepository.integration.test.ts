// Integration tests for TenantMembershipRepository and TenantMembershipService
// Profile: developer — requires live PostgreSQL connection (DATABASE_URL env)
//
// Tests executed against real database:
//   - Single-record in-place lifecycle state mutations (D2)
//   - Tenant FK enforcement (ON DELETE RESTRICT ON UPDATE RESTRICT)
//   - User FK enforcement (ON DELETE RESTRICT ON UPDATE RESTRICT)
//   - Tenant Active prerequisite validation (rejects invitation on Suspended Tenant)
//   - Duplicate membership rejection ((tenant_id, user_id) unique constraint)
//   - Role updates & Removed immutability guard
//   - CRITICAL TEST (D4): Proves Removed memberships CANNOT be reactivated (terminal state)
//   - Full ADR-008-016 lifecycle transition chain
//   - Optimistic concurrency control (version BIGINT)
//   - Soft-delete filtering

import { TenantMembershipRepository } from "../../repositories/TenantMembershipRepository";
import { TenantMembershipService } from "../../services/TenantMembershipService";
import { TenantRepository } from "../../repositories/TenantRepository";
import { TenantService } from "../../services/TenantService";

import {
  DuplicateTenantMembershipError,
  MembershipTenantNotFoundError,
  MembershipUserNotFoundError,
  MembershipTenantNotActiveError,
  TenantMembershipConcurrencyError,
  InvalidMembershipLifecycleTransitionError,
  RemovedMembershipImmutableError,
} from "../../domain/TenantMembershipErrors";
import {
  TENANT_MEMBERSHIP_STATUS,
  TENANT_ROLE,
} from "../../models/TenantMembershipModels";
import type { TenantRecord } from "../../models/TenantModels";
import type { TenantMembershipRecord } from "../../models/TenantMembershipModels";
import { prisma } from "@/lib/prisma";

const S = TENANT_MEMBERSHIP_STATUS;
const R = TENANT_ROLE;
const ACTOR = "00000000-0000-0000-0000-000000000099";
const TEST_PREFIX = `test-mem-${Date.now()}`;

let tenantSvc: TenantService;
let memRepo: TenantMembershipRepository;
let memSvc: TenantMembershipService;

let activeTenant: TenantRecord;
let suspendedTenant: TenantRecord;

let realUser1: { id: string; email: string };
let realUser2: { id: string; email: string };

beforeAll(async () => {
  const tenantRepo = new TenantRepository();
  tenantSvc = new TenantService(tenantRepo);

  memRepo = new TenantMembershipRepository();
  memSvc = new TenantMembershipService(memRepo, tenantRepo);

  // 1. Create Active Tenant & Suspended Tenant
  activeTenant = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-act`,
    name: `Active Tenant ${TEST_PREFIX}`,
    displayName: "Active Tenant",
    actorUserId: ACTOR,
  });
  await tenantSvc.activateTenant({ id: activeTenant.id, actorUserId: ACTOR, expectedVersion: 1n });

  suspendedTenant = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-susp`,
    name: `Suspended Tenant ${TEST_PREFIX}`,
    displayName: "Suspended Tenant",
    actorUserId: ACTOR,
  });
  await tenantSvc.activateTenant({ id: suspendedTenant.id, actorUserId: ACTOR, expectedVersion: 1n });
  await tenantSvc.suspendTenant({ id: suspendedTenant.id, actorUserId: ACTOR, expectedVersion: 2n });

  // 2. Create Real Users in DB (for FK compliance with users table)
  realUser1 = await (prisma as any).user.create({
    data: {
      tenantId: activeTenant.id,
      fullName: `Test User 1 ${TEST_PREFIX}`,
      email: `${TEST_PREFIX}-user1@test.com`,
      status: "ACTIVE",
    },
  });

  realUser2 = await (prisma as any).user.create({
    data: {
      tenantId: activeTenant.id,
      fullName: `Test User 2 ${TEST_PREFIX}`,
      email: `${TEST_PREFIX}-user2@test.com`,
      status: "ACTIVE",
    },
  });
});

afterAll(async () => {
  // Clean up in reverse dependency order
  await (prisma as any).tenantMembership.deleteMany({
    where: { tenantId: { in: [activeTenant.id, suspendedTenant.id] } },
  });
  await (prisma as any).user.deleteMany({
    where: { id: { in: [realUser1.id, realUser2.id] } },
  });
  await (prisma as any).tenant.deleteMany({
    where: { id: { in: [activeTenant.id, suspendedTenant.id] } },
  });
  await prisma.$disconnect();
});

describe("inviteUser() — Round-Trip & Prerequisite Checks (D3)", () => {
  test("persists membership in Invited status and single-record mutation (D2 / D3)", async () => {
    const mem = await memSvc.inviteUser({
      tenantId: activeTenant.id,
      userId: realUser1.id,
      tenantRole: R.Admin,
      actorUserId: ACTOR,
    });

    expect(mem.tenantId).toBe(activeTenant.id);
    expect(mem.userId).toBe(realUser1.id);
    expect(mem.tenantRole).toBe(R.Admin);
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);

    const loaded = await memRepo.getById(mem.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(mem.id);
    expect(loaded!.status).toBe(S.Invited);
  });

  test("rejects invitation when target Tenant is Suspended (must be Active)", async () => {
    await expect(
      memSvc.inviteUser({
        tenantId: suspendedTenant.id,
        userId: realUser2.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(MembershipTenantNotActiveError);
  });

  test("rejects invitation if target Tenant does not exist (FK constraint / MembershipTenantNotFoundError)", async () => {
    await expect(
      memSvc.inviteUser({
        tenantId: "00000000-0000-0000-0000-000000000000",
        userId: realUser2.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(MembershipTenantNotFoundError);
  });

  test("rejects invitation if target User does not exist (MembershipUserNotFoundError)", async () => {
    await expect(
      memSvc.inviteUser({
        tenantId: activeTenant.id,
        userId: "00000000-0000-0000-0000-000000000000",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(MembershipUserNotFoundError);
  });

  test("rejects duplicate membership for the same (tenant_id, user_id) pair", async () => {
    // realUser1 is already invited to activeTenant
    await expect(
      memSvc.inviteUser({
        tenantId: activeTenant.id,
        userId: realUser1.id,
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateTenantMembershipError);
  });
});

// ─── CRITICAL USER REFINEMENT TEST CASE (D4) ─────────────────────────────────

describe("Remove / Reactivate Behavior & Terminal State Guard (D4)", () => {
  test("proves Removed memberships CANNOT be reactivated (terminal state / D4)", async () => {
    // 1. Invite realUser2 to activeTenant
    const mem = await memSvc.inviteUser({
      tenantId: activeTenant.id,
      userId: realUser2.id,
      tenantRole: R.Member,
      actorUserId: ACTOR,
    });
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);

    // 2. Activate membership: Invited → Active
    const active = await memSvc.activateMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(active.status).toBe(S.Active);
    expect(active.version).toBe(2n);

    // 3. Remove membership: Active → Removed
    const removed = await memSvc.removeMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(removed.status).toBe(S.Removed);
    expect(removed.version).toBe(3n);

    // 4. CRITICAL D4 VERIFICATION: Attempt to reactivate Removed membership fails!
    await expect(
      memSvc.activateMembership({
        id: mem.id,
        actorUserId: ACTOR,
        expectedVersion: 3n,
      })
    ).rejects.toThrow(InvalidMembershipLifecycleTransitionError);

    // Verify status remains Removed in DB
    const loaded = await memRepo.getById(mem.id);
    expect(loaded!.status).toBe(S.Removed);
  });

  test("removed memberships cannot have tenantRole updated (RemovedMembershipImmutableError)", async () => {
    const mem = await memSvc.getMembershipByUser(activeTenant.id, realUser2.id);
    expect(mem.status).toBe(S.Removed);

    await expect(
      memSvc.updateTenantRole({
        id: mem.id,
        tenantRole: R.Admin,
        actorUserId: ACTOR,
        expectedVersion: mem.version,
      })
    ).rejects.toThrow(RemovedMembershipImmutableError);
  });
});

describe("Lifecycle — Full Transition Chain & Concurrency (ADR-008-016)", () => {
  test("Invited → Active → Suspended → Active → Suspended → Removed", async () => {
    const mem = await memSvc.getMembershipByUser(activeTenant.id, realUser1.id);
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);

    // 1. Invited → Active
    const active = await memSvc.activateMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(active.status).toBe(S.Active);
    expect(active.version).toBe(2n);

    // 2. Active → Suspended
    const suspended = await memSvc.suspendMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(suspended.status).toBe(S.Suspended);
    expect(suspended.version).toBe(3n);

    // 3. Suspended → Active (Reactivation)
    const reactivated = await memSvc.activateMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });
    expect(reactivated.status).toBe(S.Active);
    expect(reactivated.version).toBe(4n);

    // 4. Update role on Active membership
    const roleUpdated = await memSvc.updateTenantRole({
      id: mem.id,
      tenantRole: R.Owner,
      actorUserId: ACTOR,
      expectedVersion: 4n,
    });
    expect(roleUpdated.tenantRole).toBe(R.Owner);
    expect(roleUpdated.version).toBe(5n);

    // 5. Active → Suspended
    const reSuspended = await memSvc.suspendMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 5n,
    });
    expect(reSuspended.status).toBe(S.Suspended);
    expect(reSuspended.version).toBe(6n);

    // 6. Suspended → Removed (Terminal)
    const removed = await memSvc.removeMembership({
      id: mem.id,
      actorUserId: ACTOR,
      expectedVersion: 6n,
    });
    expect(removed.status).toBe(S.Removed);
    expect(removed.version).toBe(7n);
  });

  test("throws TenantMembershipConcurrencyError on stale version during state transition", async () => {
    // Create a new membership for concurrency test
    const user3 = await (prisma as any).user.create({
      data: {
        tenantId: activeTenant.id,
        fullName: `Concurrency User ${TEST_PREFIX}`,
        email: `${TEST_PREFIX}-user3@test.com`,
        status: "ACTIVE",
      },
    });

    const mem = await memSvc.inviteUser({
      tenantId: activeTenant.id,
      userId: user3.id,
      actorUserId: ACTOR,
    });
    await memSvc.activateMembership({ id: mem.id, actorUserId: ACTOR, expectedVersion: 1n });

    // Attempt to suspend with stale version 1n (actual is 2n)
    await expect(
      memSvc.suspendMembership({
        id: mem.id,
        actorUserId: ACTOR,
        expectedVersion: 1n, // stale version
      })
    ).rejects.toThrow(TenantMembershipConcurrencyError);

    // Clean up user3
    await (prisma as any).tenantMembership.deleteMany({ where: { id: mem.id } });
    await (prisma as any).user.delete({ where: { id: user3.id } });
  });
});

describe("listTenantMemberships() & Soft-Delete Filtering", () => {
  test("listTenantMemberships returns memberships filtered by tenantId and role", async () => {
    const list = await memSvc.listTenantMemberships({
      tenantId: activeTenant.id,
      tenantRole: R.Owner,
    });

    expect(list.some(x => x.userId === realUser1.id)).toBe(true);
    expect(list.every(x => x.tenantId === activeTenant.id && x.tenantRole === R.Owner)).toBe(true);
  });

  test("soft-deleted memberships are excluded from reads", async () => {
    const mem = await memSvc.getMembershipByUser(activeTenant.id, realUser1.id);

    // Soft delete via raw DB update
    await (prisma as any).tenantMembership.update({
      where: { id: mem.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ACTOR },
    });

    const byId = await memRepo.getById(mem.id);
    const byUserTenant = await memRepo.getByUserAndTenant(activeTenant.id, realUser1.id);
    const list = await memSvc.listTenantMemberships({ tenantId: activeTenant.id });

    expect(byId).toBeNull();
    expect(byUserTenant).toBeNull();
    expect(list.some(x => x.id === mem.id)).toBe(false);
  });
});
