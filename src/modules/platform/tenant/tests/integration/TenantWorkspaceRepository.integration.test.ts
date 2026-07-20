// Integration tests for TenantWorkspaceRepository and TenantWorkspaceService
// Profile: developer — requires live PostgreSQL connection (DATABASE_URL env)
//
// Tests executed against real database:
//   - SQL correctness (INSERT, UPDATE with optimistic concurrency, SELECT with filters)
//   - Unique constraint scoping: PROVES (tenant_id, code) uniqueness is scoped PER TENANT (D4 / ADR-008-014)
//   - Parent Tenant FK constraint enforcement
//   - Default settings inheritance from parent Tenant (D3 / ADR-008-014)
//   - Full ADR-008-014 lifecycle transition chain
//   - Soft-delete filtering

import { TenantWorkspaceRepository } from "../../repositories/TenantWorkspaceRepository";
import { TenantWorkspaceService } from "../../services/TenantWorkspaceService";
import { TenantRepository } from "../../repositories/TenantRepository";
import { TenantService } from "../../services/TenantService";
import {
  DuplicateWorkspaceCodeError,
  DuplicateWorkspaceNameError,
  WorkspaceTenantNotFoundError,
  WorkspaceConcurrencyError,
  InvalidWorkspaceLifecycleTransitionError,
  ArchivedWorkspaceImmutableError,
} from "../../domain/TenantWorkspaceErrors";
import { TENANT_WORKSPACE_STATUS } from "../../models/TenantWorkspaceModels";
import type { TenantRecord } from "../../models/TenantModels";
import { prisma } from "@/lib/prisma";

const S = TENANT_WORKSPACE_STATUS;
const ACTOR = "00000000-0000-0000-0000-000000000099";
const TEST_PREFIX = `test-ws-${Date.now()}`;

let tenantRepo: TenantRepository;
let tenantSvc: TenantService;
let wsRepo: TenantWorkspaceRepository;
let wsSvc: TenantWorkspaceService;

let parentTenantA: TenantRecord;
let parentTenantB: TenantRecord;

beforeAll(async () => {
  tenantRepo = new TenantRepository();
  tenantSvc = new TenantService(tenantRepo);
  wsRepo = new TenantWorkspaceRepository();
  wsSvc = new TenantWorkspaceService(wsRepo, tenantRepo);

  // Create two real parent Tenants to test tenant-scoping of workspace codes (D4)
  parentTenantA = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-a`,
    name: `Tenant A ${TEST_PREFIX}`,
    displayName: "Tenant A",
    defaultTimeZone: "Asia/Tokyo",
    defaultCulture: "ja-JP",
    defaultCurrency: "JPY",
    actorUserId: ACTOR,
  });

  parentTenantB = await tenantSvc.registerTenant({
    code: `${TEST_PREFIX}-tenant-b`,
    name: `Tenant B ${TEST_PREFIX}`,
    displayName: "Tenant B",
    defaultTimeZone: "America/Chicago",
    defaultCulture: "en-US",
    defaultCurrency: "USD",
    actorUserId: ACTOR,
  });
});

afterAll(async () => {
  // Clean up in FK order: workspaces first, then tenants
  await (prisma as any).tenantWorkspace.deleteMany({
    where: { code: { startsWith: TEST_PREFIX } },
  });
  await (prisma as any).tenant.deleteMany({
    where: { code: { startsWith: TEST_PREFIX } },
  });
  await prisma.$disconnect();
});

async function createWs(tenantId: string, suffix: string, nameSuffix?: string) {
  return wsSvc.createWorkspace({
    tenantId,
    code: `${TEST_PREFIX}-${suffix}`,
    name: `Workspace ${TEST_PREFIX} ${nameSuffix ?? suffix}`,
    displayName: `Display ${suffix}`,
    actorUserId: ACTOR,
  });
}

describe("createWorkspace() — Round-Trip & Parent Settings Inheritance", () => {
  test("persists workspace in Provisioning status and inherits parent Tenant defaults (D3 / ADR-008-014)", async () => {
    const ws = await createWs(parentTenantA.id, "rt-defaults");
    const loadedById = await wsRepo.getById(ws.id);
    const loadedByCode = await wsRepo.getByCode(parentTenantA.id, ws.code);

    expect(loadedById).not.toBeNull();
    expect(loadedById!.id).toBe(ws.id);
    expect(loadedById!.tenantId).toBe(parentTenantA.id);
    expect(loadedById!.status).toBe(S.Provisioning);
    expect(loadedById!.version).toBe(1n);

    // D3: Inherited default settings from parent Tenant A (Asia/Tokyo, ja-JP, JPY)
    expect(loadedById!.timeZone).toBe("Asia/Tokyo");
    expect(loadedById!.culture).toBe("ja-JP");
    expect(loadedById!.currency).toBe("JPY");

    expect(loadedByCode).not.toBeNull();
    expect(loadedByCode!.id).toBe(ws.id);
  });

  test("explicit workspace settings override parent Tenant default settings", async () => {
    const ws = await wsSvc.createWorkspace({
      tenantId: parentTenantA.id,
      code: `${TEST_PREFIX}-custom-settings`,
      name: `Custom Settings ${TEST_PREFIX}`,
      displayName: "Custom Settings",
      timeZone: "UTC",
      currency: "EUR",
      actorUserId: ACTOR,
    });

    const loaded = await wsRepo.getById(ws.id);
    expect(loaded!.timeZone).toBe("UTC"); // explicit override
    expect(loaded!.culture).toBe("ja-JP"); // inherited defaultCulture
    expect(loaded!.currency).toBe("EUR"); // explicit override
  });

  test("rejects workspace creation if parent Tenant does not exist (FK constraint / WorkspaceTenantNotFoundError)", async () => {
    await expect(
      wsSvc.createWorkspace({
        tenantId: "00000000-0000-0000-0000-000000000000",
        code: `${TEST_PREFIX}-orphan`,
        name: `Orphan Workspace ${TEST_PREFIX}`,
        displayName: "Orphan",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(WorkspaceTenantNotFoundError);
  });
});

// ─── CRITICAL TEST: Tenant-Scoped Uniqueness (D4 / Refinement 3) ────────────

describe("Tenant-Scoped Workspace Uniqueness (D4 / ADR-008-014)", () => {
  const SHARED_CODE = `${TEST_PREFIX}-shared-code`;

  test("proves (tenant_id, code) uniqueness is scoped PER TENANT — two different tenants can use the exact same workspace code", async () => {
    // 1. Tenant A creates workspace with SHARED_CODE
    const wsA = await wsSvc.createWorkspace({
      tenantId: parentTenantA.id,
      code: SHARED_CODE,
      name: `Tenant A Shared Workspace ${TEST_PREFIX}`,
      displayName: "Tenant A Shared",
      actorUserId: ACTOR,
    });
    expect(wsA.code).toBe(SHARED_CODE);

    // 2. Tenant B CAN ALSO create a workspace with SHARED_CODE (tenant-scoped unique)
    const wsB = await wsSvc.createWorkspace({
      tenantId: parentTenantB.id,
      code: SHARED_CODE,
      name: `Tenant B Shared Workspace ${TEST_PREFIX}`,
      displayName: "Tenant B Shared",
      actorUserId: ACTOR,
    });
    expect(wsB.code).toBe(SHARED_CODE);

    // Verify both exist independently in DB under their respective tenantId
    const loadedA = await wsRepo.getByCode(parentTenantA.id, SHARED_CODE);
    const loadedB = await wsRepo.getByCode(parentTenantB.id, SHARED_CODE);
    expect(loadedA!.id).toBe(wsA.id);
    expect(loadedB!.id).toBe(wsB.id);
    expect(loadedA!.id).not.toBe(loadedB!.id);
  });

  test("rejects duplicate workspace code WITHIN THE SAME TENANT", async () => {
    // Tenant A tries to create a SECOND workspace with SHARED_CODE -> fails
    await expect(
      wsSvc.createWorkspace({
        tenantId: parentTenantA.id,
        code: SHARED_CODE,
        name: `Tenant A Second Shared Workspace ${TEST_PREFIX}`,
        displayName: "Tenant A Second",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceCodeError);
  });

  test("rejects duplicate workspace name WITHIN THE SAME TENANT", async () => {
    const wsName = `Unique Name Within Tenant A ${TEST_PREFIX}`;
    await wsSvc.createWorkspace({
      tenantId: parentTenantA.id,
      code: `${TEST_PREFIX}-name-uniq-1`,
      name: wsName,
      displayName: "Disp 1",
      actorUserId: ACTOR,
    });

    await expect(
      wsSvc.createWorkspace({
        tenantId: parentTenantA.id,
        code: `${TEST_PREFIX}-name-uniq-2`,
        name: wsName,
        displayName: "Disp 2",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateWorkspaceNameError);
  });
});

describe("Lifecycle — Full Transition Chain (ADR-008-014)", () => {
  test("Provisioning → Active → Suspended → Active → Suspended → Archived", async () => {
    const ws = await createWs(parentTenantA.id, "lifecycle-chain");
    expect(ws.status).toBe(S.Provisioning);
    expect(ws.version).toBe(1n);

    // 1. Provisioning → Active
    const active = await wsSvc.activateWorkspace({
      id: ws.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(active.status).toBe(S.Active);
    expect(active.version).toBe(2n);

    // 2. Active → Suspended
    const suspended = await wsSvc.suspendWorkspace({
      id: ws.id,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(suspended.status).toBe(S.Suspended);
    expect(suspended.version).toBe(3n);

    // 3. Suspended → Active (Reactivation)
    const reactivated = await wsSvc.activateWorkspace({
      id: ws.id,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });
    expect(reactivated.status).toBe(S.Active);
    expect(reactivated.version).toBe(4n);

    // 4. Active → Suspended
    const reSuspended = await wsSvc.suspendWorkspace({
      id: ws.id,
      actorUserId: ACTOR,
      expectedVersion: 4n,
    });
    expect(reSuspended.status).toBe(S.Suspended);
    expect(reSuspended.version).toBe(5n);

    // 5. Suspended → Archived (Terminal)
    const archived = await wsSvc.archiveWorkspace({
      id: ws.id,
      actorUserId: ACTOR,
      expectedVersion: 5n,
    });
    expect(archived.status).toBe(S.Archived);
    expect(archived.version).toBe(6n);
  });

  test("throws WorkspaceConcurrencyError on stale version during state transition", async () => {
    const ws = await createWs(parentTenantA.id, "stale-version");
    await wsSvc.activateWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n }); // v is now 2
    await expect(
      wsSvc.suspendWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n }) // stale version 1
    ).rejects.toThrow(WorkspaceConcurrencyError);
  });

  test("forbidden lifecycle shortcuts throw InvalidWorkspaceLifecycleTransitionError", async () => {
    const ws = await createWs(parentTenantA.id, "shortcut-test");
    // Provisioning → Suspended is forbidden
    await expect(
      wsSvc.suspendWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidWorkspaceLifecycleTransitionError);

    // Activate first: Provisioning → Active
    await wsSvc.activateWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n });

    // Active → Archived directly is forbidden (must be Suspended first)
    await expect(
      wsSvc.archiveWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 2n })
    ).rejects.toThrow(InvalidWorkspaceLifecycleTransitionError);
  });
});

describe("updateWorkspaceMetadata() & Archived Immutability Guard", () => {
  test("updates presentation & defaults on active workspace", async () => {
    const ws = await createWs(parentTenantA.id, "meta-update");
    await wsSvc.activateWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n });

    const updated = await wsSvc.updateWorkspaceMetadata({
      id: ws.id,
      displayName: "Updated Workspace Name",
      description: "Updated description",
      currency: "EUR",
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(updated.displayName).toBe("Updated Workspace Name");
    expect(updated.description).toBe("Updated description");
    expect(updated.currency).toBe("EUR");
    expect(updated.version).toBe(3n);
  });

  test("archived workspaces cannot have metadata updated (ArchivedWorkspaceImmutableError)", async () => {
    const ws = await createWs(parentTenantA.id, "archived-immutable");
    await wsSvc.activateWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n });
    await wsSvc.suspendWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 2n });
    const archived = await wsSvc.archiveWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 3n });

    await expect(
      wsSvc.updateWorkspaceMetadata({
        id: ws.id,
        displayName: "Attempted Edit",
        actorUserId: ACTOR,
        expectedVersion: archived.version,
      })
    ).rejects.toThrow(ArchivedWorkspaceImmutableError);
  });
});

describe("listWorkspacesByTenant() & Soft-Delete Filtering", () => {
  test("listWorkspacesByTenant filters by tenantId and status", async () => {
    const ws = await createWs(parentTenantA.id, "list-status");
    await wsSvc.activateWorkspace({ id: ws.id, actorUserId: ACTOR, expectedVersion: 1n });

    const activeList = await wsSvc.listWorkspacesByTenant({
      tenantId: parentTenantA.id,
      status: S.Active,
    });

    expect(activeList.some(x => x.id === ws.id)).toBe(true);
    expect(activeList.every(x => x.tenantId === parentTenantA.id && x.status === S.Active)).toBe(true);
  });

  test("soft-deleted workspaces are excluded from reads", async () => {
    const ws = await createWs(parentTenantA.id, "soft-deleted");

    // Soft delete via raw DB update
    await (prisma as any).tenantWorkspace.update({
      where: { id: ws.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ACTOR },
    });

    const byId = await wsRepo.getById(ws.id);
    const byCode = await wsRepo.getByCode(parentTenantA.id, ws.code);
    const list = await wsSvc.listWorkspacesByTenant({ tenantId: parentTenantA.id });

    expect(byId).toBeNull();
    expect(byCode).toBeNull();
    expect(list.some(x => x.id === ws.id)).toBe(false);
  });
});

describe("existsCode() & existsName()", () => {
  test("existsCode returns true for existing code within tenant, false for unknown or different tenant", async () => {
    const ws = await createWs(parentTenantA.id, "exists-code");
    expect(await wsRepo.existsCode(parentTenantA.id, ws.code)).toBe(true);
    expect(await wsRepo.existsCode(parentTenantB.id, ws.code)).toBe(false); // different tenant
  });

  test("existsName returns true for existing name within tenant (case-insensitive)", async () => {
    const ws = await createWs(parentTenantA.id, "exists-name", "Special WS Name");
    expect(await wsRepo.existsName(parentTenantA.id, ws.name.toUpperCase())).toBe(true);
    expect(await wsRepo.existsName(parentTenantB.id, ws.name)).toBe(false); // different tenant
  });
});
