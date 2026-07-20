// Unit tests for WorkspaceInstallation aggregate root and WorkspaceInstallationValidator
// Profile: smoke — no DB connection required

import { WorkspaceInstallation } from "../domain/WorkspaceInstallation";
import { WorkspaceInstallationValidator } from "../domain/WorkspaceInstallationValidator";
import {
  UninstalledInstallationImmutableError,
  WorkspaceInstallationValidationError,
} from "../domain/WorkspaceInstallationErrors";
import type { WorkspaceInstallationRecord } from "../models/WorkspaceInstallationModels";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const PACKAGE_ID = "00000000-0000-0000-0000-000000000020";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = WORKSPACE_INSTALLATION_STATUS;

function makeRecord(
  overrides: Partial<WorkspaceInstallationRecord> = {}
): WorkspaceInstallationRecord {
  return {
    id: "00000000-0000-0000-0000-000000000030",
    workspaceId: WORKSPACE_ID,
    packageId: PACKAGE_ID,
    status: S.Installing,
    installedAt: null,
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

describe("WorkspaceInstallation.create()", () => {
  test("creates a workspace installation in Installing status with null installedAt (D1 / D2)", () => {
    const inst = WorkspaceInstallation.create({
      workspaceId: WORKSPACE_ID,
      packageId: PACKAGE_ID,
      actorUserId: ACTOR,
    });

    expect(inst.workspaceId).toBe(WORKSPACE_ID);
    expect(inst.packageId).toBe(PACKAGE_ID);
    expect(inst.status).toBe(S.Installing);
    expect(inst.installedAt).toBeNull();
    expect(inst.version).toBe(1n);
    expect(inst.isDeleted).toBe(false);
  });

  test("trims whitespace from UUID parameters", () => {
    const inst = WorkspaceInstallation.create({
      workspaceId: `  ${WORKSPACE_ID}  `,
      packageId: `  ${PACKAGE_ID}  `,
      actorUserId: `  ${ACTOR}  `,
    });

    expect(inst.workspaceId).toBe(WORKSPACE_ID);
    expect(inst.packageId).toBe(PACKAGE_ID);
  });
});

describe("WorkspaceInstallation.reconstitute()", () => {
  test("restores state from record including installedAt", () => {
    const installedTime = new Date("2026-01-02T12:00:00Z");
    const record = makeRecord({
      status: S.Installed,
      installedAt: installedTime,
      version: 3n,
    });
    const inst = WorkspaceInstallation.reconstitute(record);

    expect(inst.id).toBe(record.id);
    expect(inst.status).toBe(S.Installed);
    expect(inst.installedAt).toEqual(installedTime);
    expect(inst.version).toBe(3n);
  });

  test("toRecord() returns a fresh copy", () => {
    const inst = WorkspaceInstallation.reconstitute(makeRecord());
    const r1 = inst.toRecord();
    const r2 = inst.toRecord();
    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});

describe("WorkspaceInstallation.assertModifiable()", () => {
  test("does not throw for non-uninstalled states", () => {
    const installing = WorkspaceInstallation.reconstitute(makeRecord({ status: S.Installing }));
    const installed = WorkspaceInstallation.reconstitute(makeRecord({ status: S.Installed }));
    const suspended = WorkspaceInstallation.reconstitute(makeRecord({ status: S.Suspended }));

    expect(() => installing.assertModifiable()).not.toThrow();
    expect(() => installed.assertModifiable()).not.toThrow();
    expect(() => suspended.assertModifiable()).not.toThrow();
  });

  test("throws UninstalledInstallationImmutableError for Uninstalled status", () => {
    const inst = WorkspaceInstallation.reconstitute(makeRecord({ status: S.Uninstalled }));
    expect(() => inst.assertModifiable()).toThrow(UninstalledInstallationImmutableError);
  });
});

describe("WorkspaceInstallationValidator", () => {
  const valid = {
    workspaceId: WORKSPACE_ID,
    packageId: PACKAGE_ID,
    actorUserId: ACTOR,
  };

  test("validateInstallCommand accepts valid UUIDs", () => {
    expect(() => WorkspaceInstallationValidator.validateInstallCommand(valid)).not.toThrow();
  });

  test("validateInstallCommand throws on non-UUID workspaceId", () => {
    expect(() =>
      WorkspaceInstallationValidator.validateInstallCommand({
        ...valid,
        workspaceId: "not-a-uuid",
      })
    ).toThrow(WorkspaceInstallationValidationError);
  });

  test("validateInstallCommand collects all missing field errors", () => {
    try {
      WorkspaceInstallationValidator.validateInstallCommand({
        workspaceId: "",
        packageId: "",
        actorUserId: "",
      });
      fail("Expected error");
    } catch (e) {
      const err = e as WorkspaceInstallationValidationError;
      expect(err.fields).toHaveProperty("workspaceId");
      expect(err.fields).toHaveProperty("packageId");
      expect(err.fields).toHaveProperty("actorUserId");
    }
  });
});
