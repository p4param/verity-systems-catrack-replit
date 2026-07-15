/**
 * VS05HC — C-01 SqlBuilder Unit Tests
 * Hard Gate | Profile: SMOKE+
 * Tests: U-01 to U-12
 *
 * SqlBuilder is a pure function — no DB, no Prisma, no mocks required.
 */
import { SqlBuilder } from "@/modules/platform/persistence/sql/SqlBuilder";
import { PostgresRuntimeDialect } from "@/modules/platform/persistence/sql/PostgresRuntimeDialect";
import type { PersistenceTable } from "@/modules/platform/persistence/types/PersistenceModel";
import { SYSTEM_COLUMNS, BUSINESS_COLUMNS, STANDARD_POLICY } from "../helpers/TestManifestFactory";

const dialect = new PostgresRuntimeDialect();

const TEST_TABLE: PersistenceTable = {
  name: "cap_test_records",
  schema: "public",
  isPrimary: true,
  columns: [...SYSTEM_COLUMNS, ...BUSINESS_COLUMNS],
  indexes: [],
};

// Helper: build a valueMap from a plain object
function valueMapFrom(obj: Record<string, any>): Map<string, any> {
  return new Map(Object.entries(obj));
}

describe("C-01 · SqlBuilder Unit Tests [HARD GATE]", () => {

  // U-01
  test("U-01: buildInsert produces correct column list and positional params", () => {
    const valueMap = valueMapFrom({
      id: "uuid-1",
      tenant_id: 1,
      record_number: "TST-000001",
      name: "Test Record",
      code: "TST",
      row_version: 1,
      is_deleted: false,
      created_by: "user-1",
    });
    const cmd = SqlBuilder.buildInsert(TEST_TABLE, valueMap, dialect);
    expect(cmd.sql).toContain("INSERT INTO");
    expect(cmd.sql).toContain('"cap_test_records"');
    expect(cmd.sql).toContain("$1");
    expect(cmd.params).toHaveLength(valueMap.size);
    expect(cmd.params).not.toEqual([]); // params are populated
  });

  // U-02
  test("U-02: buildInsert with SQL injection payload — value only in params, never in SQL", () => {
    const maliciousValue = "'; DROP TABLE users; --";
    const valueMap = valueMapFrom({
      id: "uuid-inject",
      tenant_id: 1,
      name: maliciousValue,
      row_version: 1,
      is_deleted: false,
    });
    const cmd = SqlBuilder.buildInsert(TEST_TABLE, valueMap, dialect);
    expect(cmd.sql).not.toContain("DROP TABLE");
    expect(cmd.sql).not.toContain("'");
    expect(cmd.params).toContain(maliciousValue);
  });

  // U-03
  test("U-03: buildUpdate with ROW_VERSION strategy includes version in WHERE", () => {
    const valueMap = valueMapFrom({ name: "Updated Name", updated_by: "user-1" });
    const cmd = SqlBuilder.buildUpdate(TEST_TABLE, "uuid-1", 1, valueMap, STANDARD_POLICY, dialect);
    expect(cmd.sql).toContain("row_version");
    expect(cmd.sql).toMatch(/\$\d+/);
    expect(cmd.params).toContain(1); // expectedVersion=1
  });

  // U-04
  test("U-04: buildUpdate with NONE strategy — no version in WHERE", () => {
    const nonePolicy = { ...STANDARD_POLICY, lockingStrategy: "NONE" as const, concurrency: { field: "row_version", strategy: "NONE" as const } };
    const valueMap = valueMapFrom({ name: "Updated No Lock" });
    const cmd = SqlBuilder.buildUpdate(TEST_TABLE, "uuid-1", 0, valueMap, nonePolicy, dialect);
    expect(cmd.sql).not.toMatch(/AND.*row_version.*=.*\$\d+/);
  });

  // U-05
  test("U-05: buildSoftDelete sets is_deleted, deleted_at, deleted_by", () => {
    const cmd = SqlBuilder.buildSoftDelete(TEST_TABLE, "uuid-1", "user-del", STANDARD_POLICY, dialect);
    expect(cmd.sql).toContain("is_deleted");
    expect(cmd.sql).toContain("deleted_at");
    expect(cmd.sql).toContain("deleted_by");
    expect(cmd.params).toContain("user-del");
    // true is embedded inline in SQL (= true), not a param
    expect(cmd.sql).toContain("= true");
    expect(cmd.params).toContain("uuid-1");
  });

  // U-06
  test("U-06: buildSelect with ilike filter — ILIKE in SQL, value in params", () => {
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { where: [{ field: "name", operator: "ilike", value: "%test%" }] },
      STANDARD_POLICY,
      dialect
    );
    expect(cmd.sql.toLowerCase()).toContain("ilike");
    expect(cmd.params).toContain("%test%");
    expect(cmd.sql).not.toContain("%test%");
  });

  // U-07
  test("U-07: buildSelect with 'in' operator for 3 values", () => {
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { where: [{ field: "code", operator: "in", values: ["A", "B", "C"] }] },
      STANDARD_POLICY,
      dialect
    );
    expect(cmd.sql).toContain("$1");
    expect(cmd.sql).toContain("$2");
    expect(cmd.sql).toContain("$3");
    expect(cmd.params).toEqual(expect.arrayContaining(["A", "B", "C"]));
  });

  // U-08
  test("U-08: buildSelect default soft-delete exclusion appended", () => {
    const cmd = SqlBuilder.buildSelect(TEST_TABLE, {}, STANDARD_POLICY, dialect);
    expect(cmd.sql).toContain("is_deleted");
    // is_deleted = false is embedded inline in the WHERE clause (not a param)
    expect(cmd.sql).toContain("= false");
  });

  // U-09
  test("U-09: buildSelect with includeDeleted:true omits soft-delete filter", () => {
    const cmd = SqlBuilder.buildSelect(TEST_TABLE, { includeDeleted: true }, STANDARD_POLICY, dialect);
    expect(cmd.sql).not.toMatch(/is_deleted.*=.*false/i);
  });

  // U-10
  test("U-10: buildCount returns correct COUNT shape", () => {
    const cmd = SqlBuilder.buildCount(TEST_TABLE, {}, STANDARD_POLICY, dialect);
    expect(cmd.sql.toLowerCase()).toContain("count(*)");
    expect(cmd.sql.toLowerCase()).toContain("as count");
  });

  // U-11
  test("U-11: buildExists returns correct EXISTS shape", () => {
    const cmd = SqlBuilder.buildExists(TEST_TABLE, "uuid-1", dialect);
    expect(cmd.sql.toLowerCase()).toContain("exists");
    expect(cmd.sql.toLowerCase()).toContain("select 1");
    expect(cmd.params).toContain("uuid-1");
  });

  // U-12
  test("U-12: buildBulkInsert with 3 rows generates single SQL with 3 value tuples", () => {
    const rows: Array<Map<string, any>> = [
      valueMapFrom({ id: "uuid-1", tenant_id: 1, name: "Row1", row_version: 1, is_deleted: false }),
      valueMapFrom({ id: "uuid-2", tenant_id: 1, name: "Row2", row_version: 1, is_deleted: false }),
      valueMapFrom({ id: "uuid-3", tenant_id: 1, name: "Row3", row_version: 1, is_deleted: false }),
    ];
    const cmd = SqlBuilder.buildBulkInsert(TEST_TABLE, rows, dialect);
    // Should have exactly 3 sets of value tuples
    const tupleCount = (cmd.sql.match(/\(/g) || []).length - 1; // subtract the column list opening paren
    expect(tupleCount).toBeGreaterThanOrEqual(3);
    // params length must be cols × rows
    const colCount = rows[0].size;
    expect(cmd.params).toHaveLength(colCount * 3);
  });

  // Bonus: verify no SQL keyword injection via identifier
  test("U-01b: buildInsert column references are always double-quoted identifiers", () => {
    const valueMap = valueMapFrom({ name: "Safe Value", tenant_id: 1, id: "uuid-safe", row_version: 1, is_deleted: false });
    const cmd = SqlBuilder.buildInsert(TEST_TABLE, valueMap, dialect);
    // Every column reference in the INSERT column list must be double-quoted
    const insertColsPart = cmd.sql.match(/INSERT INTO[^(]+\(([^)]+)\)/)?.[1] ?? "";
    const rawNames = insertColsPart.split(",").map(s => s.trim());
    for (const col of rawNames) {
      expect(col).toMatch(/^"[^""]+"$/); // must be "colname" format
    }
  });
});
