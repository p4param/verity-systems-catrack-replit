// Unit tests for Tenant aggregate root and TenantValidator
// Profile: smoke — no DB connection required

import { Tenant } from "../domain/Tenant";
import { TenantValidator } from "../domain/TenantValidator";
import {
  ArchivedTenantImmutableError,
  TenantValidationError,
} from "../domain/TenantErrors";
import type { TenantRecord } from "../models/TenantModels";
import { TENANT_STATUS } from "../models/TenantModels";

const ACTOR = "00000000-0000-0000-0000-000000000001";

function makeRecord(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    code: "acme-corp",
    name: "Acme Corporation",
    displayName: "Acme Corp",
    description: "Enterprise tenant",
    logoUrl: "https://example.com/logo.png",
    defaultTimeZone: "UTC",
    defaultCulture: "en-US",
    defaultCurrency: "USD",
    status: TENANT_STATUS.Provisioning,
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

describe("Tenant.create()", () => {
  test("creates a Provisioning tenant with defaults", () => {
    const tenant = Tenant.create({
      code: "acme-corp",
      name: "Acme Corporation",
      displayName: "Acme Corp",
      actorUserId: ACTOR,
    });

    expect(tenant.code).toBe("acme-corp");
    expect(tenant.name).toBe("Acme Corporation");
    expect(tenant.displayName).toBe("Acme Corp");
    expect(tenant.defaultTimeZone).toBe("UTC");
    expect(tenant.defaultCulture).toBe("en-US");
    expect(tenant.defaultCurrency).toBe("USD");
    expect(tenant.status).toBe(TENANT_STATUS.Provisioning);
    expect(tenant.version).toBe(1n);
    expect(tenant.isDeleted).toBe(false);
    expect(tenant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  test("trims whitespace from fields", () => {
    const tenant = Tenant.create({
      code: "  beta-inc  ",
      name: "  Beta Inc  ",
      displayName: "  Beta Inc  ",
      actorUserId: ACTOR,
    });

    expect(tenant.code).toBe("beta-inc");
    expect(tenant.name).toBe("Beta Inc");
    expect(tenant.displayName).toBe("Beta Inc");
  });

  test("stores optional description, logoUrl, and defaults", () => {
    const tenant = Tenant.create({
      code: "acme-corp",
      name: "Acme Corporation",
      displayName: "Acme Corp",
      description: "A description",
      logoUrl: "https://example.com/logo.png",
      defaultTimeZone: "America/New_York",
      defaultCulture: "en-CA",
      defaultCurrency: "CAD",
      actorUserId: ACTOR,
    });

    expect(tenant.description).toBe("A description");
    expect(tenant.logoUrl).toBe("https://example.com/logo.png");
    expect(tenant.defaultTimeZone).toBe("America/New_York");
    expect(tenant.defaultCulture).toBe("en-CA");
    expect(tenant.defaultCurrency).toBe("CAD");
  });
});

describe("Tenant.reconstitute()", () => {
  test("restores state from record", () => {
    const record = makeRecord({ status: TENANT_STATUS.Active, version: 3n });
    const tenant = Tenant.reconstitute(record);

    expect(tenant.id).toBe(record.id);
    expect(tenant.code).toBe("acme-corp");
    expect(tenant.status).toBe(TENANT_STATUS.Active);
    expect(tenant.version).toBe(3n);
  });

  test("toRecord() returns a fresh copy", () => {
    const tenant = Tenant.reconstitute(makeRecord());
    const r1 = tenant.toRecord();
    const r2 = tenant.toRecord();
    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});

describe("Tenant.assertModifiable()", () => {
  test("does not throw for Provisioning status", () => {
    const t = Tenant.reconstitute(makeRecord({ status: TENANT_STATUS.Provisioning }));
    expect(() => t.assertModifiable()).not.toThrow();
  });

  test("does not throw for Active status", () => {
    const t = Tenant.reconstitute(makeRecord({ status: TENANT_STATUS.Active }));
    expect(() => t.assertModifiable()).not.toThrow();
  });

  test("does not throw for Suspended status", () => {
    const t = Tenant.reconstitute(makeRecord({ status: TENANT_STATUS.Suspended }));
    expect(() => t.assertModifiable()).not.toThrow();
  });

  test("throws ArchivedTenantImmutableError for Archived status", () => {
    const t = Tenant.reconstitute(makeRecord({ status: TENANT_STATUS.Archived }));
    expect(() => t.assertModifiable()).toThrow(ArchivedTenantImmutableError);
  });
});

describe("TenantValidator", () => {
  const valid = {
    code: "acme-corp",
    name: "Acme Corporation",
    displayName: "Acme Corp",
    actorUserId: ACTOR,
  };

  test("validateRegisterCommand accepts valid command", () => {
    expect(() => TenantValidator.validateRegisterCommand(valid)).not.toThrow();
  });

  test("validateRegisterCommand throws on invalid code syntax", () => {
    expect(() =>
      TenantValidator.validateRegisterCommand({
        ...valid,
        code: "invalid code!",
      })
    ).toThrow(TenantValidationError);
  });

  test("validateRegisterCommand throws on missing required fields", () => {
    try {
      TenantValidator.validateRegisterCommand({
        code: "",
        name: "",
        displayName: "",
        actorUserId: "",
      });
      fail("Expected error");
    } catch (e) {
      const err = e as TenantValidationError;
      expect(err.fields).toHaveProperty("code");
      expect(err.fields).toHaveProperty("name");
      expect(err.fields).toHaveProperty("displayName");
      expect(err.fields).toHaveProperty("actorUserId");
    }
  });

  test("validateUpdateMetadataCommand accepts valid command", () => {
    expect(() =>
      TenantValidator.validateUpdateMetadataCommand({
        id: "00000000-0000-0000-0000-000000000001",
        displayName: "New Display Name",
        actorUserId: ACTOR,
        expectedVersion: 1n,
      })
    ).not.toThrow();
  });
});
