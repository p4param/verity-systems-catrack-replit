/**
 * VS05HC — C-05 Physical Table CRUD Integration Tests
 * Hard Gate | Profile: DEVELOPER+
 * Tests: I-01 to I-08
 *
 * Uses scratch table cap_test_records created in beforeAll.
 * Requires DATABASE_URL in .env.
 */
import { runtimeDataEngine } from "@/modules/platform/persistence";
import { ConcurrencyConflictError } from "@/modules/platform/persistence";
import { createTestTableManager, TestTableManager } from "../helpers/TestTableManager";
import { buildPhysicalManifest } from "../helpers/TestManifestFactory";
import { buildCtx } from "../helpers/TestContextFactory";

let db: TestTableManager;
const manifest = buildPhysicalManifest();
const ctx = buildCtx();

beforeAll(async () => {
  db = createTestTableManager();
  await db.connect();
  await db.createScratchTable();
  await runtimeDataEngine.initialize();
});

afterAll(async () => {
  await db.dropScratchTable();
  await db.disconnect();
  await runtimeDataEngine.shutdown();
});

beforeEach(async () => {
  await db.truncateScratchTable();
});

describe("C-05 · Physical Table CRUD [HARD GATE]", () => {

  // I-01
  test("I-01: create() persists row and returns RuntimeRecord with UUID", async () => {
    const record = await runtimeDataEngine.create(manifest, { NAME: "Alpha Dept", CODE: "ALPHA" }, ctx);
    expect(record.id).toBeTruthy();
    expect(record.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(record.recordNumber).toBeTruthy();
    expect(record.__runtime.storageMode).toBe("PHYSICAL");

    // Verify directly in DB
    const row = await db.rawRow("cap_test_records", record.id);
    expect(row).not.toBeNull();
    expect(row.name).toBe("Alpha Dept");
    expect(row.code).toBe("ALPHA");
  });

  // I-02
  test("I-02: getById() returns record with correct field values", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Beta Dept", CODE: "BETA", DESCRIPTION: "Test description" }, ctx);
    const found = await runtimeDataEngine.getById(manifest, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!["name"] ?? found!["NAME"]).toBeTruthy();
  });

  // I-03
  test("I-03: update() with correct version increments row_version to 2", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Gamma Dept" }, ctx);
    expect(created.version).toBe(1);

    const updated = await runtimeDataEngine.update(manifest, created.id, { NAME: "Gamma Dept Updated" }, 1, ctx);
    expect(updated.version).toBe(2);

    // Verify DB
    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.row_version).toBe(2);
    expect(row.updated_by).toBe(ctx.userId);
  });

  // I-04
  test("I-04: update() with wrong expectedVersion throws ConcurrencyConflictError", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Delta Dept" }, ctx);
    await expect(
      runtimeDataEngine.update(manifest, created.id, { NAME: "Delta Updated" }, 99, ctx) // wrong version
    ).rejects.toThrow(ConcurrencyConflictError);
  });

  // I-05
  test("I-05: delete() soft-deletes — is_deleted=true, getById returns null", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Epsilon Dept" }, ctx);
    await runtimeDataEngine.delete(manifest, created.id, ctx);

    const found = await runtimeDataEngine.getById(manifest, created.id);
    expect(found).toBeNull();

    // Verify DB: is_deleted = true
    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.is_deleted).toBe(true);
    expect(row.deleted_at).not.toBeNull();
    expect(row.deleted_by).toBe(ctx.userId);
  });

  // I-06
  test("I-06: restore() sets is_deleted=false and getById returns record", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Zeta Dept" }, ctx);
    await runtimeDataEngine.delete(manifest, created.id, ctx);
    await runtimeDataEngine.restore(manifest, created.id, ctx);

    const found = await runtimeDataEngine.getById(manifest, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);

    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.is_deleted).toBe(false);
    expect(row.deleted_at).toBeNull();
  });

  // I-07
  test("I-07: exists() lifecycle — true → false after delete → true after restore", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Eta Dept" }, ctx);

    expect(await runtimeDataEngine.exists(manifest, created.id)).toBe(true);

    await runtimeDataEngine.delete(manifest, created.id, ctx);
    expect(await runtimeDataEngine.exists(manifest, created.id)).toBe(false);

    await runtimeDataEngine.restore(manifest, created.id, ctx);
    expect(await runtimeDataEngine.exists(manifest, created.id)).toBe(true);
  });

  // I-08
  test("I-08: count() respects soft-delete — decrements on delete, increments on restore", async () => {
    const r1 = await runtimeDataEngine.create(manifest, { NAME: "Theta 1" }, ctx);
    const r2 = await runtimeDataEngine.create(manifest, { NAME: "Theta 2" }, ctx);
    const r3 = await runtimeDataEngine.create(manifest, { NAME: "Theta 3" }, ctx);

    const countBefore = await runtimeDataEngine.count(manifest, {});
    expect(countBefore).toBe(3);

    await runtimeDataEngine.delete(manifest, r1.id, ctx);
    expect(await runtimeDataEngine.count(manifest, {})).toBe(2);

    await runtimeDataEngine.restore(manifest, r1.id, ctx);
    expect(await runtimeDataEngine.count(manifest, {})).toBe(3);
  });
});
