// Unit tests for TenantLifecycle (ADR-008-013 state machine)
// Profile: smoke — no DB connection required

import { TenantLifecycle } from "../domain/TenantLifecycle";
import { InvalidTenantLifecycleTransitionError } from "../domain/TenantErrors";
import { TENANT_STATUS } from "../models/TenantModels";

const S = TENANT_STATUS;

describe("TenantLifecycle.validateTransition()", () => {
  // ── Valid transitions (ADR-008-013) ──

  test("Provisioning → Active is valid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Provisioning, S.Active)
    ).not.toThrow();
  });

  test("Active → Suspended is valid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Active, S.Suspended)
    ).not.toThrow();
  });

  test("Suspended → Active is valid (reactivation)", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Suspended, S.Active)
    ).not.toThrow();
  });

  test("Suspended → Archived is valid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Suspended, S.Archived)
    ).not.toThrow();
  });

  // ── Invalid transitions — forbidden shortcuts & illegal moves ──

  test("Provisioning → Suspended is invalid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Provisioning, S.Suspended)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Provisioning → Archived is invalid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Provisioning, S.Archived)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Active → Archived is invalid (must go through Suspended first)", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Active, S.Archived)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Active → Provisioning is invalid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Active, S.Provisioning)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Suspended → Provisioning is invalid", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Suspended, S.Provisioning)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Archived → Active is invalid (terminal state)", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Archived, S.Active)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Archived → Suspended is invalid (terminal state)", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Archived, S.Suspended)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });

  test("Archived → Provisioning is invalid (terminal state)", () => {
    expect(() =>
      TenantLifecycle.validateTransition(S.Archived, S.Provisioning)
    ).toThrow(InvalidTenantLifecycleTransitionError);
  });
});

describe("TenantLifecycle.canTransitionTo()", () => {
  test("returns true for valid transitions", () => {
    expect(TenantLifecycle.canTransitionTo(S.Provisioning, S.Active)).toBe(true);
    expect(TenantLifecycle.canTransitionTo(S.Active, S.Suspended)).toBe(true);
    expect(TenantLifecycle.canTransitionTo(S.Suspended, S.Active)).toBe(true);
    expect(TenantLifecycle.canTransitionTo(S.Suspended, S.Archived)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(TenantLifecycle.canTransitionTo(S.Provisioning, S.Suspended)).toBe(false);
    expect(TenantLifecycle.canTransitionTo(S.Active, S.Archived)).toBe(false);
    expect(TenantLifecycle.canTransitionTo(S.Archived, S.Active)).toBe(false);
  });
});

describe("TenantLifecycle.allowedNextStatuses()", () => {
  test("Provisioning allows [Active]", () => {
    expect(TenantLifecycle.allowedNextStatuses(S.Provisioning)).toEqual([S.Active]);
  });

  test("Active allows [Suspended]", () => {
    expect(TenantLifecycle.allowedNextStatuses(S.Active)).toEqual([S.Suspended]);
  });

  test("Suspended allows [Active, Archived]", () => {
    expect(TenantLifecycle.allowedNextStatuses(S.Suspended)).toEqual([S.Active, S.Archived]);
  });

  test("Archived allows [] (terminal state)", () => {
    expect(TenantLifecycle.allowedNextStatuses(S.Archived)).toEqual([]);
  });

  test("returns a defensive copy", () => {
    const result = TenantLifecycle.allowedNextStatuses(S.Provisioning);
    result.push(S.Archived as any);
    expect(TenantLifecycle.allowedNextStatuses(S.Provisioning)).toEqual([S.Active]);
  });
});

describe("TenantLifecycle.isImmutable()", () => {
  test("Provisioning is NOT immutable", () => {
    expect(TenantLifecycle.isImmutable(S.Provisioning)).toBe(false);
  });

  test("Active is NOT immutable", () => {
    expect(TenantLifecycle.isImmutable(S.Active)).toBe(false);
  });

  test("Suspended is NOT immutable", () => {
    expect(TenantLifecycle.isImmutable(S.Suspended)).toBe(false);
  });

  test("Archived IS immutable", () => {
    expect(TenantLifecycle.isImmutable(S.Archived)).toBe(true);
  });
});
