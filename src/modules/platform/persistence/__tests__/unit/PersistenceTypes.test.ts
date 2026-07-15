/**
 * VS05HC — C-03 Persistence Types & Utilities Unit Tests
 * Hard Gate | Profile: SMOKE+
 * Tests: U-20 to U-30
 */
import {
  ConcurrencyConflictError,
  RecordNotFoundError,
  BulkOperationError,
} from "@/modules/platform/persistence/types/PersistenceExecutionContext";
import { AtomicRuntimeStatistics } from "@/modules/platform/persistence/statistics/AtomicRuntimeStatistics";
import { NoOpRuntimeCache } from "@/modules/platform/persistence/cache/NoOpRuntimeCache";
import { PlatformNumberSeriesEngine } from "@/modules/platform/persistence/number-series/PlatformNumberSeriesEngine";
import { SqlBuilder } from "@/modules/platform/persistence/sql/SqlBuilder";
import { PostgresRuntimeDialect } from "@/modules/platform/persistence/sql/PostgresRuntimeDialect";
import { STANDARD_POLICY, SYSTEM_COLUMNS, BUSINESS_COLUMNS } from "../helpers/TestManifestFactory";
import type { PersistenceTable } from "@/modules/platform/persistence/types/PersistenceModel";

const dialect = new PostgresRuntimeDialect();
const TEST_TABLE: PersistenceTable = {
  name: "cap_test_records", schema: "public", isPrimary: true,
  columns: [...SYSTEM_COLUMNS, ...BUSINESS_COLUMNS], indexes: [],
};

describe("C-03 · Persistence Types & Utilities [HARD GATE]", () => {

  // U-20
  test("U-20: ConcurrencyConflictError carries all fields", () => {
    const err = new ConcurrencyConflictError("entity-1", "record-1", 5);
    expect(err.name).toBe("ConcurrencyConflictError");
    expect(err.entityId).toBe("entity-1");
    expect(err.recordId).toBe("record-1");
    expect(err.expectedVersion).toBe(5);
    expect(err.message).toContain("record-1");
    expect(err.message).toContain("5");
    expect(err instanceof Error).toBe(true);
  });

  // U-21
  test("U-21: RecordNotFoundError carries recordId", () => {
    const err = new RecordNotFoundError("record-xyz");
    expect(err.name).toBe("RecordNotFoundError");
    expect(err.recordId).toBe("record-xyz");
    expect(err.message).toContain("record-xyz");
    expect(err instanceof Error).toBe(true);
  });

  test("U-21b: BulkOperationError carries failures array", () => {
    const failures = [{ index: 0, id: "id-0", reason: "Missing required field" }];
    const err = new BulkOperationError(failures);
    expect(err.name).toBe("BulkOperationError");
    expect(err.failures).toHaveLength(1);
    expect(err.failures[0].reason).toBe("Missing required field");
  });

  // U-22
  test("U-22: AtomicRuntimeStatistics snapshot after 3 queries", () => {
    const stats = new AtomicRuntimeStatistics();
    stats.recordQuery(10);
    stats.recordQuery(20);
    stats.recordQuery(30);
    const snap = stats.snapshot();
    expect(snap.queryCount).toBe(3);
    expect(snap.avgQueryMs).toBeCloseTo(20, 0);
    // Note: totalQueryMs is a private field — not exposed in snapshot; avgQueryMs covers it
  });

  // U-23
  test("U-23: NoOpRuntimeCache.get() always returns null; misses tracked", async () => {
    const cache = new NoOpRuntimeCache();
    const result = await cache.get("any-key");
    expect(result).toBeNull();
    // set should not throw
    await cache.set("any-key", { data: 1 }, 60);
    const result2 = await cache.get("any-key");
    expect(result2).toBeNull(); // still null — it's a no-op
    // stats() reports misses
    const s = await cache.stats();
    expect(s.misses).toBeGreaterThanOrEqual(2);
    expect(s.hits).toBe(0);
  });

  // U-24
  test("U-24: PlatformNumberSeriesEngine.derivePrefix() produces correct abbreviations", () => {
    const engine = new PlatformNumberSeriesEngine(null as any);
    // @ts-ignore — testing private method via type override
    expect(engine["derivePrefix"]("DEPARTMENT")).toBe("DEP");
    expect(engine["derivePrefix"]("PURCHASE_ORDER")).toBe("PO");
    expect(engine["derivePrefix"]("INCIDENT")).toBe("INC");
    expect(engine["derivePrefix"]("VEHICLE")).toBe("VEH");
    expect(engine["derivePrefix"]("STATUS")).toBe("STA");
  });

  // U-25
  test("U-25: recordQuery(250ms) does not flag slow query", () => {
    const stats = new AtomicRuntimeStatistics();
    stats.recordQuery(250);
    const snap = stats.snapshot();
    expect(snap.slowQueryCount).toBe(0);
  });

  // U-26
  test("U-26: recordQuery(600ms) flags slow query (threshold 500ms)", () => {
    const stats = new AtomicRuntimeStatistics();
    stats.recordQuery(600);
    const snap = stats.snapshot();
    expect(snap.slowQueryCount).toBe(1);
  });

  // U-27
  test("U-27: snapshot() after mixed operations matches expected values", () => {
    const stats = new AtomicRuntimeStatistics();
    stats.recordInsert(1);
    stats.recordInsert(1);
    stats.recordUpdate(1);
    stats.recordDelete(1);
    stats.recordQuery(100);
    stats.recordQuery(600); // slow
    const snap = stats.snapshot();
    expect(snap.rowsInserted).toBe(2);
    expect(snap.rowsUpdated).toBe(1);
    expect(snap.rowsDeleted).toBe(1);
    expect(snap.queryCount).toBe(2);
    expect(snap.slowQueryCount).toBe(1);
  });

  // U-28
  test("U-28: reset() zeroes all counters", () => {
    const stats = new AtomicRuntimeStatistics();
    stats.recordInsert(5);
    stats.recordQuery(100);
    stats.reset();
    const snap = stats.snapshot();
    expect(snap.rowsInserted).toBe(0);
    expect(snap.queryCount).toBe(0);
    expect(snap.slowQueryCount).toBe(0);
    expect(snap.avgQueryMs).toBe(0);
  });

  // U-29
  test("U-29: buildSelect with BETWEEN operator", () => {
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { where: [{ field: "row_version", operator: "between", values: [1, 5] }] },
      STANDARD_POLICY,
      dialect
    );
    expect(cmd.sql.toLowerCase()).toContain("between");
    expect(cmd.params).toContain(1);
    expect(cmd.params).toContain(5);
  });

  // U-30
  test("U-30: buildSelect with ORDER BY ASC NULLS LAST", () => {
    const cmd = SqlBuilder.buildSelect(
      TEST_TABLE,
      { orderBy: [{ field: "name", direction: "asc", nulls: "last" }] },
      STANDARD_POLICY,
      dialect
    );
    expect(cmd.sql.toLowerCase()).toContain("order by");
    expect(cmd.sql).toContain('"name"');
    expect(cmd.sql.toUpperCase()).toContain("ASC");
    expect(cmd.sql.toUpperCase()).toContain("NULLS LAST");
  });
});
