// Unit tests for WorkspaceMembership aggregate root and WorkspaceMembershipValidator
// Profile: smoke — no DB connection required

import { WorkspaceMembership } from "../domain/WorkspaceMembership";
import { WorkspaceMembershipValidator } from "../domain/WorkspaceMembershipValidator";
import {
  RemovedWorkspaceMembershipImmutableError,
  WorkspaceMembershipValidationError,
} from "../domain/WorkspaceMembershipErrors";
import type { WorkspaceMembershipRecord } from "../models/WorkspaceMembershipModels";
import {
  WORKSPACE_MEMBERSHIP_STATUS,
  WORKSPACE_ROLE,
} from "../models/WorkspaceMembershipModels";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";
const TENANT_MEMBERSHIP_ID = "00000000-0000-0000-0000-000000000050";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = WORKSPACE_MEMBERSHIP_STATUS;
const R = WORKSPACE_ROLE;

function makeRecord(
  overrides: Partial<WorkspaceMembershipRecord> = {}
): WorkspaceMembershipRecord {
  return {
    id: "00000000-0000-0000-0000-000000000060",
    workspaceId: WORKSPACE_ID,
    tenantMembershipId: TENANT_MEMBERSHIP_ID,
    workspaceRole: R.Contributor,
    status: S.Invited,
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

describe("WorkspaceMembership.invite()", () => {
  test("creates a workspace membership in Invited status with specified role", () => {
    const mem = WorkspaceMembership.invite({
      workspaceId: WORKSPACE_ID,
      tenantMembershipId: TENANT_MEMBERSHIP_ID,
      workspaceRole: R.WorkspaceAdmin,
      actorUserId: ACTOR,
    });

    expect(mem.workspaceId).toBe(WORKSPACE_ID);
    expect(mem.tenantMembershipId).toBe(TENANT_MEMBERSHIP_ID);
    expect(mem.workspaceRole).toBe(R.WorkspaceAdmin);
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);
    expect(mem.isDeleted).toBe(false);
  });

  test("defaults workspaceRole to Contributor if omitted", () => {
    const mem = WorkspaceMembership.invite({
      workspaceId: WORKSPACE_ID,
      tenantMembershipId: TENANT_MEMBERSHIP_ID,
      actorUserId: ACTOR,
    });

    expect(mem.workspaceRole).toBe(R.Contributor);
  });

  test("trims whitespace from UUID parameters", () => {
    const mem = WorkspaceMembership.invite({
      workspaceId: `  ${WORKSPACE_ID}  `,
      tenantMembershipId: `  ${TENANT_MEMBERSHIP_ID}  `,
      actorUserId: `  ${ACTOR}  `,
    });

    expect(mem.workspaceId).toBe(WORKSPACE_ID);
    expect(mem.tenantMembershipId).toBe(TENANT_MEMBERSHIP_ID);
  });
});

describe("WorkspaceMembership.reconstitute()", () => {
  test("restores state from record", () => {
    const record = makeRecord({
      status: S.Active,
      workspaceRole: R.Viewer,
      version: 4n,
    });
    const mem = WorkspaceMembership.reconstitute(record);

    expect(mem.id).toBe(record.id);
    expect(mem.status).toBe(S.Active);
    expect(mem.workspaceRole).toBe(R.Viewer);
    expect(mem.version).toBe(4n);
  });

  test("toRecord() returns a fresh copy", () => {
    const mem = WorkspaceMembership.reconstitute(makeRecord());
    const r1 = mem.toRecord();
    const r2 = mem.toRecord();
    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});

describe("WorkspaceMembership.assertModifiable()", () => {
  test("does not throw for non-removed states", () => {
    const invited = WorkspaceMembership.reconstitute(makeRecord({ status: S.Invited }));
    const active = WorkspaceMembership.reconstitute(makeRecord({ status: S.Active }));
    const suspended = WorkspaceMembership.reconstitute(makeRecord({ status: S.Suspended }));

    expect(() => invited.assertModifiable()).not.toThrow();
    expect(() => active.assertModifiable()).not.toThrow();
    expect(() => suspended.assertModifiable()).not.toThrow();
  });

  test("throws RemovedWorkspaceMembershipImmutableError for Removed status", () => {
    const mem = WorkspaceMembership.reconstitute(makeRecord({ status: S.Removed }));
    expect(() => mem.assertModifiable()).toThrow(RemovedWorkspaceMembershipImmutableError);
  });
});

describe("WorkspaceMembershipValidator", () => {
  const valid = {
    workspaceId: WORKSPACE_ID,
    tenantMembershipId: TENANT_MEMBERSHIP_ID,
    workspaceRole: R.Contributor,
    actorUserId: ACTOR,
  };

  test("validateInviteCommand accepts valid command", () => {
    expect(() => WorkspaceMembershipValidator.validateInviteCommand(valid)).not.toThrow();
  });

  test("validateInviteCommand throws on non-UUID workspaceId", () => {
    expect(() =>
      WorkspaceMembershipValidator.validateInviteCommand({
        ...valid,
        workspaceId: "invalid-uuid",
      })
    ).toThrow(WorkspaceMembershipValidationError);
  });

  test("validateInviteCommand collects missing field errors", () => {
    try {
      WorkspaceMembershipValidator.validateInviteCommand({
        workspaceId: "",
        tenantMembershipId: "",
        actorUserId: "",
      });
      fail("Expected error");
    } catch (e) {
      const err = e as WorkspaceMembershipValidationError;
      expect(err.fields).toHaveProperty("workspaceId");
      expect(err.fields).toHaveProperty("tenantMembershipId");
      expect(err.fields).toHaveProperty("actorUserId");
    }
  });

  test("validateUpdateRoleCommand accepts valid role", () => {
    expect(() =>
      WorkspaceMembershipValidator.validateUpdateRoleCommand({
        id: "00000000-0000-0000-0000-000000000060",
        workspaceRole: R.WorkspaceAdmin,
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).not.toThrow();
  });

  test("validateUpdateRoleCommand throws on invalid role name", () => {
    expect(() =>
      WorkspaceMembershipValidator.validateUpdateRoleCommand({
        id: "00000000-0000-0000-0000-000000000060",
        workspaceRole: "SuperRole" as any,
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).toThrow(WorkspaceMembershipValidationError);
  });
});
