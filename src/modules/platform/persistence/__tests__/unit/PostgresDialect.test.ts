/**
 * VS05HC — C-02 PostgresRuntimeDialect Unit Tests
 * Hard Gate | Profile: SMOKE+
 * Tests: U-13 to U-19
 */
import { PostgresRuntimeDialect } from "@/modules/platform/persistence/sql/PostgresRuntimeDialect";

const dialect = new PostgresRuntimeDialect();

describe("C-02 · PostgresRuntimeDialect Unit Tests [HARD GATE]", () => {

  // U-13
  test("U-13: identifier() returns double-quoted identifier", () => {
    expect(dialect.identifier("my_col")).toBe('"my_col"');
  });

  // U-14
  test("U-14: identifier() escapes embedded double-quotes", () => {
    expect(dialect.identifier('col"with"quotes')).toBe('"col""with""quotes"');
  });

  // U-15
  test("U-15: tableRef() returns schema-qualified double-quoted reference", () => {
    expect(dialect.tableRef("public", "hr_dept")).toBe('"public"."hr_dept"');
  });

  // U-16
  test("U-16: mapDataType(STRING) returns VARCHAR(255)", () => {
    expect(dialect.mapDataType("STRING")).toBe("VARCHAR(255)");
  });

  // U-17
  test("U-17: mapDataType(STRING, 100) returns VARCHAR(100)", () => {
    expect(dialect.mapDataType("STRING", 100)).toBe("VARCHAR(100)");
  });

  // U-18
  test("U-18: mapDataType(DATETIME) returns TIMESTAMP WITH TIME ZONE", () => {
    expect(dialect.mapDataType("DATETIME")).toBe("TIMESTAMP WITH TIME ZONE");
  });

  // U-19
  test("U-19: param(N) returns $N", () => {
    expect(dialect.param(1)).toBe("$1");
    expect(dialect.param(5)).toBe("$5");
    expect(dialect.param(99)).toBe("$99");
  });

  // Additional dialect checks
  test("U-13b: identifier handles underscores and numbers", () => {
    expect(dialect.identifier("col_123")).toBe('"col_123"');
  });

  test("U-15b: tableRef with custom schema", () => {
    expect(dialect.tableRef("hr_schema", "employees")).toBe('"hr_schema"."employees"');
  });

  test("U-16b: mapDataType(UUID) returns UUID", () => {
    expect(dialect.mapDataType("UUID")).toBe("UUID");
  });

  test("U-16c: mapDataType(BOOLEAN) returns BOOLEAN", () => {
    expect(dialect.mapDataType("BOOLEAN")).toBe("BOOLEAN");
  });

  test("U-16d: mapDataType(DECIMAL) returns NUMERIC", () => {
    expect(dialect.mapDataType("DECIMAL")).toContain("NUMERIC");
  });

  test("U-16e: mapDataType(JSON) returns JSONB", () => {
    expect(dialect.mapDataType("JSON")).toBe("JSONB");
  });
});
