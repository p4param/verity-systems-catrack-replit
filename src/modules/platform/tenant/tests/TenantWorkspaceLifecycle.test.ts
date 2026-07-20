// Unit tests for TenantWorkspaceLifecycle (ADR-008-014 state machine)
// Profile: smoke — no DB connection required

import { TenantWorkspaceLifecycle } from "../domain/TenantWorkspaceLifecycle";
import { InvalidWorkspaceLifecycleTransitionError } from "../domain/TenantWorkspaceErrors";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";

const S = TENANT_WORKSPACE_STATUS;

describe("TenantWorkspaceLifecycle.validateTransition()", () => {
  // ── Valid transitions (ADR-008-014) ──

  test("Provisioning → Active is valid", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Provisioning, S.Active)
    ).not.toThrow();
  });

  test("Active → Suspended is valid", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Active, S.Suspended)
    ).not.toThrow();
  });

  test("Suspended → Active is valid (reactivation)", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Suspended, S.Active)
    ).not.toThrow();
  });

  test("Suspended → Archived is valid", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Suspended, S.Archived)
    ).not.toThrow();
  });

  // ── Invalid transitions — forbidden shortcuts & illegal moves ──

  test("Provisioning → Suspended is invalid", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Provisioning, S.Suspended)
    ).toThrow(InvalidWorkspaceLifecycleTransitionError);
  });

  test("Provisioning → Archived is invalid", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Provisioning, S.Archived)
    ).toThrow(InvalidWorkspaceLifecycleTransitionError);
  });

  test("Active → Archived is invalid (must go through Suspended first)", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Active, S.Archived)
    ).toThrow(InvalidWorkspaceLifecycleTransitionError);
  });

  test("Active → Provisioning is invalid", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Active, S.Provisioning)
    ).toThrow(InvalidWorkspaceLifecycleTransitionError);
  });

  test("Archived → Active is invalid (terminal state)", () => {
    expect(() =>
      TenantWorkspaceLifecycle.validateTransition(S.Archived, S.Active)
    ).toThrow(InvalidWorkspaceLifecycleTransitionError);
  });
});

describe("TenantWorkspaceLifecycle.canTransitionTo()", () => {
  test("returns true for valid transitions", () => {
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Provisioning, S.Active)).toBe(true);
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Active, S.Suspended)).toBe(true);
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Suspended, S.Active)).toBe(true);
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Suspended, S.Archived)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Provisioning, S.Suspended)).toBe(false);
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Active, S.Archived)).toBe(false);
    expect(TenantWorkspaceLifecycle.canTransitionTo(S.Archived, S.Active)).toBe(false);
  });
});

describe("TenantWorkspaceLifecycle.allowedNextStatuses()", () => {
  test("Provisioning allows [Active]", () => {
    expect(TenantWorkspaceLifecycle.allowedNextStatuses(S.Provisioning)).toEqual([S.Active]);
  });

  test("Active allows [Suspended]", () => {
    expect(TenantWorkspaceLifecycle.allowedNextStatuses(S.Active)).toEqual([S.Suspended]);
  });

  test("Suspended allows [Active, Archived]", () => {
    expect(TenantWorkspaceLifecycle.allowedNextStatuses(S.Suspended)).toEqual([S.Active, S.Archived]);
  });

  test("Archived allows [] (terminal state)", () => {
    expect(TenantWorkspaceLifecycle.allowedNextStatuses(S.Archived)).toEqual([]);
  });
});

describe("TenantWorkspaceLifecycle.isImmutable()", () => {
  test("Provisioning is NOT immutable", () => {
    expect(TenantWorkspaceLifecycle.isImmutable(S.Provisioning)).toBe(false);
  });

  test("Active is NOT immutable", () => {
    expect(TenantWorkspaceLifecycle.isImmutable(S.Active)).toBe(false);
  });

  test("Suspended is NOT immutable", () => {
    expect(TenantWorkspaceLifecycle.isImmutable(S.Suspended)).toBe(false);
  });

  test("Archived IS immutable", () => {
    expect(TenantWorkspaceLifecycle.isImmutable(S.Archived)).toBe(true);
  });
});
