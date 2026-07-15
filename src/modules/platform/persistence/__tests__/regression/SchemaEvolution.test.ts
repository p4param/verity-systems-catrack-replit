/**
 * VS05HC — C-16 Schema Evolution Without Data Loss
 * Hard Gate | Profile: CERTIFICATION+
 * Tests: R-05 to R-07
 *
 * THE most important regression for CM-002 + CM-003.
 * Proves that publishing a modified entity never destroys existing data.
 *
 * Flow:
 *   1. Create table with 3 fields: evo_code, evo_name, evo_desc
 *   2. INSERT 100 rows
 *   3. ADD 3 new columns: manager_id, cost_center, is_active (ALTER TABLE)
 *   4. Verify: 100 rows still exist, new columns present, old values intact
 *   5. New row with all 6 fields works correctly
 */
import { createTestTableManager, TestTableManager, SCHEMA_EVOLUTION_TABLE } from "../helpers/TestTableManager";

let db: TestTableManager;

beforeAll(async () => {
  db = createTestTableManager();
  await db.connect();
  await db.createSchemaEvolutionTable();
});

afterAll(async () => {
  await db.dropSchemaEvolutionTable();
  await db.disconnect();
});

describe("C-16 · Schema Evolution Without Data Loss [HARD GATE]", () => {

  // R-05: 100 rows survive schema evolution
  test("R-05: 100 rows survive schema evolution (re-publish)", async () => {
    // Step 1: Insert 100 rows with v1 schema
    await db.insertEvoRows(100);
    const countBefore = await db.count(SCHEMA_EVOLUTION_TABLE, "1=1");
    expect(countBefore).toBe(100);

    // Step 2: Simulate schema evolution — add 3 new columns
    await db.addSchemaEvolutionColumns();

    // Step 3: Verify all 100 rows still exist
    const countAfter = await db.count(SCHEMA_EVOLUTION_TABLE, "1=1");
    expect(countAfter).toBe(100);
  });

  // R-06: New columns added non-destructively — existing rows have NULL values for new cols
  test("R-06: New columns added — existing rows have NULL for new columns", async () => {
    const rows = await db.query<any>(
      `SELECT "evo_code", "evo_name", "evo_desc", "manager_id", "cost_center", "is_active"
       FROM "public"."${SCHEMA_EVOLUTION_TABLE}" LIMIT 5`
    );

    expect(rows.length).toBeGreaterThanOrEqual(5);

    for (const row of rows) {
      // Original columns should have values
      expect(row.evo_code).toBeTruthy();
      expect(row.evo_name).toBeTruthy();
      // New columns should be NULL (non-destructive addition)
      expect(row.manager_id).toBeNull();
      expect(row.cost_center).toBeNull();
      // is_active has DEFAULT true, so may be true rather than NULL
      expect(row.is_active !== undefined).toBe(true);
    }
  });

  // R-07: New writes can use all 6 fields
  test("R-07: New row with all 6 fields (original + evolved) reads correctly", async () => {
    const testManagerId = "00000000-dead-beef-0000-000000000001";

    await db.query(
      `INSERT INTO "public"."${SCHEMA_EVOLUTION_TABLE}"
         ("tenant_id", "record_number", "evo_code", "evo_name", "evo_desc",
          "manager_id", "cost_center", "is_active")
       VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8)`,
      [1, "EVO-000101", "EVO-NEW", "New Post-Evolution Row", "Written after evolution",
       testManagerId, "CC-100", true]
    );

    const rows = await db.query<any>(
      `SELECT * FROM "public"."${SCHEMA_EVOLUTION_TABLE}" WHERE "evo_code" = $1`, ["EVO-NEW"]
    );
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.evo_name).toBe("New Post-Evolution Row");
    expect(row.evo_desc).toBe("Written after evolution");
    expect(row.manager_id).toBe(testManagerId);
    expect(row.cost_center).toBe("CC-100");
    expect(row.is_active).toBe(true);
  });

  // R-07b: All 100 original rows have intact values
  test("R-07b: All 100 original rows have intact original field values", async () => {
    const rows = await db.query<any>(
      `SELECT "record_number", "evo_code", "evo_name", "evo_desc"
       FROM "public"."${SCHEMA_EVOLUTION_TABLE}"
       WHERE "evo_code" LIKE 'CODE%'
       ORDER BY "record_number" LIMIT 100`
    );

    expect(rows.length).toBe(100);
    for (let i = 0; i < rows.length; i++) {
      const idx = i + 1;
      expect(rows[i].evo_code).toBe(`CODE${idx}`);
      expect(rows[i].evo_name).toBe(`Name ${idx}`);
      expect(rows[i].evo_desc).toBe(`Desc ${idx}`);
    }
  });
});
