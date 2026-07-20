// Unit tests for PlatformApplicationPackageLifecycle
// Profile: smoke — no DB connection required

import { PlatformApplicationPackageLifecycle } from "../domain/PlatformApplicationPackageLifecycle";
import { InvalidPackageLifecycleTransitionError } from "../domain/PlatformApplicationPackageErrors";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../models/PlatformApplicationPackageModels";

const S = PLATFORM_APPLICATION_PACKAGE_STATUS;

describe("PlatformApplicationPackageLifecycle.validateTransition()", () => {
  // ── Valid transitions ──

  test("Draft → Published is valid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Draft, S.Published)
    ).not.toThrow();
  });

  test("Published → Deprecated is valid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Published, S.Deprecated)
    ).not.toThrow();
  });

  test("Deprecated → Archived is valid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Deprecated, S.Archived)
    ).not.toThrow();
  });

  // ── Invalid transitions — forward shortcuts ──

  test("Draft → Deprecated is invalid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Draft, S.Deprecated)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Draft → Archived is invalid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Draft, S.Archived)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Published → Archived is invalid (must go through Deprecated)", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Published, S.Archived)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  // ── Invalid transitions — backward ──

  test("Published → Draft is invalid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Published, S.Draft)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Deprecated → Published is invalid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Deprecated, S.Published)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Deprecated → Draft is invalid", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Deprecated, S.Draft)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Archived → Draft is invalid (terminal state)", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Archived, S.Draft)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Archived → Published is invalid (terminal state)", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Archived, S.Published)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("Archived → Deprecated is invalid (terminal state)", () => {
    expect(() =>
      PlatformApplicationPackageLifecycle.validateTransition(S.Archived, S.Deprecated)
    ).toThrow(InvalidPackageLifecycleTransitionError);
  });

  test("error carries from and to fields", () => {
    try {
      PlatformApplicationPackageLifecycle.validateTransition(S.Archived, S.Draft);
      fail("Expected error");
    } catch (e) {
      const err = e as InvalidPackageLifecycleTransitionError;
      expect(err.from).toBe(S.Archived);
      expect(err.to).toBe(S.Draft);
    }
  });
});

describe("PlatformApplicationPackageLifecycle.canTransitionTo()", () => {
  test("returns true for valid transitions", () => {
    expect(PlatformApplicationPackageLifecycle.canTransitionTo(S.Draft, S.Published)).toBe(true);
    expect(PlatformApplicationPackageLifecycle.canTransitionTo(S.Published, S.Deprecated)).toBe(true);
    expect(PlatformApplicationPackageLifecycle.canTransitionTo(S.Deprecated, S.Archived)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(PlatformApplicationPackageLifecycle.canTransitionTo(S.Draft, S.Archived)).toBe(false);
    expect(PlatformApplicationPackageLifecycle.canTransitionTo(S.Archived, S.Published)).toBe(false);
    expect(PlatformApplicationPackageLifecycle.canTransitionTo(S.Published, S.Draft)).toBe(false);
  });
});

describe("PlatformApplicationPackageLifecycle.allowedNextStatuses()", () => {
  test("Draft allows [Published]", () => {
    expect(PlatformApplicationPackageLifecycle.allowedNextStatuses(S.Draft)).toEqual([S.Published]);
  });

  test("Published allows [Deprecated]", () => {
    expect(PlatformApplicationPackageLifecycle.allowedNextStatuses(S.Published)).toEqual([S.Deprecated]);
  });

  test("Deprecated allows [Archived]", () => {
    expect(PlatformApplicationPackageLifecycle.allowedNextStatuses(S.Deprecated)).toEqual([S.Archived]);
  });

  test("Archived allows nothing (terminal state)", () => {
    expect(PlatformApplicationPackageLifecycle.allowedNextStatuses(S.Archived)).toEqual([]);
  });

  test("returns a defensive copy — mutation does not affect internal state", () => {
    const result = PlatformApplicationPackageLifecycle.allowedNextStatuses(S.Draft);
    result.push(S.Archived as any); // mutate the returned array
    // Re-read: the internal state should be unchanged
    expect(PlatformApplicationPackageLifecycle.allowedNextStatuses(S.Draft)).toEqual([S.Published]);
  });
});

describe("PlatformApplicationPackageLifecycle.isImmutable()", () => {
  test("Draft is NOT immutable", () => {
    expect(PlatformApplicationPackageLifecycle.isImmutable(S.Draft)).toBe(false);
  });

  test("Published IS immutable", () => {
    expect(PlatformApplicationPackageLifecycle.isImmutable(S.Published)).toBe(true);
  });

  test("Deprecated IS immutable", () => {
    expect(PlatformApplicationPackageLifecycle.isImmutable(S.Deprecated)).toBe(true);
  });

  test("Archived IS immutable", () => {
    expect(PlatformApplicationPackageLifecycle.isImmutable(S.Archived)).toBe(true);
  });
});
