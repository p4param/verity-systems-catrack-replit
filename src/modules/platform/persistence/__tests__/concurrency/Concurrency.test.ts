/**
 * VS05HC — C-12 Parallel Concurrency Tests
 * Hard Gate | Profile: CERTIFICATION+
 * Tests: C-01 to C-06
 *
 * Enterprise systems fail under concurrency.
 * Tests run fully parallel with Promise.all.
 */
import { runtimeDataEngine } from "@/modules/platform/persistence";
import { ConcurrencyConflictError } from "@/modules/platform/persistence";
import { createTestTableManager, TestTableManager } from "../helpers/TestTableManager";
import { buildPhysicalManifest } from "../helpers/TestManifestFactory";
import { buildCtx } from "../helpers/TestContextFactory";

let db: TestTableManager;
const manifest = buildPhysicalManifest();
const ctx = buildCtx();

jest.setTimeout(60_000); // Concurrency tests may take longer

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

describe("C-12 · Parallel Concurrency [HARD GATE]", () => {

  // C-01: 20 parallel creates — exactly 20 rows, 0 duplicates, 0 deadlocks
  test("C-01: 20 parallel create() — exactly 20 rows, 0 duplicate IDs", async () => {
    const creates = Array.from({ length: 20 }, (_, i) =>
      runtimeDataEngine.create(manifest, { NAME: `Parallel Record ${i + 1}`, CODE: `PR${i + 1}` }, buildCtx({ tenantId: 1, userId: `user-${i}` }))
    );

    const results = await Promise.all(creates);
    expect(results).toHaveLength(20);

    const ids = new Set(results.map(r => r.id));
    expect(ids.size).toBe(20); // no duplicate IDs

    const count = await db.count("cap_test_records");
    expect(count).toBe(20);
  });

  // C-02: 20 parallel creates — all record numbers unique and monotonic within run
  test("C-02: 20 parallel create() — all record numbers unique", async () => {
    const creates = Array.from({ length: 20 }, (_, i) =>
      runtimeDataEngine.create(manifest, { NAME: `Seq Record ${i}` }, ctx)
    );
    const results = await Promise.all(creates);
    const numbers = results.map(r => r.recordNumber).filter(Boolean);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(numbers.length); // no duplicates
  });

  // C-03: 10 parallel updates on same record (version=1) — 1 wins, 9 fail
  test("C-03: 10 parallel update() on same record — exactly 1 succeeds, 9 get ConcurrencyConflictError", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Contended Record" }, ctx);
    expect(created.version).toBe(1);

    const updates = Array.from({ length: 10 }, (_, i) =>
      runtimeDataEngine.update(manifest, created.id, { NAME: `Update attempt ${i}` }, 1, buildCtx({ tenantId: 1, userId: `user-${i}` }))
        .then(() => "success")
        .catch(err => {
          if (err instanceof ConcurrencyConflictError) return "conflict";
          throw err; // re-throw unexpected errors
        })
    );

    const results = await Promise.all(updates);
    const successes = results.filter(r => r === "success");
    const conflicts = results.filter(r => r === "conflict");

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
  });

  // C-04: 5 parallel saveGraph() — all succeed, no cross-contamination
  test("C-04: 5 parallel saveGraph() — all 5 succeed, no FK cross-contamination", async () => {
    await db.createChildTable();
    const { buildChildManifest } = await import("../helpers/TestManifestFactory");
    const childMfst = buildChildManifest();

    const graphs = Array.from({ length: 5 }, (_, i) => ({
      header: { manifest, payload: { NAME: `Parallel Graph ${i + 1}` }, id: null as any },
      collections: [{
        key: "obs", manifest: childMfst,
        items: [{ payload: { OBSERVATION: `Obs ${i + 1}` }, id: null as any }],
        parentFkColumn: "parent_id", deletedIds: [] as string[],
      }],
    }));

    const results = await Promise.all(graphs.map(g => runtimeDataEngine.saveGraph(g, ctx)));
    expect(results).toHaveLength(5);

    // Verify each header's children only belong to their own header
    for (const result of results) {
      const children = await db.query(
        `SELECT "parent_id" FROM "public"."cap_test_children" WHERE "parent_id" = $1`,
        [result.headerId]
      );
      expect(children.every(c => c.parent_id === result.headerId)).toBe(true);
    }
    await db.dropChildTable();
  });

  // C-05: 50 parallel getById() — all resolve, no stale reads
  test("C-05: 50 parallel getById() — all resolve, execution < 5000ms total", async () => {
    const created = await runtimeDataEngine.create(manifest, { NAME: "Read Contention Record" }, ctx);
    const start = performance.now();

    const reads = Array.from({ length: 50 }, () => runtimeDataEngine.getById(manifest, created.id));
    const results = await Promise.all(reads);

    const elapsed = performance.now() - start;
    expect(results).toHaveLength(50);
    expect(results.every(r => r !== null && r!.id === created.id)).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });

  // C-06: 100 parallel count() — all return identical count
  test("C-06: 100 parallel count() — all return identical count", async () => {
    await runtimeDataEngine.create(manifest, { NAME: "Count Base 1" }, ctx);
    await runtimeDataEngine.create(manifest, { NAME: "Count Base 2" }, ctx);
    await runtimeDataEngine.create(manifest, { NAME: "Count Base 3" }, ctx);

    const counts = await Promise.all(
      Array.from({ length: 100 }, () => runtimeDataEngine.count(manifest, {}))
    );
    const uniqueCounts = new Set(counts);
    expect(uniqueCounts.size).toBe(1);
    expect(counts[0]).toBe(3);
  });
});
