// Unit tests for TenantMembership aggregate root and TenantMembershipValidator
// Profile: smoke — no DB connection required

import { TenantMembership } from "../domain/TenantMembership";
import { TenantMembershipValidator } from "../domain/TenantMembershipValidator";
import {
  RemovedMembershipImmutableError,
  TenantMembershipValidationError,
} from "../domain/TenantMembershipErrors";
import type { TenantMembershipRecord } from "../models/TenantMembershipModels";
import {
  TENANT_MEMBERSHIP_STATUS,
  TENANT_ROLE,
} from "../models/TenantMembershipModels";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000005";
const ACTOR = "00000000-0000-0000-0000-000000000002";
const S = TENANT_MEMBERSHIP_STATUS;
const R = TENANT_ROLE;

function makeRecord(
  overrides: Partial<TenantMembershipRecord> = {}
): TenantMembershipRecord {
  return {
    id: "00000000-0000-0000-0000-000000000050",
    tenantId: TENANT_ID,
    userId: USER_ID,
    tenantRole: R.Member,
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

describe("TenantMembership.invite()", () => {
  test("creates a membership in Invited status with specified role (D3)", () => {
    const mem = TenantMembership.invite({
      tenantId: TENANT_ID,
      userId: USER_ID,
      tenantRole: R.Admin,
      actorUserId: ACTOR,
    });

    expect(mem.tenantId).toBe(TENANT_ID);
    expect(mem.userId).toBe(USER_ID);
    expect(mem.tenantRole).toBe(R.Admin);
    expect(mem.status).toBe(S.Invited);
    expect(mem.version).toBe(1n);
    expect(mem.isDeleted).toBe(false);
  });

  test("defaults tenantRole to Member if omitted", () => {
    const mem = TenantMembership.invite({
      tenantId: TENANT_ID,
      userId: USER_ID,
      actorUserId: ACTOR,
    });

    expect(mem.tenantRole).toBe(R.Member);
  });

  test("trims whitespace from UUID parameters", () => {
    const mem = TenantMembership.invite({
      tenantId: `  ${TENANT_ID}  `,
      userId: `  ${USER_ID}  `,
      actorUserId: `  ${ACTOR}  `,
    });

    expect(mem.tenantId).toBe(TENANT_ID);
    expect(mem.userId).toBe(USER_ID);
  });
});

describe("TenantMembership.reconstitute()", () => {
  test("restores state from record", () => {
    const record = makeRecord({
      status: S.Active,
      tenantRole: R.Owner,
      version: 4n,
    });
    const mem = TenantMembership.reconstitute(record);

    expect(mem.id).toBe(record.id);
    expect(mem.status).toBe(S.Active);
    expect(mem.tenantRole).toBe(R.Owner);
    expect(mem.version).toBe(4n);
  });

  test("toRecord() returns a fresh copy", () => {
    const mem = TenantMembership.reconstitute(makeRecord());
    const r1 = mem.toRecord();
    const r2 = mem.toRecord();
    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});

describe("TenantMembership.assertModifiable()", () => {
  test("does not throw for non-removed states", () => {
    const invited = TenantMembership.reconstitute(makeRecord({ status: S.Invited }));
    const active = TenantMembership.reconstitute(makeRecord({ status: S.Active }));
    const suspended = TenantMembership.reconstitute(makeRecord({ status: S.Suspended }));

    expect(() => invited.assertModifiable()).not.toThrow();
    expect(() => active.assertModifiable()).not.toThrow();
    expect(() => suspended.assertModifiable()).not.toThrow();
  });

  test("throws RemovedMembershipImmutableError for Removed status", () => {
    const mem = TenantMembership.reconstitute(makeRecord({ status: S.Removed }));
    expect(() => mem.assertModifiable()).toThrow(RemovedMembershipImmutableError);
  });
});

describe("TenantMembershipValidator", () => {
  const valid = {
    tenantId: TENANT_ID,
    userId: USER_ID,
    tenantRole: R.Admin,
    actorUserId: ACTOR,
  };

  test("validateInviteCommand accepts valid command", () => {
    expect(() => TenantMembershipValidator.validateInviteCommand(valid)).not.toThrow();
  });

  test("validateInviteCommand throws on non-UUID tenantId", () => {
    expect(() =>
      TenantMembershipValidator.validateInviteCommand({
        ...valid,
        tenantId: "invalid-uuid",
      })
    ).toThrow(TenantMembershipValidationError);
  });

  test("validateInviteCommand collects missing field errors", () => {
    try {
      TenantMembershipValidator.validateInviteCommand({
        tenantId: "",
        userId: "",
        actorUserId: "",
      });
      fail("Expected error");
    } catch (e) {
      const err = e as TenantMembershipValidationError;
      expect(err.fields).toHaveProperty("tenantId");
      expect(err.fields).toHaveProperty("userId");
      expect(err.fields).toHaveProperty("actorUserId");
    }
  });

  test("validateUpdateRoleCommand accepts valid role", () => {
    expect(() =>
      TenantMembershipValidator.validateUpdateRoleCommand({
        id: "00000000-0000-0000-0000-000000000050",
        tenantRole: R.Owner,
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).not.toThrow();
  });

  test("validateUpdateRoleCommand throws on invalid role name", () => {
    expect(() =>
      TenantMembershipValidator.validateUpdateRoleCommand({
        id: "00000000-0000-0000-0000-000000000050",
        tenantRole: "SuperAdmin" as any,
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).toThrow(TenantMembershipValidationError);
  });
});
