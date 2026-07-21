// Unit tests for TenantMembershipLifecycle (ADR-008-016 & CC-006 state machine)
// Profile: smoke — no DB connection required

import { TenantMembershipLifecycle } from "../domain/TenantMembershipLifecycle";
import { InvalidMembershipLifecycleTransitionError } from "../domain/TenantMembershipErrors";
import { TENANT_MEMBERSHIP_STATUS } from "../models/TenantMembershipModels";

const S = TENANT_MEMBERSHIP_STATUS;

describe("TenantMembershipLifecycle.validateTransition()", () => {
  // ── Valid transitions (ADR-008-016 / D2) ──

  test("Invited → Active is valid (activation)", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Invited, S.Active)
    ).not.toThrow();
  });

  test("Active → Suspended is valid", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Active, S.Suspended)
    ).not.toThrow();
  });

  test("Suspended → Active is valid (reactivation)", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Suspended, S.Active)
    ).not.toThrow();
  });

  test("Active → Removed is valid", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Active, S.Removed)
    ).not.toThrow();
  });

  test("Suspended → Removed is valid", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Suspended, S.Removed)
    ).not.toThrow();
  });

  // ── Invalid transitions — forbidden moves ──

  test("Invited → Suspended is invalid (must be Active first)", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Invited, S.Suspended)
    ).toThrow(InvalidMembershipLifecycleTransitionError);
  });

  test("Invited → Removed is invalid", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Invited, S.Removed)
    ).toThrow(InvalidMembershipLifecycleTransitionError);
  });

  test("Removed → Active is invalid (terminal state / D4)", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Removed, S.Active)
    ).toThrow(InvalidMembershipLifecycleTransitionError);
  });

  test("Removed → Suspended is invalid (terminal state / D4)", () => {
    expect(() =>
      TenantMembershipLifecycle.validateTransition(S.Removed, S.Suspended)
    ).toThrow(InvalidMembershipLifecycleTransitionError);
  });
});

describe("TenantMembershipLifecycle.canTransitionTo()", () => {
  test("returns true for valid transitions", () => {
    expect(TenantMembershipLifecycle.canTransitionTo(S.Invited, S.Active)).toBe(true);
    expect(TenantMembershipLifecycle.canTransitionTo(S.Active, S.Suspended)).toBe(true);
    expect(TenantMembershipLifecycle.canTransitionTo(S.Suspended, S.Active)).toBe(true);
    expect(TenantMembershipLifecycle.canTransitionTo(S.Active, S.Removed)).toBe(true);
    expect(TenantMembershipLifecycle.canTransitionTo(S.Suspended, S.Removed)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(TenantMembershipLifecycle.canTransitionTo(S.Invited, S.Suspended)).toBe(false);
    expect(TenantMembershipLifecycle.canTransitionTo(S.Removed, S.Active)).toBe(false);
  });
});

describe("TenantMembershipLifecycle.allowedNextStatuses()", () => {
  test("Invited allows [Active]", () => {
    expect(TenantMembershipLifecycle.allowedNextStatuses(S.Invited)).toEqual([S.Active]);
  });

  test("Active allows [Suspended, Removed]", () => {
    expect(TenantMembershipLifecycle.allowedNextStatuses(S.Active)).toEqual([S.Suspended, S.Removed]);
  });

  test("Suspended allows [Active, Removed]", () => {
    expect(TenantMembershipLifecycle.allowedNextStatuses(S.Suspended)).toEqual([S.Active, S.Removed]);
  });

  test("Removed allows [] (terminal state)", () => {
    expect(TenantMembershipLifecycle.allowedNextStatuses(S.Removed)).toEqual([]);
  });
});

describe("TenantMembershipLifecycle.isImmutable()", () => {
  test("Invited is NOT immutable", () => {
    expect(TenantMembershipLifecycle.isImmutable(S.Invited)).toBe(false);
  });

  test("Active is NOT immutable", () => {
    expect(TenantMembershipLifecycle.isImmutable(S.Active)).toBe(false);
  });

  test("Suspended is NOT immutable", () => {
    expect(TenantMembershipLifecycle.isImmutable(S.Suspended)).toBe(false);
  });

  test("Removed IS immutable", () => {
    expect(TenantMembershipLifecycle.isImmutable(S.Removed)).toBe(true);
  });
});
