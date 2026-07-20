import { PlatformApplicationPackageRepository } from "../../repositories/PlatformApplicationPackageRepository";
import { PlatformApplicationPackageService } from "../../services/PlatformApplicationPackageService";
import { PlatformApplicationRepository } from "../../repositories/PlatformApplicationRepository";
import { PlatformApplicationService } from "../../services/PlatformApplicationService";
import {
  DuplicatePackageVersionError,
  PackageApplicationNotFoundError,
  PackageConcurrencyError,
  PackageNotFoundError,
  InvalidPackageLifecycleTransitionError,
} from "../../domain/PlatformApplicationPackageErrors";
import {
  PLATFORM_APPLICATION_PACKAGE_STATUS,
} from "../../models/PlatformApplicationPackageModels";
import { prisma } from "@/lib/prisma";

// ─── Setup ───────────────────────────────────────────────────────────────────

const S = PLATFORM_APPLICATION_PACKAGE_STATUS;
const ACTOR = "00000000-0000-0000-0000-000000000099";

// Unique prefix for this test run — prevents cross-test pollution
const TEST_PREFIX = `TEST-INT-PKG-${Date.now()}`;

let testAppId: string;
let appRepo: PlatformApplicationRepository;
let appSvc: PlatformApplicationService;
let pkgRepo: PlatformApplicationPackageRepository;
let svc: PlatformApplicationPackageService;

beforeAll(async () => {
  appRepo = new PlatformApplicationRepository();
  appSvc = new PlatformApplicationService(appRepo);
  pkgRepo = new PlatformApplicationPackageRepository();
  svc = new PlatformApplicationPackageService(pkgRepo);

  // Create a real PlatformApplication as the FK parent for all package tests
  const app = await appSvc.register({
    code: `${TEST_PREFIX}-APP`,
    name: `${TEST_PREFIX} Application`,
    displayName: "Integration Test Application",
    category: "Test",
    actorUserId: ACTOR,
  });

  testAppId = app.id;
});


afterAll(async () => {
  // Clean up in FK-safe order: packages first, then application
  await (prisma as any).platformApplicationPackage.deleteMany({
    where: { applicationId: testAppId },
  });
  await (prisma as any).platformApplication.deleteMany({
    where: { code: { startsWith: TEST_PREFIX } },
  });
  await prisma.$disconnect();
});

// Helper: create a named isolated application for scoped tests
async function createIsolatedApp(suffix: string) {
  return appSvc.register({
    code: `${TEST_PREFIX}-${suffix}`,
    name: `${TEST_PREFIX} ${suffix}`,
    displayName: `${suffix} Test App`,
    category: "Test",
    actorUserId: ACTOR,
  });
}

// Helper: create a package for an application with a given semver
async function createPkg(
  semver: string,
  displayName?: string
) {
  return svc.createPackage({
    applicationId: testAppId,
    packageVersion: semver,
    displayName: displayName ?? `Package ${semver}`,
    actorUserId: ACTOR,
  });
}

// ─── Create & Round-Trip ──────────────────────────────────────────────────────

describe("create() — round-trip", () => {
  test("persists a package and retrieves it by id", async () => {
    const created = await createPkg("0.1.0");
    const loaded = await pkgRepo.getById(created.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(created.id);
    expect(loaded!.applicationId).toBe(testAppId);
    expect(loaded!.packageVersion).toBe("0.1.0");
    expect(loaded!.status).toBe(S.Draft);
    expect(loaded!.version).toBe(1n);
    expect(loaded!.isDeleted).toBe(false);
  });

  test("persists optional description and releaseNotes", async () => {
    const created = await svc.createPackage({
      applicationId: testAppId,
      packageVersion: "0.1.1",
      displayName: "With Notes",
      description: "A description",
      releaseNotes: "Initial notes",
      actorUserId: ACTOR,
    });
    const loaded = await pkgRepo.getById(created.id);
    expect(loaded!.description).toBe("A description");
    expect(loaded!.releaseNotes).toBe("Initial notes");
  });

  test("stores pre-release SemVer verbatim (ADR-008-012)", async () => {
    const created = await createPkg("0.2.0-beta.1");
    const loaded = await pkgRepo.getById(created.id);
    expect(loaded!.packageVersion).toBe("0.2.0-beta.1");
  });

  test("getByVersion returns correct record", async () => {
    const created = await createPkg("0.3.0");
    const loaded = await pkgRepo.getByVersion(testAppId, "0.3.0");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(created.id);
  });
});

// ─── Unique Constraint ────────────────────────────────────────────────────────

describe("Unique constraint (application_id, package_version)", () => {
  test("rejects duplicate version for the same application", async () => {
    await createPkg("0.0.99");
    await expect(createPkg("0.0.99")).rejects.toThrow(DuplicatePackageVersionError);
  });

  test("DuplicatePackageVersionError carries applicationId and packageVersion", async () => {
    await createPkg("0.0.98");
    try {
      await createPkg("0.0.98");
      fail("Expected error");
    } catch (e) {
      const err = e as DuplicatePackageVersionError;
      expect(err.applicationId).toBe(testAppId);
      expect(err.packageVersion).toBe("0.0.98");
    }
  });
});

// ─── FK Constraint ────────────────────────────────────────────────────────────

describe("FK constraint (application_id)", () => {
  test("rejects package for a non-existent application", async () => {
    await expect(
      svc.createPackage({
        applicationId: "00000000-0000-0000-0000-000000000000", // does not exist
        packageVersion: "1.0.0",
        displayName: "Orphan",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(PackageApplicationNotFoundError);
  });
});

// ─── Lifecycle — Publish ──────────────────────────────────────────────────────

describe("publish()", () => {
  test("transitions Draft to Published and increments version", async () => {
    const created = await createPkg("1.0.0");
    expect(created.version).toBe(1n);

    await pkgRepo.publish(created.id, ACTOR, 1n);

    const updated = await pkgRepo.getById(created.id);
    expect(updated!.status).toBe(S.Published);
    expect(updated!.version).toBe(2n);
  });

  test("throws PackageConcurrencyError on stale version", async () => {
    const created = await createPkg("1.0.1");
    await pkgRepo.publish(created.id, ACTOR, 1n); // version is now 2
    await expect(pkgRepo.publish(created.id, ACTOR, 1n)).rejects.toThrow(
      PackageConcurrencyError
    );
  });
});

// ─── Lifecycle — Deprecate ────────────────────────────────────────────────────

describe("deprecate()", () => {
  test("transitions Published to Deprecated", async () => {
    const created = await createPkg("1.1.0");
    await pkgRepo.publish(created.id, ACTOR, 1n); // v→2, Published
    await pkgRepo.deprecate(created.id, ACTOR, 2n); // v→3, Deprecated

    const updated = await pkgRepo.getById(created.id);
    expect(updated!.status).toBe(S.Deprecated);
    expect(updated!.version).toBe(3n);
  });
});

// ─── Lifecycle — Archive ──────────────────────────────────────────────────────

describe("archive()", () => {
  test("transitions Deprecated to Archived", async () => {
    const created = await createPkg("1.2.0");
    await pkgRepo.publish(created.id, ACTOR, 1n);
    await pkgRepo.deprecate(created.id, ACTOR, 2n);
    await pkgRepo.archive(created.id, ACTOR, 3n);

    const updated = await pkgRepo.getById(created.id);
    expect(updated!.status).toBe(S.Archived);
    expect(updated!.version).toBe(4n);
  });
});

// ─── Lifecycle — Service-Level Guard ─────────────────────────────────────────

describe("Service-level lifecycle enforcement (immutability after publication)", () => {
  test("re-publishing a Published package throws InvalidPackageLifecycleTransitionError", async () => {
    const created = await createPkg("2.0.0");
    await svc.publishPackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 1n });
    // version is now 2n, status is Published
    await expect(
      svc.publishPackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 2n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("archiving a Published package directly throws InvalidPackageLifecycleTransitionError", async () => {
    const created = await createPkg("2.0.1");
    await svc.publishPackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 1n });
    // Must go Published → Deprecated first
    await expect(
      svc.archivePackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 2n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Archived packages cannot be republished (terminal state)", async () => {
    const created = await createPkg("2.0.2");
    await svc.publishPackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 1n });
    await svc.deprecatePackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 2n });
    await svc.archivePackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 3n });
    // All three attempts should fail (terminal state)
    await expect(
      svc.publishPackage({ id: created.id, actorUserId: ACTOR, expectedVersion: 4n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
  });
});

// ─── listByApplication() ─────────────────────────────────────────────────────

describe("listByApplication()", () => {
  test("returns all non-deleted packages for an application", async () => {
    const app2 = await createIsolatedApp("LIST");

    await svc.createPackage({ applicationId: app2.id, packageVersion: "1.0.0", displayName: "P1", actorUserId: ACTOR });
    await svc.createPackage({ applicationId: app2.id, packageVersion: "1.1.0", displayName: "P2", actorUserId: ACTOR });

    const results = await pkgRepo.listByApplication({ applicationId: app2.id });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every(r => r.applicationId === app2.id)).toBe(true);

    // cleanup
    await (prisma as any).platformApplicationPackage.deleteMany({ where: { applicationId: app2.id } });
    await (prisma as any).platformApplication.deleteMany({ where: { id: app2.id } });
  });

  test("filters by status when provided", async () => {
    const pkg = await createPkg("3.0.0");
    await pkgRepo.publish(pkg.id, ACTOR, 1n);

    const published = await pkgRepo.listByApplication({
      applicationId: testAppId,
      status: S.Published,
    });
    expect(published.every(r => r.status === S.Published)).toBe(true);
  });
});

// ─── Soft-Delete Filtering ────────────────────────────────────────────────────

describe("Soft-delete filtering", () => {
  test("soft-deleted packages are excluded from getById", async () => {
    const pkg = await createPkg("10.0.0");

    // Mark as soft-deleted via raw Prisma
    await (prisma as any).platformApplicationPackage.update({
      where: { id: pkg.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ACTOR },
    });

    const result = await pkgRepo.getById(pkg.id);
    expect(result).toBeNull();
  });

  test("soft-deleted packages are excluded from listByApplication", async () => {
    const pkg = await createPkg("11.0.0");

    await (prisma as any).platformApplicationPackage.update({
      where: { id: pkg.id },
      data: { isDeleted: true },
    });

    const results = await pkgRepo.listByApplication({ applicationId: testAppId });
    expect(results.find(r => r.id === pkg.id)).toBeUndefined();
  });
});

// ─── getLatestPublished() (service-level SemVer sort) ────────────────────────

describe("getLatestPublished()", () => {
  test("returns highest SemVer among Published packages", async () => {
    const isolatedApp = await createIsolatedApp("LATEST");
    const svcIsolated = new PlatformApplicationPackageService(pkgRepo);

    const p100 = await svcIsolated.createPackage({ applicationId: isolatedApp.id, packageVersion: "1.0.0", displayName: "P100", actorUserId: ACTOR });
    const p110 = await svcIsolated.createPackage({ applicationId: isolatedApp.id, packageVersion: "1.1.0", displayName: "P110", actorUserId: ACTOR });
    const p200 = await svcIsolated.createPackage({ applicationId: isolatedApp.id, packageVersion: "2.0.0", displayName: "P200", actorUserId: ACTOR });

    // Publish all three (in non-sequential order to avoid created_at ordering dependency)
    await pkgRepo.publish(p110.id, ACTOR, 1n);
    await pkgRepo.publish(p100.id, ACTOR, 1n);
    await pkgRepo.publish(p200.id, ACTOR, 1n);

    const latest = await svcIsolated.getLatestPublished(isolatedApp.id);
    expect(latest.packageVersion).toBe("2.0.0");

    // Cleanup
    await (prisma as any).platformApplicationPackage.deleteMany({ where: { applicationId: isolatedApp.id } });
    await (prisma as any).platformApplication.deleteMany({ where: { id: isolatedApp.id } });
  });

  test("release takes precedence over pre-release (SemVer rule)", async () => {
    const isolatedApp = await createIsolatedApp("PREREL");
    const svcIsolated = new PlatformApplicationPackageService(pkgRepo);
    const rc = await svcIsolated.createPackage({ applicationId: isolatedApp.id, packageVersion: "1.0.0-rc.1", displayName: "RC", actorUserId: ACTOR });
    const rel = await svcIsolated.createPackage({ applicationId: isolatedApp.id, packageVersion: "1.0.0", displayName: "Release", actorUserId: ACTOR });

    await pkgRepo.publish(rc.id, ACTOR, 1n);
    await pkgRepo.publish(rel.id, ACTOR, 1n);

    const latest = await svcIsolated.getLatestPublished(isolatedApp.id);
    // 1.0.0 > 1.0.0-rc.1 per SemVer 2.0.0 spec
    expect(latest.packageVersion).toBe("1.0.0");

    await (prisma as any).platformApplicationPackage.deleteMany({ where: { applicationId: isolatedApp.id } });
    await (prisma as any).platformApplication.deleteMany({ where: { id: isolatedApp.id } });
  });

  test("throws PackageNotFoundError when no Published packages exist", async () => {
    const isolatedApp = await createIsolatedApp("NOPUB");
    const svcIsolated = new PlatformApplicationPackageService(pkgRepo);
    await svcIsolated.createPackage({ applicationId: isolatedApp.id, packageVersion: "1.0.0", displayName: "Draft", actorUserId: ACTOR });

    await expect(svcIsolated.getLatestPublished(isolatedApp.id)).rejects.toThrow(PackageNotFoundError);

    await (prisma as any).platformApplicationPackage.deleteMany({ where: { applicationId: isolatedApp.id } });
    await (prisma as any).platformApplication.deleteMany({ where: { id: isolatedApp.id } });
  });
});

// ─── existsVersion() ─────────────────────────────────────────────────────────

describe("existsVersion()", () => {
  test("returns true when version exists", async () => {
    await createPkg("9.0.0");
    const exists = await pkgRepo.existsVersion(testAppId, "9.0.0");
    expect(exists).toBe(true);
  });

  test("returns false when version does not exist", async () => {
    const exists = await pkgRepo.existsVersion(testAppId, "99.99.99");
    expect(exists).toBe(false);
  });
});
