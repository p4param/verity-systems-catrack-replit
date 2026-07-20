// Unit tests for PlatformApplicationPackage aggregate root and PlatformApplicationPackageValidator
// Profile: smoke — no DB connection required

import { PlatformApplicationPackage } from "../domain/PlatformApplicationPackage";
import { PlatformApplicationPackageValidator } from "../domain/PlatformApplicationPackageValidator";
import {
  PublishedPackageImmutableError,
  PackageValidationError,
} from "../domain/PlatformApplicationPackageErrors";
import type { PlatformApplicationPackageRecord } from "../models/PlatformApplicationPackageModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../models/PlatformApplicationPackageModels";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const APP_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "00000000-0000-0000-0000-000000000002";

function makeRecord(
  overrides: Partial<PlatformApplicationPackageRecord> = {}
): PlatformApplicationPackageRecord {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    applicationId: APP_ID,
    packageVersion: "1.0.0",
    displayName: "Catering ERP v1.0.0",
    description: "Initial release",
    releaseNotes: "First package",
    status: PLATFORM_APPLICATION_PACKAGE_STATUS.Draft,
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

// ─── PlatformApplicationPackage.create() ─────────────────────────────────────

describe("PlatformApplicationPackage.create()", () => {
  test("creates a Draft package with all required fields", () => {
    const pkg = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "1.0.0",
      displayName: "Test Package",
      actorUserId: ACTOR,
    });

    expect(pkg.applicationId).toBe(APP_ID);
    expect(pkg.packageVersion).toBe("1.0.0");
    expect(pkg.displayName).toBe("Test Package");
    expect(pkg.description).toBeNull();
    expect(pkg.releaseNotes).toBeNull();
    expect(pkg.status).toBe(PLATFORM_APPLICATION_PACKAGE_STATUS.Draft);
    expect(pkg.isDeleted).toBe(false);
    expect(pkg.version).toBe(1n);
    expect(typeof pkg.id).toBe("string");
    expect(pkg.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  test("trims whitespace from packageVersion", () => {
    const pkg = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "  1.2.3  ",
      displayName: "Test",
      actorUserId: ACTOR,
    });
    expect(pkg.packageVersion).toBe("1.2.3");
  });

  test("trims whitespace from displayName", () => {
    const pkg = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "1.0.0",
      displayName: "  My Package  ",
      actorUserId: ACTOR,
    });
    expect(pkg.displayName).toBe("My Package");
  });

  test("stores optional description and releaseNotes", () => {
    const pkg = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "1.0.0",
      displayName: "Test",
      description: "A description",
      releaseNotes: "Some notes",
      actorUserId: ACTOR,
    });
    expect(pkg.description).toBe("A description");
    expect(pkg.releaseNotes).toBe("Some notes");
  });

  test("accepts pre-release SemVer (ADR-008-012)", () => {
    const pkg = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "2.1.0-beta.1",
      displayName: "Beta",
      actorUserId: ACTOR,
    });
    expect(pkg.packageVersion).toBe("2.1.0-beta.1");
  });

  test("accepts SemVer with build metadata (ADR-008-012)", () => {
    const pkg = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "1.0.0+build.42",
      displayName: "Build",
      actorUserId: ACTOR,
    });
    expect(pkg.packageVersion).toBe("1.0.0+build.42");
  });

  test("generates a different UUID for each call", () => {
    const a = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "1.0.0",
      displayName: "A",
      actorUserId: ACTOR,
    });
    const b = PlatformApplicationPackage.create({
      applicationId: APP_ID,
      packageVersion: "1.0.0",
      displayName: "B",
      actorUserId: ACTOR,
    });
    expect(a.id).not.toBe(b.id);
  });
});

// ─── PlatformApplicationPackage.reconstitute() ───────────────────────────────

describe("PlatformApplicationPackage.reconstitute()", () => {
  test("restores all fields from a record", () => {
    const record = makeRecord({ status: PLATFORM_APPLICATION_PACKAGE_STATUS.Published, version: 3n });
    const pkg = PlatformApplicationPackage.reconstitute(record);

    expect(pkg.id).toBe(record.id);
    expect(pkg.applicationId).toBe(record.applicationId);
    expect(pkg.packageVersion).toBe(record.packageVersion);
    expect(pkg.status).toBe(PLATFORM_APPLICATION_PACKAGE_STATUS.Published);
    expect(pkg.version).toBe(3n);
  });

  test("toRecord() returns a copy — mutations do not affect the aggregate", () => {
    const pkg = PlatformApplicationPackage.reconstitute(makeRecord());
    const r1 = pkg.toRecord();
    const r2 = pkg.toRecord();
    expect(r1).not.toBe(r2); // different object references
    expect(r1).toEqual(r2);  // same values
  });
});

// ─── assertModifiable() ───────────────────────────────────────────────────────

describe("PlatformApplicationPackage.assertModifiable()", () => {
  test("does not throw for Draft status", () => {
    const pkg = PlatformApplicationPackage.reconstitute(
      makeRecord({ status: PLATFORM_APPLICATION_PACKAGE_STATUS.Draft })
    );
    expect(() => pkg.assertModifiable()).not.toThrow();
  });

  test("throws PublishedPackageImmutableError for Published status", () => {
    const pkg = PlatformApplicationPackage.reconstitute(
      makeRecord({ status: PLATFORM_APPLICATION_PACKAGE_STATUS.Published })
    );
    expect(() => pkg.assertModifiable()).toThrow(PublishedPackageImmutableError);
  });

  test("throws PublishedPackageImmutableError for Deprecated status", () => {
    const pkg = PlatformApplicationPackage.reconstitute(
      makeRecord({ status: PLATFORM_APPLICATION_PACKAGE_STATUS.Deprecated })
    );
    expect(() => pkg.assertModifiable()).toThrow(PublishedPackageImmutableError);
  });

  test("throws PublishedPackageImmutableError for Archived status", () => {
    const pkg = PlatformApplicationPackage.reconstitute(
      makeRecord({ status: PLATFORM_APPLICATION_PACKAGE_STATUS.Archived })
    );
    expect(() => pkg.assertModifiable()).toThrow(PublishedPackageImmutableError);
  });

  test("error carries packageId", () => {
    const pkg = PlatformApplicationPackage.reconstitute(
      makeRecord({ id: "abc-123", status: PLATFORM_APPLICATION_PACKAGE_STATUS.Published })
    );
    try {
      pkg.assertModifiable();
      fail("Expected error");
    } catch (e) {
      expect((e as PublishedPackageImmutableError).packageId).toBe("abc-123");
    }
  });
});

// ─── PlatformApplicationPackageValidator ─────────────────────────────────────

describe("PlatformApplicationPackageValidator.validateCreateCommand()", () => {
  const valid = {
    applicationId: APP_ID,
    packageVersion: "1.0.0",
    displayName: "My Package",
    actorUserId: ACTOR,
  };

  test("does not throw for a valid command", () => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand(valid)
    ).not.toThrow();
  });

  test("throws for missing applicationId", () => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand({
        ...valid,
        applicationId: "",
      })
    ).toThrow(PackageValidationError);
  });

  test("throws for missing packageVersion", () => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand({
        ...valid,
        packageVersion: "",
      })
    ).toThrow(PackageValidationError);
  });

  test("throws for missing displayName", () => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand({
        ...valid,
        displayName: "   ",
      })
    ).toThrow(PackageValidationError);
  });

  test("throws for missing actorUserId", () => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand({
        ...valid,
        actorUserId: "",
      })
    ).toThrow(PackageValidationError);
  });

  // ── SemVer validation (ADR-008-012) ──

  const validVersions = [
    "0.0.1",
    "1.0.0",
    "1.2.3",
    "10.20.30",
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-0.3.7",
    "2.0.0-x.y.z",
    "2.1.0-beta.1",
    "2.1.0-rc.1",
    "1.0.0+build.1",
    "1.0.0-alpha+001",
    "1.0.0+20130313144700",
    "1.0.0-beta+exp.sha.5114f85",
    "1.0.0-0A.is.legal",
  ];

  test.each(validVersions)("accepts valid SemVer: %s", (version) => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand({
        ...valid,
        packageVersion: version,
      })
    ).not.toThrow();
  });

  const invalidVersions = [
    "1",
    "1.0",
    "1.0.0.0",
    "v1.0.0",
    "01.0.0",
    "1.0.0-",
    "1.0.0+",
    "1.0.00",
    "not-a-version",
    "",
    "1.0.0.",
  ];

  test.each(invalidVersions)("rejects invalid SemVer: %s", (version) => {
    expect(() =>
      PlatformApplicationPackageValidator.validateCreateCommand({
        ...valid,
        packageVersion: version,
      })
    ).toThrow(PackageValidationError);
  });

  test("collects multiple field errors before throwing", () => {
    try {
      PlatformApplicationPackageValidator.validateCreateCommand({
        applicationId: "",
        packageVersion: "invalid",
        displayName: "",
        actorUserId: "",
      });
      fail("Expected error");
    } catch (e) {
      const err = e as PackageValidationError;
      expect(err.fields).toHaveProperty("applicationId");
      expect(err.fields).toHaveProperty("packageVersion");
      expect(err.fields).toHaveProperty("displayName");
      expect(err.fields).toHaveProperty("actorUserId");
    }
  });
});
