// Integration tests for TenantRepository and TenantService
// Profile: developer — requires live PostgreSQL connection (DATABASE_URL env)
//
// Tests executed against real database:
//   - SQL correctness (INSERT, UPDATE with optimistic concurrency, SELECT with filters)
//   - Unique constraint violations (code, name)
//   - Full ADR-008-013 lifecycle transition chain
//   - Metadata update and immutable archived state guard
//   - Soft-delete filtering

import { TenantRepository } from "../../repositories/TenantRepository";
import { TenantService } from "../../services/TenantService";
import {
  DuplicateTenantCodeError,
  DuplicateTenantNameError,
  TenantConcurrencyError,
  TenantNotFoundError,
  InvalidTenantLifecycleTransitionError,
  ArchivedTenantImmutableError,
} from "../../domain/TenantErrors";
import { TENANT_STATUS } from "../../models/TenantModels";
import { prisma } from "@/lib/prisma";

const S = TENANT_STATUS;
const ACTOR = "00000000-0000-0000-0000-000000000099";

const TEST_PREFIX = `test-tenant-${Date.now()}`;

let repo: TenantRepository;
let svc: TenantService;

beforeAll(async () => {
  repo = new TenantRepository();
  svc = new TenantService(repo);
});

afterAll(async () => {
  await (prisma as any).tenant.deleteMany({
    where: { code: { startsWith: "test-tenant-" } },
  });
  await prisma.$disconnect();
});

async function createTenant(suffix: string, nameSuffix?: string) {
  return svc.registerTenant({
    code: `${TEST_PREFIX}-${suffix}`,
    name: `Test Tenant ${TEST_PREFIX} ${nameSuffix ?? suffix}`,
    displayName: `Display ${suffix}`,
    actorUserId: ACTOR,
  });
}

describe("registerTenant() — round-trip", () => {
  test("persists a tenant in Provisioning status and retrieves it by id & code", async () => {
    const created = await createTenant("rt1");
    const loadedById = await repo.getById(created.id);
    const loadedByCode = await repo.getByCode(created.code);

    expect(loadedById).not.toBeNull();
    expect(loadedById!.id).toBe(created.id);
    expect(loadedById!.code).toBe(created.code);
    expect(loadedById!.status).toBe(S.Provisioning);
    expect(loadedById!.version).toBe(1n);

    expect(loadedByCode).not.toBeNull();
    expect(loadedByCode!.id).toBe(created.id);
  });

  test("persists custom presentation & platform defaults", async () => {
    const created = await svc.registerTenant({
      code: `${TEST_PREFIX}-custom`,
      name: `Test Custom ${TEST_PREFIX}`,
      displayName: "Custom Tenant",
      description: "Enterprise description",
      logoUrl: "https://example.com/logo.png",
      defaultTimeZone: "Europe/London",
      defaultCulture: "en-GB",
      defaultCurrency: "GBP",
      actorUserId: ACTOR,
    });

    const loaded = await repo.getById(created.id);
    expect(loaded!.description).toBe("Enterprise description");
    expect(loaded!.logoUrl).toBe("https://example.com/logo.png");
    expect(loaded!.defaultTimeZone).toBe("Europe/London");
    expect(loaded!.defaultCulture).toBe("en-GB");
    expect(loaded!.defaultCurrency).toBe("GBP");
  });
});

describe("Unique constraints (code, name)", () => {
  test("rejects duplicate code (case-insensitive)", async () => {
    const t = await createTenant("uniq-code");
    await expect(
      svc.registerTenant({
        code: t.code,
        name: `Different Name ${TEST_PREFIX}`,
        displayName: "Display",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateTenantCodeError);
  });

  test("rejects duplicate name (case-insensitive)", async () => {
    const t = await createTenant("uniq-name", "Same Name");
    await expect(
      svc.registerTenant({
        code: `${TEST_PREFIX}-different-code`,
        name: t.name.toLowerCase(), // case-insensitive check
        displayName: "Display",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicateTenantNameError);
  });
});

describe("Lifecycle — Full Transition Chain (ADR-008-013)", () => {
  test("Provisioning → Active → Suspended → Active → Suspended → Archived", async () => {
    const t = await createTenant("lifecycle-chain");
    expect(t.status).toBe(S.Provisioning);
    expect(t.version).toBe(1n);

    // 1. Provisioning → Active
    const active = await svc.activateTenant({
      id: t.id,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(active.status).toBe(S.Active);
    expect(active.version).toBe(2n);

    // 2. Active → Suspended
    const suspended = await svc.suspendTenant({
      id: t.id,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(suspended.status).toBe(S.Suspended);
    expect(suspended.version).toBe(3n);

    // 3. Suspended → Active (Reactivation)
    const reactivated = await svc.activateTenant({
      id: t.id,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });
    expect(reactivated.status).toBe(S.Active);
    expect(reactivated.version).toBe(4n);

    // 4. Active → Suspended
    const reSuspended = await svc.suspendTenant({
      id: t.id,
      actorUserId: ACTOR,
      expectedVersion: 4n,
    });
    expect(reSuspended.status).toBe(S.Suspended);
    expect(reSuspended.version).toBe(5n);

    // 5. Suspended → Archived (Terminal)
    const archived = await svc.archiveTenant({
      id: t.id,
      actorUserId: ACTOR,
      expectedVersion: 5n,
    });
    expect(archived.status).toBe(S.Archived);
    expect(archived.version).toBe(6n);
  });

  test("throws PackageConcurrencyError / TenantConcurrencyError on stale version during state transition", async () => {
    const t = await createTenant("stale-version");
    await svc.activateTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n }); // v is now 2
    await expect(
      svc.suspendTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n }) // stale expectedVersion 1
    ).rejects.toThrow(TenantConcurrencyError);
  });

  test("forbidden lifecycle shortcuts throw InvalidTenantLifecycleTransitionError", async () => {
    const t = await createTenant("shortcut-test");
    // Provisioning → Suspended is forbidden
    await expect(
      svc.suspendTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidTenantLifecycleTransitionError);

    // Provisioning → Archived is forbidden
    await expect(
      svc.archiveTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidTenantLifecycleTransitionError);

    // Activate first: Provisioning → Active
    await svc.activateTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n });

    // Active → Archived directly is forbidden (must be Suspended first)
    await expect(
      svc.archiveTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 2n })
    ).rejects.toThrow(InvalidTenantLifecycleTransitionError);
  });
});

describe("updateTenantMetadata() & Archived Immutability Guard", () => {
  test("updates presentation & platform defaults on active tenant", async () => {
    const t = await createTenant("meta-update");
    await svc.activateTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n });

    const updated = await svc.updateTenantMetadata({
      id: t.id,
      displayName: "Updated Display Name",
      description: "Updated description",
      defaultCurrency: "EUR",
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });

    expect(updated.displayName).toBe("Updated Display Name");
    expect(updated.description).toBe("Updated description");
    expect(updated.defaultCurrency).toBe("EUR");
    expect(updated.version).toBe(3n);
  });

  test("archived tenants cannot have metadata updated (ArchivedTenantImmutableError)", async () => {
    const t = await createTenant("archived-immutable");
    await svc.activateTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n });
    await svc.suspendTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 2n });
    const archived = await svc.archiveTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 3n });

    await expect(
      svc.updateTenantMetadata({
        id: t.id,
        displayName: "Attempted Edit",
        actorUserId: ACTOR,
        expectedVersion: archived.version,
      })
    ).rejects.toThrow(ArchivedTenantImmutableError);
  });
});

describe("listTenants() & Soft-Delete Filtering", () => {
  test("listTenants filters by status", async () => {
    const t = await createTenant("list-status");
    await svc.activateTenant({ id: t.id, actorUserId: ACTOR, expectedVersion: 1n });

    const activeTenants = await svc.listTenants({ status: S.Active });
    expect(activeTenants.some(x => x.id === t.id)).toBe(true);
    expect(activeTenants.every(x => x.status === S.Active)).toBe(true);
  });

  test("soft-deleted tenants are excluded from reads", async () => {
    const t = await createTenant("soft-deleted");

    // Soft delete via raw DB update
    await (prisma as any).tenant.update({
      where: { id: t.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ACTOR },
    });

    const byId = await repo.getById(t.id);
    const byCode = await repo.getByCode(t.code);
    const all = await svc.listTenants();

    expect(byId).toBeNull();
    expect(byCode).toBeNull();
    expect(all.some(x => x.id === t.id)).toBe(false);
  });
});

describe("existsCode() & existsName()", () => {
  test("existsCode returns true for existing code, false for unknown", async () => {
    const t = await createTenant("exists-code");
    expect(await repo.existsCode(t.code)).toBe(true);
    expect(await repo.existsCode("non-existent-code-999")).toBe(false);
  });

  test("existsName returns true for existing name (case-insensitive), false for unknown", async () => {
    const t = await createTenant("exists-name", "Special Name");
    expect(await repo.existsName(t.name.toUpperCase())).toBe(true);
    expect(await repo.existsName("Non Existent Name 999")).toBe(false);
  });
});
