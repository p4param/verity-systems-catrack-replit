// Unit tests for TenantWorkspace aggregate root and TenantWorkspaceValidator
// Profile: smoke — no DB connection required

import { TenantWorkspace } from "../domain/TenantWorkspace";
import { TenantWorkspaceValidator } from "../domain/TenantWorkspaceValidator";
import {
  ArchivedWorkspaceImmutableError,
  WorkspaceValidationError,
} from "../domain/TenantWorkspaceErrors";
import type { TenantWorkspaceRecord } from "../models/TenantWorkspaceModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "00000000-0000-0000-0000-000000000002";

function makeRecord(overrides: Partial<TenantWorkspaceRecord> = {}): TenantWorkspaceRecord {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    tenantId: TENANT_ID,
    code: "dev-workspace",
    name: "Development Workspace",
    displayName: "Dev Environment",
    description: "Sandbox for development",
    timeZone: "UTC",
    culture: "en-US",
    currency: "USD",
    status: TENANT_WORKSPACE_STATUS.Provisioning,
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

describe("TenantWorkspace.create()", () => {
  test("creates a Provisioning workspace with explicit defaults", () => {
    const ws = TenantWorkspace.create({
      tenantId: TENANT_ID,
      code: "dev-workspace",
      name: "Development Workspace",
      displayName: "Dev Environment",
      actorUserId: ACTOR,
    });

    expect(ws.tenantId).toBe(TENANT_ID);
    expect(ws.code).toBe("dev-workspace");
    expect(ws.name).toBe("Development Workspace");
    expect(ws.displayName).toBe("Dev Environment");
    expect(ws.timeZone).toBe("UTC");
    expect(ws.culture).toBe("en-US");
    expect(ws.currency).toBe("USD");
    expect(ws.status).toBe(TENANT_WORKSPACE_STATUS.Provisioning);
    expect(ws.version).toBe(1n);
    expect(ws.isDeleted).toBe(false);
  });

  test("inherits default settings from parent Tenant if omitted (D3 / ADR-008-014)", () => {
    const ws = TenantWorkspace.create(
      {
        tenantId: TENANT_ID,
        code: "prod-workspace",
        name: "Production Workspace",
        displayName: "Production Environment",
        actorUserId: ACTOR,
      },
      {
        defaultTimeZone: "Europe/Paris",
        defaultCulture: "fr-FR",
        defaultCurrency: "EUR",
      }
    );

    expect(ws.timeZone).toBe("Europe/Paris");
    expect(ws.culture).toBe("fr-FR");
    expect(ws.currency).toBe("EUR");
  });

  test("explicit command settings override parent Tenant defaults", () => {
    const ws = TenantWorkspace.create(
      {
        tenantId: TENANT_ID,
        code: "us-east-workspace",
        name: "US East Workspace",
        displayName: "US East",
        timeZone: "America/New_York",
        currency: "USD",
        actorUserId: ACTOR,
      },
      {
        defaultTimeZone: "Europe/London",
        defaultCulture: "en-GB",
        defaultCurrency: "GBP",
      }
    );

    expect(ws.timeZone).toBe("America/New_York");
    expect(ws.culture).toBe("en-GB"); // inherited from parent defaultCulture
    expect(ws.currency).toBe("USD"); // explicit override
  });

  test("trims whitespace from string attributes", () => {
    const ws = TenantWorkspace.create({
      tenantId: TENANT_ID,
      code: "  staging  ",
      name: "  Staging Environment  ",
      displayName: "  Staging  ",
      actorUserId: ACTOR,
    });

    expect(ws.code).toBe("staging");
    expect(ws.name).toBe("Staging Environment");
    expect(ws.displayName).toBe("Staging");
  });
});

describe("TenantWorkspace.reconstitute()", () => {
  test("restores state from record", () => {
    const record = makeRecord({ status: TENANT_WORKSPACE_STATUS.Active, version: 5n });
    const ws = TenantWorkspace.reconstitute(record);

    expect(ws.id).toBe(record.id);
    expect(ws.code).toBe("dev-workspace");
    expect(ws.status).toBe(TENANT_WORKSPACE_STATUS.Active);
    expect(ws.version).toBe(5n);
  });

  test("toRecord() returns a fresh copy", () => {
    const ws = TenantWorkspace.reconstitute(makeRecord());
    const r1 = ws.toRecord();
    const r2 = ws.toRecord();
    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});

describe("TenantWorkspace.assertModifiable()", () => {
  test("does not throw for non-archived states", () => {
    const p = TenantWorkspace.reconstitute(makeRecord({ status: TENANT_WORKSPACE_STATUS.Provisioning }));
    const a = TenantWorkspace.reconstitute(makeRecord({ status: TENANT_WORKSPACE_STATUS.Active }));
    const s = TenantWorkspace.reconstitute(makeRecord({ status: TENANT_WORKSPACE_STATUS.Suspended }));

    expect(() => p.assertModifiable()).not.toThrow();
    expect(() => a.assertModifiable()).not.toThrow();
    expect(() => s.assertModifiable()).not.toThrow();
  });

  test("throws ArchivedWorkspaceImmutableError for Archived status", () => {
    const ws = TenantWorkspace.reconstitute(makeRecord({ status: TENANT_WORKSPACE_STATUS.Archived }));
    expect(() => ws.assertModifiable()).toThrow(ArchivedWorkspaceImmutableError);
  });
});

describe("TenantWorkspaceValidator", () => {
  const valid = {
    tenantId: TENANT_ID,
    code: "dev-workspace",
    name: "Development Workspace",
    displayName: "Dev",
    actorUserId: ACTOR,
  };

  test("validateCreateCommand accepts valid command", () => {
    expect(() => TenantWorkspaceValidator.validateCreateCommand(valid)).not.toThrow();
  });

  test("validateCreateCommand throws on invalid code syntax", () => {
    expect(() =>
      TenantWorkspaceValidator.validateCreateCommand({
        ...valid,
        code: "invalid space code!",
      })
    ).toThrow(WorkspaceValidationError);
  });

  test("validateCreateCommand collects all missing field errors", () => {
    try {
      TenantWorkspaceValidator.validateCreateCommand({
        tenantId: "",
        code: "",
        name: "",
        displayName: "",
        actorUserId: "",
      });
      fail("Expected error");
    } catch (e) {
      const err = e as WorkspaceValidationError;
      expect(err.fields).toHaveProperty("tenantId");
      expect(err.fields).toHaveProperty("code");
      expect(err.fields).toHaveProperty("name");
      expect(err.fields).toHaveProperty("displayName");
      expect(err.fields).toHaveProperty("actorUserId");
    }
  });

  test("validateUpdateMetadataCommand accepts valid command", () => {
    expect(() =>
      TenantWorkspaceValidator.validateUpdateMetadataCommand({
        id: "00000000-0000-0000-0000-000000000010",
        displayName: "Updated Workspace",
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).not.toThrow();
  });
});
