// Unit tests for WorkspaceMembershipLifecycle (ADR-008-017 & CC-007 state machine)
// Profile: smoke — no DB connection required

import { WorkspaceMembershipLifecycle } from "../domain/WorkspaceMembershipLifecycle";
import { InvalidWorkspaceMembershipLifecycleTransitionError } from "../domain/WorkspaceMembershipErrors";
import { WORKSPACE_MEMBERSHIP_STATUS } from "../models/WorkspaceMembershipModels";

const S = WORKSPACE_MEMBERSHIP_STATUS;

describe("WorkspaceMembershipLifecycle.validateTransition()", () => {
  // ── Valid transitions (ADR-008-017) ──

  test("Invited → Active is valid (activation)", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Invited, S.Active)
    ).not.toThrow();
  });

  test("Active → Suspended is valid", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Active, S.Suspended)
    ).not.toThrow();
  });

  test("Suspended → Active is valid (reactivation)", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Suspended, S.Active)
    ).not.toThrow();
  });

  test("Active → Removed is valid", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Active, S.Removed)
    ).not.toThrow();
  });

  test("Suspended → Removed is valid", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Suspended, S.Removed)
    ).not.toThrow();
  });

  // ── Invalid transitions — forbidden moves ──

  test("Invited → Suspended is invalid (must be Active first)", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Invited, S.Suspended)
    ).toThrow(InvalidWorkspaceMembershipLifecycleTransitionError);
  });

  test("Invited → Removed is invalid", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Invited, S.Removed)
    ).toThrow(InvalidWorkspaceMembershipLifecycleTransitionError);
  });

  test("Removed → Active is invalid (terminal state)", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Removed, S.Active)
    ).toThrow(InvalidWorkspaceMembershipLifecycleTransitionError);
  });

  test("Removed → Suspended is invalid (terminal state)", () => {
    expect(() =>
      WorkspaceMembershipLifecycle.validateTransition(S.Removed, S.Suspended)
    ).toThrow(InvalidWorkspaceMembershipLifecycleTransitionError);
  });
});

describe("WorkspaceMembershipLifecycle.canTransitionTo()", () => {
  test("returns true for valid transitions", () => {
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Invited, S.Active)).toBe(true);
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Active, S.Suspended)).toBe(true);
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Suspended, S.Active)).toBe(true);
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Active, S.Removed)).toBe(true);
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Suspended, S.Removed)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Invited, S.Suspended)).toBe(false);
    expect(WorkspaceMembershipLifecycle.canTransitionTo(S.Removed, S.Active)).toBe(false);
  });
});

describe("WorkspaceMembershipLifecycle.allowedNextStatuses()", () => {
  test("Invited allows [Active]", () => {
    expect(WorkspaceMembershipLifecycle.allowedNextStatuses(S.Invited)).toEqual([S.Active]);
  });

  test("Active allows [Suspended, Removed]", () => {
    expect(WorkspaceMembershipLifecycle.allowedNextStatuses(S.Active)).toEqual([S.Suspended, S.Removed]);
  });

  test("Suspended allows [Active, Removed]", () => {
    expect(WorkspaceMembershipLifecycle.allowedNextStatuses(S.Suspended)).toEqual([S.Active, S.Removed]);
  });

  test("Removed allows [] (terminal state)", () => {
    expect(WorkspaceMembershipLifecycle.allowedNextStatuses(S.Removed)).toEqual([]);
  });
});

describe("WorkspaceMembershipLifecycle.isImmutable()", () => {
  test("Invited is NOT immutable", () => {
    expect(WorkspaceMembershipLifecycle.isImmutable(S.Invited)).toBe(false);
  });

  test("Active is NOT immutable", () => {
    expect(WorkspaceMembershipLifecycle.isImmutable(S.Active)).toBe(false);
  });

  test("Suspended is NOT immutable", () => {
    expect(WorkspaceMembershipLifecycle.isImmutable(S.Suspended)).toBe(false);
  });

  test("Removed IS immutable", () => {
    expect(WorkspaceMembershipLifecycle.isImmutable(S.Removed)).toBe(true);
  });
});
