/**
 * VS05HC — C-08 Audit Column Integrity Tests
 * Hard Gate | Profile: DEVELOPER+
 * Tests: I-48 to I-53
 *
 * Verifies created_by, created_at, updated_by, updated_at, deleted_by, deleted_at,
 * tenant_id, row_version are correctly stamped for all persistence operations.
 */
import { runtimeDataEngine } from "@/modules/platform/persistence";
import { createTestTableManager, TestTableManager } from "../helpers/TestTableManager";
import { buildPhysicalManifest } from "../helpers/TestManifestFactory";
import { buildCtx, buildCtxWithUser } from "../helpers/TestContextFactory";

let db: TestTableManager;
const manifest = buildPhysicalManifest();
const ctxA = buildCtxWithUser("actor-user-A");
const ctxB = buildCtxWithUser("actor-user-B");

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

describe("C-08 · Audit Column Integrity [HARD GATE]", () => {

  // I-48: create() stamps created_by, created_at, tenant_id, row_version=1
  test("I-48: create() — created_by, created_at, tenant_id, row_version=1 all set", async () => {
    const before = new Date();
    const record = await runtimeDataEngine.create(manifest, { NAME: "Audit Create Test" }, ctxA);
    const after = new Date();

    const row = await db.rawRow("cap_test_records", record.id);
    expect(row).not.toBeNull();
    expect(row.created_by).toBe("actor-user-A");
    expect(row.tenant_id).toBe(ctxA.tenantId);
    expect(row.row_version).toBe(1);
    expect(row.is_deleted).toBe(false);

    const createdAt = new Date(row.created_at);
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  // I-49: update() increments row_version, stamps updated_by, updated_at > created_at
  test("I-49: update() — updated_by, updated_at refreshed, row_version incremented", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Audit Update" }, ctxA);

    // Small delay to ensure timestamps differ
    await new Promise(r => setTimeout(r, 50));

    await runtimeDataEngine.update(manifest, created.id, { NAME: "Audit Updated" }, 1, ctxB);
    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.row_version).toBe(2);
    expect(row.updated_by).toBe("actor-user-B");
    expect(row.created_by).toBe("actor-user-A"); // unchanged
    expect(new Date(row.updated_at).getTime()).toBeGreaterThan(new Date(row.created_at).getTime());
  });

  // I-50: delete() stamps deleted_by, deleted_at, is_deleted=true
  test("I-50: delete() — deleted_by, deleted_at set, is_deleted=true", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Audit Delete" }, ctxA);
    const before = new Date();
    await runtimeDataEngine.delete(manifest, created.id, ctxB);
    const after = new Date();

    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.is_deleted).toBe(true);
    expect(row.deleted_by).toBe("actor-user-B");
    const deletedAt = new Date(row.deleted_at);
    expect(deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(deletedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  // I-51: restore() clears deleted_by, deleted_at, is_deleted=false
  test("I-51: restore() — deleted_by NULL, deleted_at NULL, is_deleted=false", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Audit Restore" }, ctxA);
    await runtimeDataEngine.delete(manifest, created.id, ctxA);
    await runtimeDataEngine.restore(manifest, created.id, ctxB);

    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.is_deleted).toBe(false);
    expect(row.deleted_at).toBeNull();
    expect(row.deleted_by).toBeNull();
  });

  // I-52: Different userId per operation — created_by ≠ updated_by
  test("I-52: Different actors — created_by and updated_by are different", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Actor A Creates" }, ctxA);
    await runtimeDataEngine.update(manifest, created.id, { NAME: "Actor B Updates" }, 1, ctxB);

    const row = await db.rawRow("cap_test_records", created.id);
    expect(row.created_by).toBe("actor-user-A");
    expect(row.updated_by).toBe("actor-user-B");
    expect(row.created_by).not.toBe(row.updated_by);
  });

  // I-53: tenant_id propagates — all rows for a ctx carry the same tenant_id
  test("I-53: tenant_id propagation — all rows for a context carry ctx.tenantId", async () => {
    const ctxTenant5 = buildCtx({ tenantId: 5, userId: "user-t5" });
    const r1 = await runtimeDataEngine.create(manifest, { NAME: "T5 Record 1" }, ctxTenant5);
    const r2 = await runtimeDataEngine.create(manifest, { NAME: "T5 Record 2" }, ctxTenant5);

    const row1 = await db.rawRow("cap_test_records", r1.id);
    const row2 = await db.rawRow("cap_test_records", r2.id);
    expect(row1.tenant_id).toBe(5);
    expect(row2.tenant_id).toBe(5);
  });
});
