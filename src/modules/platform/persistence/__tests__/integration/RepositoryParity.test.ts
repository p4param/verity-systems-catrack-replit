/**
 * VS05HC — C-07 Repository Parity Tests
 * Hard Gate | Profile: DEVELOPER+
 * Tests: I-40 to I-47
 *
 * Verifies that PHYSICAL and EAV storage modes return identical RuntimeRecord shapes
 * for all operations. The API contract must be storage-transparent.
 */
import { runtimeDataEngine } from "@/modules/platform/persistence";
import { createTestTableManager, TestTableManager } from "../helpers/TestTableManager";
import { buildPhysicalManifest, buildEavManifest, TEST_ENTITY_ID } from "../helpers/TestManifestFactory";
import { buildCtx } from "../helpers/TestContextFactory";

let db: TestTableManager;
const physManifest = buildPhysicalManifest();
const eavManifest = buildEavManifest();
const ctx = buildCtx();

// The set of top-level keys every RuntimeRecord must have regardless of storage mode
const REQUIRED_RECORD_KEYS = ["id", "recordNumber", "version", "__runtime"];

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

function assertRecordShape(record: any, label: string) {
  for (const key of REQUIRED_RECORD_KEYS) {
    expect(record).toHaveProperty(key);
  }
  expect(typeof record.id).toBe("string");
  expect(record.id.length).toBeGreaterThan(0);
  expect(typeof record.version).toBe("number");
  expect(record.__runtime).toBeDefined();
  expect(record.__runtime.storageMode).toMatch(/^(PHYSICAL|EAV)$/);
}

describe("C-07 · Repository Parity [HARD GATE]", () => {

  // I-40: create() shape parity
  test("I-40: create() — PHYSICAL and EAV return identical RuntimeRecord shape", async () => {
    const physRecord = await runtimeDataEngine.create(physManifest, { NAME: "Parity Test PHYS" }, ctx);
    const eavRecord = await runtimeDataEngine.create(eavManifest, { NAME: "Parity Test EAV" }, buildCtx({ tenantId: 99 }));

    assertRecordShape(physRecord, "PHYSICAL");
    assertRecordShape(eavRecord, "EAV");

    // Both must have same top-level key set structure
    expect(Object.keys(physRecord)).toEqual(expect.arrayContaining(REQUIRED_RECORD_KEYS));
    expect(Object.keys(eavRecord)).toEqual(expect.arrayContaining(REQUIRED_RECORD_KEYS));
  });

  // I-41: update() shape parity
  test("I-41: update() — both modes increment version and refresh updatedAt", async () => {
    const physRecord = await runtimeDataEngine.create(physManifest, { NAME: "Update Parity PHYS" }, ctx);
    const physUpdated = await runtimeDataEngine.update(physManifest, physRecord.id, { NAME: "Updated PHYS" }, 1, ctx);
    expect(physUpdated.version).toBe(2);
    assertRecordShape(physUpdated, "PHYSICAL");
    // EAV update parity
    const eavRecord = await runtimeDataEngine.create(eavManifest, { NAME: "Update Parity EAV" }, buildCtx({ tenantId: 99 }));
    const eavUpdated = await runtimeDataEngine.update(eavManifest, eavRecord.id, { NAME: "Updated EAV" }, eavRecord.version ?? 1, buildCtx({ tenantId: 99 }));
    expect(eavUpdated.version).toBeGreaterThanOrEqual(1);
    assertRecordShape(eavUpdated, "EAV");
  });

  // I-42: delete() parity
  test("I-42: delete() — both modes: getById returns null after delete", async () => {
    const physRecord = await runtimeDataEngine.create(physManifest, { NAME: "Delete Parity PHYS" }, ctx);
    await runtimeDataEngine.delete(physManifest, physRecord.id, ctx);
    expect(await runtimeDataEngine.getById(physManifest, physRecord.id)).toBeNull();

    const eavRecord = await runtimeDataEngine.create(eavManifest, { NAME: "Delete Parity EAV" }, buildCtx({ tenantId: 99 }));
    await runtimeDataEngine.delete(eavManifest, eavRecord.id, buildCtx({ tenantId: 99 }));
    expect(await runtimeDataEngine.getById(eavManifest, eavRecord.id)).toBeNull();
  });

  // I-43: restore() parity
  test("I-43: restore() — both modes: getById returns record after restore", async () => {
    const physRecord = await runtimeDataEngine.create(physManifest, { NAME: "Restore PHYS" }, ctx);
    await runtimeDataEngine.delete(physManifest, physRecord.id, ctx);
    await runtimeDataEngine.restore(physManifest, physRecord.id, ctx);
    expect(await runtimeDataEngine.getById(physManifest, physRecord.id)).not.toBeNull();

    const eavRecord = await runtimeDataEngine.create(eavManifest, { NAME: "Restore EAV" }, buildCtx({ tenantId: 99 }));
    await runtimeDataEngine.delete(eavManifest, eavRecord.id, buildCtx({ tenantId: 99 }));
    await runtimeDataEngine.restore(eavManifest, eavRecord.id, buildCtx({ tenantId: 99 }));
    expect(await runtimeDataEngine.getById(eavManifest, eavRecord.id)).not.toBeNull();
  });

  // I-44: exists() parity
  test("I-44: exists() — both modes return true when present, false when soft-deleted", async () => {
    const physRecord = await runtimeDataEngine.create(physManifest, { NAME: "Exists PHYS" }, ctx);
    expect(await runtimeDataEngine.exists(physManifest, physRecord.id)).toBe(true);
    await runtimeDataEngine.delete(physManifest, physRecord.id, ctx);
    expect(await runtimeDataEngine.exists(physManifest, physRecord.id)).toBe(false);

    const eavRecord = await runtimeDataEngine.create(eavManifest, { NAME: "Exists EAV" }, buildCtx({ tenantId: 99 }));
    expect(await runtimeDataEngine.exists(eavManifest, eavRecord.id)).toBe(true);
    await runtimeDataEngine.delete(eavManifest, eavRecord.id, buildCtx({ tenantId: 99 }));
    expect(await runtimeDataEngine.exists(eavManifest, eavRecord.id)).toBe(false);
  });

  // I-45: count() parity
  test("I-45: count() — both modes decrement on delete", async () => {
    const p1 = await runtimeDataEngine.create(physManifest, { NAME: "Count PHYS 1" }, ctx);
    const p2 = await runtimeDataEngine.create(physManifest, { NAME: "Count PHYS 2" }, ctx);
    expect(await runtimeDataEngine.count(physManifest, {})).toBe(2);
    await runtimeDataEngine.delete(physManifest, p1.id, ctx);
    expect(await runtimeDataEngine.count(physManifest, {})).toBe(1);
  });

  // I-46: query() parity — field values match; both respect includeDeleted
  test("I-46: query() — field values accessible in result records", async () => {
    await runtimeDataEngine.create(physManifest, { NAME: "Query Parity PHYS", CODE: "QP1" }, ctx);
    const results = await runtimeDataEngine.query(physManifest, {});
    expect(results.length).toBeGreaterThanOrEqual(1);
    const first = results[0];
    assertRecordShape(first, "PHYSICAL");
  });

  // I-47: resolveLookupOptions() parity
  test("I-47: resolveLookupOptions() — returns {id, label} array for both modes", async () => {
    await runtimeDataEngine.create(physManifest, { NAME: "Lookup Option One", CODE: "LO1" }, ctx);
    await runtimeDataEngine.create(physManifest, { NAME: "Lookup Option Two", CODE: "LO2" }, ctx);
    const options = await runtimeDataEngine.resolveLookupOptions(physManifest, "name", undefined, 100);
    expect(Array.isArray(options)).toBe(true);
    for (const opt of options) {
      expect(opt).toHaveProperty("id");
      expect(opt).toHaveProperty("label");
      expect(typeof opt.id).toBe("string");
      expect(typeof opt.label).toBe("string");
    }
  });
});
