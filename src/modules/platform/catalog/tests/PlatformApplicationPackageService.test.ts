// Unit tests for PlatformApplicationPackageService (mocked repository)
// Profile: smoke — no DB connection required

import { PlatformApplicationPackageService } from "../services/PlatformApplicationPackageService";
import type { IPlatformApplicationPackageRepository } from "../contracts/IPlatformApplicationPackageRepository";
import {
  PackageNotFoundError,
  DuplicatePackageVersionError,
  PackageApplicationNotFoundError,
  InvalidPackageLifecycleTransitionError,
  PackageConcurrencyError,
  PackageValidationError,
} from "../domain/PlatformApplicationPackageErrors";
import {
  PLATFORM_APPLICATION_PACKAGE_STATUS,
} from "../models/PlatformApplicationPackageModels";
import type { PlatformApplicationPackageRecord } from "../models/PlatformApplicationPackageModels";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const APP_ID = "00000000-0000-0000-0000-000000000001";
const PKG_ID = "00000000-0000-0000-0000-000000000010";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = PLATFORM_APPLICATION_PACKAGE_STATUS;

function makeRecord(
  overrides: Partial<PlatformApplicationPackageRecord> = {}
): PlatformApplicationPackageRecord {
  return {
    id: PKG_ID,
    applicationId: APP_ID,
    packageVersion: "1.0.0",
    displayName: "Test Package",
    description: null,
    releaseNotes: null,
    status: S.Draft,
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

// ─── Mock Repository ─────────────────────────────────────────────────────────

function makeMockRepo(
  overrides: Partial<Record<keyof IPlatformApplicationPackageRepository, jest.Mock>> = {}
): jest.Mocked<IPlatformApplicationPackageRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    deprecate: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByVersion: jest.fn().mockResolvedValue(null),
    listByApplication: jest.fn().mockResolvedValue([]),
    existsVersion: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as jest.Mocked<IPlatformApplicationPackageRepository>;
}

// ─── createPackage() ──────────────────────────────────────────────────────────

describe("createPackage()", () => {
  test("creates and returns a Draft record", async () => {
    const repo = makeMockRepo();
    const svc = new PlatformApplicationPackageService(repo);

    const result = await svc.createPackage({
      applicationId: APP_ID,
      packageVersion: "1.0.0",
      displayName: "My Package",
      actorUserId: ACTOR,
    });

    expect(result.applicationId).toBe(APP_ID);
    expect(result.packageVersion).toBe("1.0.0");
    expect(result.status).toBe(S.Draft);
    expect(result.version).toBe(1n);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  test("throws PackageValidationError for invalid SemVer", async () => {
    const svc = new PlatformApplicationPackageService(makeMockRepo());
    await expect(
      svc.createPackage({
        applicationId: APP_ID,
        packageVersion: "not-valid",
        displayName: "X",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(PackageValidationError);
  });

  test("throws DuplicatePackageVersionError when version already exists", async () => {
    const repo = makeMockRepo({ existsVersion: jest.fn().mockResolvedValue(true) });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.createPackage({
        applicationId: APP_ID,
        packageVersion: "1.0.0",
        displayName: "X",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(DuplicatePackageVersionError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  test("propagates PackageApplicationNotFoundError from repository", async () => {
    const repo = makeMockRepo({
      create: jest.fn().mockRejectedValue(new PackageApplicationNotFoundError(APP_ID)),
    });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.createPackage({
        applicationId: APP_ID,
        packageVersion: "1.0.0",
        displayName: "X",
        actorUserId: ACTOR,
      })
    ).rejects.toThrow(PackageApplicationNotFoundError);
  });

  test("accepts pre-release SemVer", async () => {
    const repo = makeMockRepo();
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.createPackage({
      applicationId: APP_ID,
      packageVersion: "2.0.0-rc.1",
      displayName: "RC",
      actorUserId: ACTOR,
    });
    expect(result.packageVersion).toBe("2.0.0-rc.1");
  });
});

// ─── publishPackage() ─────────────────────────────────────────────────────────

describe("publishPackage()", () => {
  test("publishes a Draft package and returns Published record", async () => {
    const draftRecord = makeRecord({ status: S.Draft, version: 1n });
    const publishedRecord = makeRecord({ status: S.Published, version: 2n });
    const repo = makeMockRepo({
      getById: jest.fn()
        .mockResolvedValueOnce(draftRecord)    // first load (validate)
        .mockResolvedValueOnce(publishedRecord), // second load (return)
    });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.publishPackage({
      id: PKG_ID,
      actorUserId: ACTOR,
      expectedVersion: 1n,
    });
    expect(result.status).toBe(S.Published);
    expect(repo.publish).toHaveBeenCalledWith(PKG_ID, ACTOR, 1n);
  });

  test("throws PackageNotFoundError when package does not exist", async () => {
    const svc = new PlatformApplicationPackageService(makeMockRepo());
    await expect(
      svc.publishPackage({ id: "unknown", actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(PackageNotFoundError);
  });

  test("throws InvalidPackageLifecycleTransitionError when publishing a Published package", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Published })),
    });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.publishPackage({ id: PKG_ID, actorUserId: ACTOR, expectedVersion: 2n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
    expect(repo.publish).not.toHaveBeenCalled();
  });

  test("throws PackageConcurrencyError when version mismatch", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Draft })),
      publish: jest.fn().mockRejectedValue(new PackageConcurrencyError(PKG_ID)),
    });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.publishPackage({ id: PKG_ID, actorUserId: ACTOR, expectedVersion: 99n })
    ).rejects.toThrow(PackageConcurrencyError);
  });
});

// ─── deprecatePackage() ───────────────────────────────────────────────────────

describe("deprecatePackage()", () => {
  test("deprecates a Published package", async () => {
    const published = makeRecord({ status: S.Published, version: 2n });
    const deprecated = makeRecord({ status: S.Deprecated, version: 3n });
    const repo = makeMockRepo({
      getById: jest.fn()
        .mockResolvedValueOnce(published)
        .mockResolvedValueOnce(deprecated),
    });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.deprecatePackage({
      id: PKG_ID,
      actorUserId: ACTOR,
      expectedVersion: 2n,
    });
    expect(result.status).toBe(S.Deprecated);
  });

  test("throws InvalidPackageLifecycleTransitionError when deprecating a Draft", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Draft })),
    });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.deprecatePackage({ id: PKG_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("throws InvalidPackageLifecycleTransitionError when deprecating Archived", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Archived })),
    });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.deprecatePackage({ id: PKG_ID, actorUserId: ACTOR, expectedVersion: 1n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
  });
});

// ─── archivePackage() ─────────────────────────────────────────────────────────

describe("archivePackage()", () => {
  test("archives a Deprecated package", async () => {
    const deprecated = makeRecord({ status: S.Deprecated, version: 3n });
    const archived = makeRecord({ status: S.Archived, version: 4n });
    const repo = makeMockRepo({
      getById: jest.fn()
        .mockResolvedValueOnce(deprecated)
        .mockResolvedValueOnce(archived),
    });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.archivePackage({
      id: PKG_ID,
      actorUserId: ACTOR,
      expectedVersion: 3n,
    });
    expect(result.status).toBe(S.Archived);
  });

  test("throws InvalidPackageLifecycleTransitionError when archiving a Published package", async () => {
    const repo = makeMockRepo({
      getById: jest.fn().mockResolvedValue(makeRecord({ status: S.Published })),
    });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(
      svc.archivePackage({ id: PKG_ID, actorUserId: ACTOR, expectedVersion: 2n })
    ).rejects.toThrow(InvalidPackageLifecycleTransitionError);
  });
});

// ─── getById() / getByVersion() ──────────────────────────────────────────────

describe("getById()", () => {
  test("returns record when found", async () => {
    const repo = makeMockRepo({ getById: jest.fn().mockResolvedValue(makeRecord()) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.getById(PKG_ID);
    expect(result.id).toBe(PKG_ID);
  });

  test("throws PackageNotFoundError when not found", async () => {
    const svc = new PlatformApplicationPackageService(makeMockRepo());
    await expect(svc.getById("missing")).rejects.toThrow(PackageNotFoundError);
  });
});

describe("getByVersion()", () => {
  test("returns record when found", async () => {
    const repo = makeMockRepo({ getByVersion: jest.fn().mockResolvedValue(makeRecord()) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.getByVersion(APP_ID, "1.0.0");
    expect(result.packageVersion).toBe("1.0.0");
  });

  test("throws PackageNotFoundError when not found", async () => {
    const svc = new PlatformApplicationPackageService(makeMockRepo());
    await expect(svc.getByVersion(APP_ID, "9.9.9")).rejects.toThrow(PackageNotFoundError);
  });
});

// ─── listPackages() ──────────────────────────────────────────────────────────

describe("listPackages()", () => {
  test("delegates to repository", async () => {
    const records = [makeRecord({ packageVersion: "1.0.0" }), makeRecord({ packageVersion: "1.1.0" })];
    const repo = makeMockRepo({ listByApplication: jest.fn().mockResolvedValue(records) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.listPackages({ applicationId: APP_ID });
    expect(result).toHaveLength(2);
  });
});

// ─── getLatestPublished() ────────────────────────────────────────────────────

describe("getLatestPublished()", () => {
  test("throws PackageNotFoundError when no Published packages", async () => {
    const svc = new PlatformApplicationPackageService(makeMockRepo());
    await expect(svc.getLatestPublished(APP_ID)).rejects.toThrow(PackageNotFoundError);
  });

  test("returns the package with the highest SemVer", async () => {
    const records = [
      makeRecord({ id: "id-100", packageVersion: "1.0.0", status: S.Published }),
      makeRecord({ id: "id-110", packageVersion: "1.1.0", status: S.Published }),
      makeRecord({ id: "id-200", packageVersion: "2.0.0", status: S.Published }),
    ];
    const repo = makeMockRepo({ listByApplication: jest.fn().mockResolvedValue(records) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.getLatestPublished(APP_ID);
    expect(result.packageVersion).toBe("2.0.0");
  });

  test("filters Published packages from repository before comparing", async () => {
    const repo = makeMockRepo({ listByApplication: jest.fn().mockResolvedValue([]) });
    const svc = new PlatformApplicationPackageService(repo);
    await expect(svc.getLatestPublished(APP_ID)).rejects.toThrow(PackageNotFoundError);
    const call = repo.listByApplication.mock.calls[0]![0];
    expect(call.status).toBe(S.Published);
  });

  test("release takes precedence over pre-release (SemVer 2.0.0 rule)", async () => {
    const records = [
      makeRecord({ id: "a", packageVersion: "1.0.0-rc.1", status: S.Published }),
      makeRecord({ id: "b", packageVersion: "1.0.0", status: S.Published }),
    ];
    const repo = makeMockRepo({ listByApplication: jest.fn().mockResolvedValue(records) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.getLatestPublished(APP_ID);
    // 1.0.0 > 1.0.0-rc.1 per SemVer spec
    expect(result.packageVersion).toBe("1.0.0");
  });

  test("returns the correct package when only one published exists", async () => {
    const record = makeRecord({ packageVersion: "3.0.0", status: S.Published });
    const repo = makeMockRepo({ listByApplication: jest.fn().mockResolvedValue([record]) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.getLatestPublished(APP_ID);
    expect(result.packageVersion).toBe("3.0.0");
  });

  test("handles multiple pre-release identifiers correctly", async () => {
    const records = [
      makeRecord({ id: "a", packageVersion: "2.0.0-alpha", status: S.Published }),
      makeRecord({ id: "b", packageVersion: "2.0.0-alpha.1", status: S.Published }),
      makeRecord({ id: "c", packageVersion: "2.0.0-beta", status: S.Published }),
    ];
    const repo = makeMockRepo({ listByApplication: jest.fn().mockResolvedValue(records) });
    const svc = new PlatformApplicationPackageService(repo);
    const result = await svc.getLatestPublished(APP_ID);
    // 2.0.0-beta > 2.0.0-alpha.1 > 2.0.0-alpha (alphabetically beta > alpha)
    expect(result.packageVersion).toBe("2.0.0-beta");
  });
});
