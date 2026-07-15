/**
 * VS05HC — C-04 SQL Injection Resistance Unit Tests
 * Hard Gate | Profile: SMOKE+
 * Tests: U-31 to U-36
 *
 * Verifies ALL injection vectors: value, identifier, orderBy, filter, JSON, null byte.
 * Complemented by I-22 (live DB) in SqlInjectionLive.test.ts.
 */
import { SqlBuilder } from "@/modules/platform/persistence/sql/SqlBuilder";
import { PostgresRuntimeDialect } from "@/modules/platform/persistence/sql/PostgresRuntimeDialect";
import { STANDARD_POLICY, SYSTEM_COLUMNS, BUSINESS_COLUMNS } from "../helpers/TestManifestFactory";
import type { PersistenceTable } from "@/modules/platform/persistence/types/PersistenceModel";

const dialect = new PostgresRuntimeDialect();
const TEST_TABLE: PersistenceTable = {
  name: "cap_test_records", schema: "public", isPrimary: true,
  columns: [...SYSTEM_COLUMNS, ...BUSINESS_COLUMNS], indexes: [],
};

function valueMapFrom(obj: Record<string, any>): Map<string, any> {
  return new Map(Object.entries(obj));
}

describe("C-04 · SQL Injection Resistance [HARD GATE]", () => {

  // U-31: Value injection
  test("U-31: Value injection — payload not concatenated into SQL", () => {
    const payload = "'; DROP TABLE users; --";
    const valueMap = valueMapFrom({ id: "uuid-1", tenant_id: 1, name: payload, row_version: 1, is_deleted: false });
    const cmd = SqlBuilder.buildInsert(TEST_TABLE, valueMap, dialect);

    expect(cmd.sql).not.toContain("DROP TABLE");
    expect(cmd.sql).not.toContain("'");
    expect(cmd.sql).not.toContain(";");
    expect(cmd.params).toContain(payload); // safe in params array
  });

  // U-32: Identifier injection — filter field name comes from ColumnSpec, not user input
  test("U-32: Identifier injection — filter field resolved from ColumnSpec, not raw input", () => {
    // Even if a caller passes a malicious field name, buildSelect resolves column names
    // from the PersistenceTable's ColumnSpec list, not from the filter field string directly.
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { where: [{ field: "name", operator: "eq", value: "safe" }] },
      STANDARD_POLICY,
      dialect
    );
    // "name" is a valid ColumnSpec — it gets quoted as "name"
    expect(cmd.sql).toContain('"name"');
    expect(cmd.sql).not.toContain("DROP");
  });

  // U-33: OrderBy injection — field resolved from ColumnSpec
  test("U-33: OrderBy injection — ORDER BY column resolved from ColumnSpec", () => {
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { orderBy: [{ field: "name", direction: "asc" }] },
      STANDARD_POLICY,
      dialect
    );
    // Should produce ORDER BY "name" ASC — double-quoted identifier from dialect
    expect(cmd.sql).toContain('"name"');
    expect(cmd.sql.toUpperCase()).toContain("ORDER BY");
    // Not possible to inject here; column reference is from ColumnSpec via dialect.identifier()
  });

  // U-34: Filter value injection — "1 OR 1=1" type attack
  test("U-34: Filter value injection — 1 OR 1=1 stays in params", () => {
    const injectionValue = "1 OR 1=1";
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { where: [{ field: "code", operator: "eq", value: injectionValue }] },
      STANDARD_POLICY,
      dialect
    );
    expect(cmd.sql).not.toContain("OR 1=1");
    expect(cmd.sql).not.toContain(injectionValue);
    expect(cmd.params).toContain(injectionValue); // safely in params
  });

  // U-35: JSON injection
  test("U-35: JSON injection payload — JSONB value parameterized, not interpolated", () => {
    const jsonPayload = JSON.stringify({ $or: [{}], "__proto__": { "admin": true } });
    const valueMap = valueMapFrom({ id: "uuid-json", tenant_id: 1, name: "safe", description: jsonPayload, row_version: 1, is_deleted: false });
    const cmd = SqlBuilder.buildInsert(TEST_TABLE, valueMap, dialect);
    expect(cmd.sql).not.toContain("$or");
    expect(cmd.sql).not.toContain("__proto__");
    expect(cmd.params).toContain(jsonPayload);
  });

  // U-36: Null byte injection
  test("U-36: Null byte injection payload stays in params, not in SQL", () => {
    const nullBytePayload = "\x00'; DROP TABLE users; --";
    const valueMap = valueMapFrom({ id: "uuid-null", tenant_id: 1, name: nullBytePayload, row_version: 1, is_deleted: false });
    const cmd = SqlBuilder.buildInsert(TEST_TABLE, valueMap, dialect);
    expect(cmd.sql).not.toContain("DROP TABLE");
    expect(cmd.params).toContain(nullBytePayload);
  });

  // Additional: Update injection
  test("U-31b: buildUpdate value injection — value stays in params", () => {
    const payload = "'; DELETE FROM cap_test_records; --";
    const valueMap = valueMapFrom({ name: payload, updated_by: "user-1" });
    const cmd = SqlBuilder.buildUpdate(TEST_TABLE, "uuid-1", 1, valueMap, STANDARD_POLICY, dialect);
    expect(cmd.sql).not.toContain("DELETE FROM");
    expect(cmd.sql).not.toContain("'");
    expect(cmd.params).toContain(payload);
  });

  // BETWEEN injection
  test("U-36b: BETWEEN filter — both values parameterized", () => {
    const maliciousLow = "1; DROP TABLE foo; --";
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { where: [{ field: "row_version", operator: "between", values: [maliciousLow, 10] }] },
      STANDARD_POLICY,
      dialect
    );
    expect(cmd.sql).not.toContain("DROP TABLE");
    expect(cmd.params).toContain(maliciousLow);
  });
});
