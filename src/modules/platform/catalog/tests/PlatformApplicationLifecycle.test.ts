// VS08A: PlatformApplicationLifecycle unit tests
// Covers: all valid transitions, all invalid transitions,
// isRetirable, isModifiable, canTransitionTo, allowedNextStatuses.

import { PlatformApplicationLifecycle } from "../domain/PlatformApplicationLifecycle";
import { InvalidLifecycleTransitionError } from "../domain/PlatformApplicationErrors";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";

const { Draft, Published, Deprecated, Retired } = PLATFORM_APPLICATION_STATUS;

// ─── validateTransition: valid transitions ────────────────────────────────────

describe("PlatformApplicationLifecycle.validateTransition — valid transitions", () => {
  test("Draft → Published is valid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Draft, Published)
    ).not.toThrow();
  });

  test("Published → Deprecated is valid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Published, Deprecated)
    ).not.toThrow();
  });

  test("Published → Retired is valid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Published, Retired)
    ).not.toThrow();
  });

  test("Deprecated → Retired is valid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Deprecated, Retired)
    ).not.toThrow();
  });
});

// ─── validateTransition: invalid transitions ──────────────────────────────────

describe("PlatformApplicationLifecycle.validateTransition — invalid transitions", () => {
  test("Draft → Deprecated is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Draft, Deprecated)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Draft → Retired is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Draft, Retired)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Draft → Draft is invalid (self-transition not permitted)", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Draft, Draft)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Published → Draft is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Published, Draft)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Published → Published is invalid (self-transition)", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Published, Published)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Deprecated → Draft is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Deprecated, Draft)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Deprecated → Published is invalid (no reversal)", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Deprecated, Published)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Retired → Draft is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Retired, Draft)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Retired → Published is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Retired, Published)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Retired → Deprecated is invalid", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Retired, Deprecated)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("Retired → Retired is invalid (terminal state)", () => {
    expect(() =>
      PlatformApplicationLifecycle.validateTransition(Retired, Retired)
    ).toThrow(InvalidLifecycleTransitionError);
  });

  test("InvalidLifecycleTransitionError exposes fromStatus and toStatus", () => {
    try {
      PlatformApplicationLifecycle.validateTransition(Draft, Retired);
      fail("expected to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidLifecycleTransitionError);
      const err = e as InvalidLifecycleTransitionError;
      expect(err.fromStatus).toBe(Draft);
      expect(err.toStatus).toBe(Retired);
    }
  });
});

// ─── isRetirable ─────────────────────────────────────────────────────────────

describe("PlatformApplicationLifecycle.isRetirable", () => {
  test("Draft is NOT retirable", () => {
    expect(PlatformApplicationLifecycle.isRetirable(Draft)).toBe(false);
  });

  test("Published IS retirable", () => {
    expect(PlatformApplicationLifecycle.isRetirable(Published)).toBe(true);
  });

  test("Deprecated IS retirable", () => {
    expect(PlatformApplicationLifecycle.isRetirable(Deprecated)).toBe(true);
  });

  test("Retired is NOT retirable", () => {
    expect(PlatformApplicationLifecycle.isRetirable(Retired)).toBe(false);
  });
});

// ─── isModifiable ─────────────────────────────────────────────────────────────

describe("PlatformApplicationLifecycle.isModifiable", () => {
  test("Draft is modifiable", () => {
    expect(PlatformApplicationLifecycle.isModifiable(Draft)).toBe(true);
  });

  test("Published is modifiable", () => {
    expect(PlatformApplicationLifecycle.isModifiable(Published)).toBe(true);
  });

  test("Deprecated is modifiable", () => {
    expect(PlatformApplicationLifecycle.isModifiable(Deprecated)).toBe(true);
  });

  test("Retired is NOT modifiable", () => {
    expect(PlatformApplicationLifecycle.isModifiable(Retired)).toBe(false);
  });
});

// ─── canTransitionTo ─────────────────────────────────────────────────────────

describe("PlatformApplicationLifecycle.canTransitionTo", () => {
  test("returns true for valid transition", () => {
    expect(PlatformApplicationLifecycle.canTransitionTo(Draft, Published)).toBe(true);
    expect(PlatformApplicationLifecycle.canTransitionTo(Published, Retired)).toBe(true);
  });

  test("returns false for invalid transition without throwing", () => {
    expect(PlatformApplicationLifecycle.canTransitionTo(Draft, Retired)).toBe(false);
    expect(PlatformApplicationLifecycle.canTransitionTo(Retired, Draft)).toBe(false);
  });
});

// ─── allowedNextStatuses ─────────────────────────────────────────────────────

describe("PlatformApplicationLifecycle.allowedNextStatuses", () => {
  test("Draft can go to Published only", () => {
    expect(PlatformApplicationLifecycle.allowedNextStatuses(Draft)).toEqual([
      Published,
    ]);
  });

  test("Published can go to Deprecated or Retired", () => {
    const next = PlatformApplicationLifecycle.allowedNextStatuses(Published);
    expect(next).toContain(Deprecated);
    expect(next).toContain(Retired);
    expect(next.length).toBe(2);
  });

  test("Deprecated can go to Retired only", () => {
    expect(PlatformApplicationLifecycle.allowedNextStatuses(Deprecated)).toEqual([
      Retired,
    ]);
  });

  test("Retired has no next statuses (terminal)", () => {
    expect(PlatformApplicationLifecycle.allowedNextStatuses(Retired)).toEqual([]);
  });

  test("returns a copy — mutating result does not affect internal state", () => {
    const next = PlatformApplicationLifecycle.allowedNextStatuses(Draft);
    next.push(Retired as any);
    const next2 = PlatformApplicationLifecycle.allowedNextStatuses(Draft);
    expect(next2).toEqual([Published]);
  });
});
