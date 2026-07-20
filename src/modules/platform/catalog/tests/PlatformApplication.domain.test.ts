// VS08A: PlatformApplication domain unit tests
// Covers: aggregate root creation, code normalization, immutability guard,
// domain validator, and domain error classes.

import { PlatformApplication } from "../domain/PlatformApplication";
import { PlatformApplicationValidator } from "../domain/PlatformApplicationValidator";
import {
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  InvalidLifecycleTransitionError,
  PlatformApplicationConcurrencyError,
  PlatformApplicationNotFoundError,
  PlatformApplicationValidationError,
  RetiredApplicationModificationError,
} from "../domain/PlatformApplicationErrors";
import type { RegisterPlatformApplicationCommand } from "../models/PlatformApplicationModels";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTOR_ID = "00000000-0000-0000-0000-000000000001";

function makeRegisterCommand(
  overrides: Partial<RegisterPlatformApplicationCommand> = {}
): RegisterPlatformApplicationCommand {
  return {
    code: "CATERING-ERP",
    name: "Catering ERP",
    displayName: "Catering ERP Platform",
    description: "Enterprise catering management",
    category: "Operations",
    actorUserId: ACTOR_ID,
    ...overrides,
  };
}

// ─── PlatformApplication.create ───────────────────────────────────────────────

describe("PlatformApplication.create", () => {
  test("creates aggregate with correct initial values", () => {
    const app = PlatformApplication.create(makeRegisterCommand());
    expect(app.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(app.code).toBe("CATERING-ERP");
    expect(app.name).toBe("Catering ERP");
    expect(app.status).toBe(PLATFORM_APPLICATION_STATUS.Draft);
    expect(app.version).toBe(1n);
    expect(app.isDeleted).toBe(false);
  });

  test("stores code as-is without normalization", () => {
    const app = PlatformApplication.create(makeRegisterCommand({ code: "HSE-APP" }));
    expect(app.code).toBe("HSE-APP");
  });

  test("trims whitespace from code, name, displayName, category", () => {
    const app = PlatformApplication.create(
      makeRegisterCommand({
        code: "  HRMS  ",
        name: "  HRMS  ",
        displayName: "  Human Resources  ",
        category: "  HR  ",
      })
    );
    expect(app.code).toBe("HRMS");
    expect(app.name).toBe("HRMS");
    expect(app.displayName).toBe("Human Resources");
    expect(app.category).toBe("HR");
  });

  test("sets description to null when not provided", () => {
    const app = PlatformApplication.create(
      makeRegisterCommand({ description: undefined })
    );
    expect(app.description).toBeNull();
  });

  test("sets iconUrl and websiteUrl to null when not provided", () => {
    const app = PlatformApplication.create(makeRegisterCommand());
    expect(app.iconUrl).toBeNull();
    expect(app.websiteUrl).toBeNull();
  });

  test("sets iconUrl and websiteUrl when provided", () => {
    const app = PlatformApplication.create(
      makeRegisterCommand({
        iconUrl: "https://cdn.example.com/icon.png",
        websiteUrl: "https://example.com",
      })
    );
    expect(app.iconUrl).toBe("https://cdn.example.com/icon.png");
    expect(app.websiteUrl).toBe("https://example.com");
  });

  test("each created application has a unique ID", () => {
    const a = PlatformApplication.create(makeRegisterCommand({ code: "app-a", name: "App A" }));
    const b = PlatformApplication.create(makeRegisterCommand({ code: "app-b", name: "App B" }));
    expect(a.id).not.toBe(b.id);
  });
});

// ─── PlatformApplication.reconstitute ────────────────────────────────────────

describe("PlatformApplication.reconstitute", () => {
  test("reconstitutes aggregate from persisted record", () => {
    const now = new Date();
    const record = {
      id: "11111111-1111-1111-1111-111111111111",
      code: "HSE",
      name: "HSE Platform",
      displayName: "Health Safety Environment",
      description: null,
      category: "Safety",
      iconUrl: null,
      websiteUrl: null,
      status: PLATFORM_APPLICATION_STATUS.Published,
      createdAt: now,
      createdBy: "00000000-0000-0000-0000-000000000001",
      updatedAt: now,
      updatedBy: "00000000-0000-0000-0000-000000000001",
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 3n,
    } as const;

    const app = PlatformApplication.reconstitute(record);
    expect(app.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(app.status).toBe(PLATFORM_APPLICATION_STATUS.Published);
    expect(app.version).toBe(3n);
  });
});

// ─── PlatformApplication.assertModifiable ────────────────────────────────────

describe("PlatformApplication.assertModifiable", () => {
  test("does not throw when status is Draft", () => {
    const app = PlatformApplication.create(makeRegisterCommand());
    expect(() => app.assertModifiable()).not.toThrow();
  });

  test("does not throw when status is Published", () => {
    const record = PlatformApplication.create(makeRegisterCommand()).toRecord();
    const app = PlatformApplication.reconstitute({
      ...record,
      status: PLATFORM_APPLICATION_STATUS.Published,
    });
    expect(() => app.assertModifiable()).not.toThrow();
  });

  test("does not throw when status is Deprecated", () => {
    const record = PlatformApplication.create(makeRegisterCommand()).toRecord();
    const app = PlatformApplication.reconstitute({
      ...record,
      status: PLATFORM_APPLICATION_STATUS.Deprecated,
    });
    expect(() => app.assertModifiable()).not.toThrow();
  });

  test("throws RetiredApplicationModificationError when status is Retired", () => {
    const record = PlatformApplication.create(makeRegisterCommand()).toRecord();
    const app = PlatformApplication.reconstitute({
      ...record,
      status: PLATFORM_APPLICATION_STATUS.Retired,
    });
    expect(() => app.assertModifiable()).toThrow(RetiredApplicationModificationError);
  });
});

// ─── PlatformApplication.toRecord ────────────────────────────────────────────

describe("PlatformApplication.toRecord", () => {
  test("returns a snapshot of the current record", () => {
    const app = PlatformApplication.create(makeRegisterCommand());
    const record = app.toRecord();
    expect(record.code).toBe("CATERING-ERP");
    expect(record.status).toBe(PLATFORM_APPLICATION_STATUS.Draft);
    expect(record.version).toBe(1n);
  });

  test("toRecord returns a copy — mutations do not affect aggregate", () => {
    const app = PlatformApplication.create(makeRegisterCommand());
    const record = app.toRecord();
    (record as any).code = "MUTATED";
    expect(app.code).toBe("CATERING-ERP");
  });
});

// ─── PlatformApplicationValidator ────────────────────────────────────────────

describe("PlatformApplicationValidator.validateRegisterCommand", () => {
  test("passes for a valid command", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(makeRegisterCommand())
    ).not.toThrow();
  });

  test("throws when code is empty", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ code: "" })
      )
    ).toThrow(PlatformApplicationValidationError);
  });

  test("throws when code is whitespace only", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ code: "   " })
      )
    ).toThrow(PlatformApplicationValidationError);
  });

  test("throws when code contains invalid characters", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ code: "APP NAME WITH SPACES" })
      )
    ).toThrow(PlatformApplicationValidationError);
  });

  test("throws when code contains lowercase characters (RC-005: validation only, no normalization)", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ code: "catering-erp" })
      )
    ).toThrow(PlatformApplicationValidationError);
  });


  test("throws when name is empty", () => {
    const err = (() => {
      try {
        PlatformApplicationValidator.validateRegisterCommand(
          makeRegisterCommand({ name: "" })
        );
      } catch (e) {
        return e;
      }
    })() as PlatformApplicationValidationError;
    expect(err).toBeInstanceOf(PlatformApplicationValidationError);
    expect(err.fields.name).toBeDefined();
  });

  test("throws when displayName is empty", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ displayName: "" })
      )
    ).toThrow(PlatformApplicationValidationError);
  });

  test("throws when category is empty", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ category: "" })
      )
    ).toThrow(PlatformApplicationValidationError);
  });

  test("throws when actorUserId is empty", () => {
    expect(() =>
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ actorUserId: "" })
      )
    ).toThrow(PlatformApplicationValidationError);
  });

  test("collects multiple field errors", () => {
    try {
      PlatformApplicationValidator.validateRegisterCommand(
        makeRegisterCommand({ code: "", name: "", displayName: "" })
      );
      fail("expected validation error");
    } catch (e) {
      expect(e).toBeInstanceOf(PlatformApplicationValidationError);
      const ve = e as PlatformApplicationValidationError;
      expect(Object.keys(ve.fields).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("PlatformApplicationValidator.validateUpdateMetadataCommand", () => {
  test("passes when id and actorUserId are provided", () => {
    expect(() =>
      PlatformApplicationValidator.validateUpdateMetadataCommand({
        id: "11111111-1111-1111-1111-111111111111",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        expectedVersion: 1n,
      })
    ).not.toThrow();
  });

  test("throws when id is empty", () => {
    expect(() =>
      PlatformApplicationValidator.validateUpdateMetadataCommand({
        id: "",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        expectedVersion: 1n,
      })
    ).toThrow(PlatformApplicationValidationError);
  });

  test("throws when displayName is provided but empty", () => {
    expect(() =>
      PlatformApplicationValidator.validateUpdateMetadataCommand({
        id: "11111111-1111-1111-1111-111111111111",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        displayName: "",
        expectedVersion: 1n,
      })
    ).toThrow(PlatformApplicationValidationError);
  });

  test("passes when displayName is not provided (no update)", () => {
    expect(() =>
      PlatformApplicationValidator.validateUpdateMetadataCommand({
        id: "11111111-1111-1111-1111-111111111111",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        expectedVersion: 1n,
      })
    ).not.toThrow();
  });
});

// ─── Domain Error Classes ─────────────────────────────────────────────────────

describe("Domain error classes", () => {
  test("PlatformApplicationNotFoundError instanceof check works", () => {
    const err = new PlatformApplicationNotFoundError("id-123");
    expect(err).toBeInstanceOf(PlatformApplicationNotFoundError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("PLATFORM_APPLICATION_NOT_FOUND");
    expect(err.message).toContain("id-123");
  });

  test("DuplicateApplicationCodeError contains code", () => {
    const err = new DuplicateApplicationCodeError("CATERING-ERP");
    expect(err).toBeInstanceOf(DuplicateApplicationCodeError);
    expect(err.code).toBe("DUPLICATE_APPLICATION_CODE");
    expect(err.message).toContain("CATERING-ERP");
  });

  test("DuplicateApplicationNameError contains name", () => {
    const err = new DuplicateApplicationNameError("Catering ERP");
    expect(err).toBeInstanceOf(DuplicateApplicationNameError);
    expect(err.code).toBe("DUPLICATE_APPLICATION_NAME");
  });

  test("InvalidLifecycleTransitionError contains from/to", () => {
    const err = new InvalidLifecycleTransitionError("Draft", "Retired");
    expect(err).toBeInstanceOf(InvalidLifecycleTransitionError);
    expect(err.fromStatus).toBe("Draft");
    expect(err.toStatus).toBe("Retired");
    expect(err.code).toBe("INVALID_LIFECYCLE_TRANSITION");
  });

  test("RetiredApplicationModificationError contains id", () => {
    const err = new RetiredApplicationModificationError("abc-123");
    expect(err).toBeInstanceOf(RetiredApplicationModificationError);
    expect(err.message).toContain("abc-123");
  });

  test("PlatformApplicationConcurrencyError contains id", () => {
    const err = new PlatformApplicationConcurrencyError("abc-123");
    expect(err).toBeInstanceOf(PlatformApplicationConcurrencyError);
    expect(err.code).toBe("PLATFORM_APPLICATION_CONCURRENCY_CONFLICT");
  });

  test("PlatformApplicationValidationError contains frozen fields", () => {
    const err = new PlatformApplicationValidationError({
      code: "required",
      name: "required",
    });
    expect(err).toBeInstanceOf(PlatformApplicationValidationError);
    expect(err.fields.code).toBe("required");
    expect(err.fields.name).toBe("required");
    expect(Object.isFrozen(err.fields)).toBe(true);
  });
});
