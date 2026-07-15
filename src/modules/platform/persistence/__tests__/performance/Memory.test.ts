/**
 * VS05HC — C-14 Memory Certification
 * Informational Gate (hard fail at 3× threshold) | Profile: NIGHTLY
 * Tests: M-01 to M-04
 *
 * Requires: node --expose-gc
 * Verifies heap stability over 1000 operations per cycle.
 * Hard fail if Δ heapUsed exceeds 3× the informational target.
 */
import { runtimeDataEngine } from "@/modules/platform/persistence";
import { createTestTableManager, TestTableManager } from "../helpers/TestTableManager";
import { buildPhysicalManifest } from "../helpers/TestManifestFactory";
import { buildCtx } from "../helpers/TestContextFactory";

const manifest = buildPhysicalManifest();
const ctx = buildCtx();
let db: TestTableManager;

// Skip memory tests if --expose-gc is not available
const gcAvailable = typeof (global as any).gc === "function";
const conditionalTest = gcAvailable ? test : test.skip;

jest.setTimeout(600_000); // 10 minutes

function forceGC() {
  if (gcAvailable) (global as any).gc();
}

function heapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

beforeAll(async () => {
  db = createTestTableManager();
  await db.connect();
  await db.createScratchTable();
  await runtimeDataEngine.initialize();
  // Warm up
  for (let i = 0; i < 5; i++) {
    await runtimeDataEngine.create(manifest, { NAME: `Warmup ${i}` }, ctx);
  }
  await db.truncateScratchTable();
});

afterAll(async () => {
  await db.dropScratchTable();
  await db.disconnect();
  await runtimeDataEngine.shutdown();
});

beforeEach(async () => {
  await db.truncateScratchTable();
});

describe("C-14 · Memory Certification [INFORMATIONAL — Nightly]", () => {

  const INFORMATIONAL_THRESHOLD_MB = 10;
  const HARD_FAIL_THRESHOLD_MB = 30; // 3×

  // M-01: 1000 create() → GC → heap stable
  conditionalTest("M-01: 1000 create() → GC → Δ heapUsed < 30MB (hard fail)", async () => {
    forceGC();
    const before = heapMB();

    for (let i = 0; i < 1000; i++) {
      await runtimeDataEngine.create(manifest, { NAME: `Mem Test Create ${i}` }, ctx);
    }

    forceGC();
    const after = heapMB();
    const delta = after - before;

    console.log(`[M-01] Create Δ heap: ${delta.toFixed(1)}MB (target: <${INFORMATIONAL_THRESHOLD_MB}MB, hard fail: >${HARD_FAIL_THRESHOLD_MB}MB)`);
    expect(delta).toBeLessThan(HARD_FAIL_THRESHOLD_MB);
  });

  // M-02: 1000 update() → GC → heap stable
  conditionalTest("M-02: 1000 update() → GC → Δ heapUsed < 30MB (hard fail)", async () => {
    // Pre-create 1 record to update repeatedly
    const created = await runtimeDataEngine.create(manifest, { NAME: "Memory Update Base" }, ctx);

    forceGC();
    const before = heapMB();

    let version = 1;
    for (let i = 0; i < 1000; i++) {
      const updated = await runtimeDataEngine.update(manifest, created.id, { NAME: `Mem Update ${i}` }, version, ctx);
      version = updated.version;
    }

    forceGC();
    const after = heapMB();
    const delta = after - before;

    console.log(`[M-02] Update Δ heap: ${delta.toFixed(1)}MB`);
    expect(delta).toBeLessThan(HARD_FAIL_THRESHOLD_MB);
  });

  // M-03: 1000 query() (small result set) → GC → heap stable
  conditionalTest("M-03: 1000 query() → GC → Δ heapUsed < 60MB (hard fail)", async () => {
    // Pre-populate 10 records
    for (let i = 0; i < 10; i++) {
      await runtimeDataEngine.create(manifest, { NAME: `Query Mem ${i}` }, ctx);
    }

    forceGC();
    const before = heapMB();

    for (let i = 0; i < 1000; i++) {
      await runtimeDataEngine.query(manifest, { take: 10 });
    }

    forceGC();
    const after = heapMB();
    const delta = after - before;

    console.log(`[M-03] Query Δ heap: ${delta.toFixed(1)}MB (hard fail: >${60}MB)`);
    expect(delta).toBeLessThan(60); // 3× the 20MB informational target
  });

  // M-04: 1000 delete() → GC → heap stable
  conditionalTest("M-04: 1000 delete() → GC → Δ heapUsed < 30MB (hard fail)", async () => {
    // Pre-create 1000 records
    const ids: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const r = await runtimeDataEngine.create(manifest, { NAME: `Mem Delete ${i}` }, ctx);
      ids.push(r.id);
    }

    forceGC();
    const before = heapMB();

    for (const id of ids) {
      await runtimeDataEngine.delete(manifest, id, ctx);
    }

    forceGC();
    const after = heapMB();
    const delta = after - before;

    console.log(`[M-04] Delete Δ heap: ${delta.toFixed(1)}MB`);
    expect(delta).toBeLessThan(HARD_FAIL_THRESHOLD_MB);
  });

  // Non-GC fallback: at minimum verify no error thrown over 100 ops
  test("M-01-fallback: 100 creates complete without error (no --expose-gc)", async () => {
    if (gcAvailable) return; // already covered by M-01
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        runtimeDataEngine.create(manifest, { NAME: `Fallback ${i}` }, ctx)
      )
    );
    expect(results).toHaveLength(100);
    expect(results.every(r => !!r.id)).toBe(true);
  });
});
