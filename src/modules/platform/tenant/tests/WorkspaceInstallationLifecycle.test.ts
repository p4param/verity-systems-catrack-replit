// Unit tests for WorkspaceInstallationLifecycle (CC-005 & EWP-005 state machine)
// Profile: smoke — no DB connection required

import { WorkspaceInstallationLifecycle } from "../domain/WorkspaceInstallationLifecycle";
import { InvalidInstallationLifecycleTransitionError } from "../domain/WorkspaceInstallationErrors";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";

const S = WORKSPACE_INSTALLATION_STATUS;

describe("WorkspaceInstallationLifecycle.validateTransition()", () => {
  // ── Valid transitions (CC-005 / D1) ──

  test("Installing → Installed is valid (completion)", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Installing, S.Installed)
    ).not.toThrow();
  });

  test("Installed → Suspended is valid", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Installed, S.Suspended)
    ).not.toThrow();
  });

  test("Suspended → Installed is valid (resumption)", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Suspended, S.Installed)
    ).not.toThrow();
  });

  test("Installed → Uninstalled is valid", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Installed, S.Uninstalled)
    ).not.toThrow();
  });

  test("Suspended → Uninstalled is valid", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Suspended, S.Uninstalled)
    ).not.toThrow();
  });

  // ── Invalid transitions — forbidden moves ──

  test("Installing → Suspended is invalid (must be Installed first)", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Installing, S.Suspended)
    ).toThrow(InvalidInstallationLifecycleTransitionError);
  });

  test("Installing → Uninstalled is invalid", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Installing, S.Uninstalled)
    ).toThrow(InvalidInstallationLifecycleTransitionError);
  });

  test("Uninstalled → Installed is invalid (terminal state)", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Uninstalled, S.Installed)
    ).toThrow(InvalidInstallationLifecycleTransitionError);
  });

  test("Uninstalled → Suspended is invalid (terminal state)", () => {
    expect(() =>
      WorkspaceInstallationLifecycle.validateTransition(S.Uninstalled, S.Suspended)
    ).toThrow(InvalidInstallationLifecycleTransitionError);
  });
});

describe("WorkspaceInstallationLifecycle.canTransitionTo()", () => {
  test("returns true for valid transitions", () => {
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Installing, S.Installed)).toBe(true);
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Installed, S.Suspended)).toBe(true);
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Suspended, S.Installed)).toBe(true);
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Installed, S.Uninstalled)).toBe(true);
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Suspended, S.Uninstalled)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Installing, S.Suspended)).toBe(false);
    expect(WorkspaceInstallationLifecycle.canTransitionTo(S.Uninstalled, S.Installed)).toBe(false);
  });
});

describe("WorkspaceInstallationLifecycle.allowedNextStatuses()", () => {
  test("Installing allows [Installed]", () => {
    expect(WorkspaceInstallationLifecycle.allowedNextStatuses(S.Installing)).toEqual([S.Installed]);
  });

  test("Installed allows [Suspended, Uninstalled]", () => {
    expect(WorkspaceInstallationLifecycle.allowedNextStatuses(S.Installed)).toEqual([S.Suspended, S.Uninstalled]);
  });

  test("Suspended allows [Installed, Uninstalled]", () => {
    expect(WorkspaceInstallationLifecycle.allowedNextStatuses(S.Suspended)).toEqual([S.Installed, S.Uninstalled]);
  });

  test("Uninstalled allows [] (terminal state)", () => {
    expect(WorkspaceInstallationLifecycle.allowedNextStatuses(S.Uninstalled)).toEqual([]);
  });
});

describe("WorkspaceInstallationLifecycle.isImmutable()", () => {
  test("Installing is NOT immutable", () => {
    expect(WorkspaceInstallationLifecycle.isImmutable(S.Installing)).toBe(false);
  });

  test("Installed is NOT immutable", () => {
    expect(WorkspaceInstallationLifecycle.isImmutable(S.Installed)).toBe(false);
  });

  test("Suspended is NOT immutable", () => {
    expect(WorkspaceInstallationLifecycle.isImmutable(S.Suspended)).toBe(false);
  });

  test("Uninstalled IS immutable", () => {
    expect(WorkspaceInstallationLifecycle.isImmutable(S.Uninstalled)).toBe(true);
  });
});
