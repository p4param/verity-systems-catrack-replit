// VS08A: PlatformApplicationRepository — Real PostgreSQL Integration Tests
// Tests run against the actual verity_catrack-ai database.
// Profile: developer, certification, nightly (NOT smoke).
//
// All test records use a run-specific prefix to ensure isolation.
// A single afterAll cleanup removes every record created by this run.
//
// Prerequisites:
//   - DATABASE_URL env var must point to a running PostgreSQL instance.
//   - The platform_applications table must exist (migration applied).

import { PlatformApplicationRepository } from "../../repositories/PlatformApplicationRepository";
import { PlatformApplication } from "../../domain/PlatformApplication";
import { prisma } from "@/lib/prisma";
import { PLATFORM_APPLICATION_STATUS } from "../../models/PlatformApplicationModels";
import type {
  PlatformApplicationRecord,
  RegisterPlatformApplicationCommand,
} from "../../models/PlatformApplicationModels";
import {
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  PlatformApplicationConcurrencyError,
} from "../../domain/PlatformApplicationErrors";

// ─── Run-Scoped Isolation ────────────────────────────────────────────────────

const RUN_ID = Date.now().toString().slice(-7); // 7-digit ms suffix
const PREFIX = `TEST-${RUN_ID}`;

function uniqueCode(label: string): string {
  return `${PREFIX}-${label}`.toUpperCase().replace(/[^A-Z0-9_-]/g, "-");
}

function uniqueName(label: string): string {
  return `Integration App ${RUN_ID} ${label}`;
}

const ACTOR_ID = "00000000-0000-0000-0000-000000000099";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCommand(
  label: string,
  overrides: Partial<RegisterPlatformApplicationCommand> = {}
): RegisterPlatformApplicationCommand {
  return {
    code: uniqueCode(label),
    name: uniqueName(label),
    displayName: uniqueName(label),
    category: "Integration",
    actorUserId: ACTOR_ID,
    ...overrides,
  };
}

async function createAndPersist(label: string, overrides?: Partial<RegisterPlatformApplicationCommand>): Promise<PlatformApplicationRecord> {
  const repo = new PlatformApplicationRepository();
  const app = PlatformApplication.create(makeCommand(label, overrides));
  await repo.create(app.toRecord());
  return app.toRecord();
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let repo: PlatformApplicationRepository;

beforeAll(() => {
  repo = new PlatformApplicationRepository();
});

afterAll(async () => {
  // Physical delete of all integration test records created in this run.
  // Use Prisma ORM deleteMany so parameters are bound correctly across DB drivers.
  await (prisma as any).platformApplication.deleteMany({
    where: {
      code: { startsWith: PREFIX },
    },
  });
  await (prisma as any).$disconnect();
});

// ─── create + getById ─────────────────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — create + getById", () => {
  test("round-trip: creates a record and retrieves it by id", async () => {
    const record = await createAndPersist("RT-001");

    const found = await repo.getById(record.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(record.id);
    expect(found!.code).toBe(record.code);
    expect(found!.name).toBe(record.name);
    expect(found!.status).toBe(PLATFORM_APPLICATION_STATUS.Draft);
    expect(found!.version).toBe(1n);
    expect(found!.isDeleted).toBe(false);
  });

  test("getById returns null for non-existent id", async () => {
    const result = await repo.getById("00000000-0000-0000-0000-999999999999");
    expect(result).toBeNull();
  });

  test("getById excludes soft-deleted records", async () => {
    const record = await createAndPersist("RT-SD");

    // Mark as soft-deleted via raw SQL using tagged template (correct param binding)
    await (prisma as any).$executeRaw`
      UPDATE platform_applications SET is_deleted = true WHERE id = ${record.id}::uuid
    `;

    const result = await repo.getById(record.id);
    expect(result).toBeNull();
  });
});

// ─── getByCode ────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — getByCode", () => {
  test("retrieves a record by its exact code", async () => {
    const record = await createAndPersist("GBC-001");

    const found = await repo.getByCode(record.code);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(record.id);
    expect(found!.code).toBe(record.code);
  });

  test("getByCode returns null for unknown code", async () => {
    const result = await repo.getByCode("UNKNOWN-CODE-99999");
    expect(result).toBeNull();
  });

  test("getByCode trims whitespace before querying (RC-005)", async () => {
    const record = await createAndPersist("GBC-TRIM");

    const found = await repo.getByCode(`  ${record.code}  `);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(record.id);
  });
});

// ─── existsByCode + existsByName ──────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — existsByCode + existsByName", () => {
  test("existsByCode returns true for a known code", async () => {
    const record = await createAndPersist("EXISTS-C");
    expect(await repo.existsByCode(record.code)).toBe(true);
  });

  test("existsByCode returns false for an unknown code", async () => {
    expect(await repo.existsByCode("NONEXISTENT-99999")).toBe(false);
  });

  test("existsByName returns true for a known name", async () => {
    const record = await createAndPersist("EXISTS-N");
    expect(await repo.existsByName(record.name)).toBe(true);
  });

  test("existsByName returns false for an unknown name", async () => {
    expect(await repo.existsByName("This Name Does Not Exist 99999")).toBe(false);
  });
});

// ─── updateMetadata ───────────────────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — updateMetadata", () => {
  test("updates fields and increments version", async () => {
    const record = await createAndPersist("UPD-001");

    await repo.updateMetadata(
      record.id,
      {
        displayName: "Updated Display Name",
        description: "Updated description",
        category: "Updated Category",
        iconUrl: "https://example.com/icon.png",
        websiteUrl: "https://example.com",
      },
      ACTOR_ID,
      record.version // version = 1n
    );

    const updated = await repo.getById(record.id);
    expect(updated).not.toBeNull();
    expect(updated!.displayName).toBe("Updated Display Name");
    expect(updated!.description).toBe("Updated description");
    expect(updated!.category).toBe("Updated Category");
    expect(updated!.iconUrl).toBe("https://example.com/icon.png");
    expect(updated!.websiteUrl).toBe("https://example.com");
    expect(updated!.version).toBe(2n); // version incremented
    expect(updated!.updatedBy).toBe(ACTOR_ID);
  });

  test("throws PlatformApplicationConcurrencyError when version is stale", async () => {
    const record = await createAndPersist("UPD-CONC");

    await expect(
      repo.updateMetadata(
        record.id,
        {
          displayName: "Stale Update",
          description: null,
          category: "Integration",
          iconUrl: null,
          websiteUrl: null,
        },
        ACTOR_ID,
        999n // wrong version
      )
    ).rejects.toThrow(PlatformApplicationConcurrencyError);
  });

  test("updatedAt is set to current time after update", async () => {
    const record = await createAndPersist("UPD-TIME");
    const before = new Date();

    await repo.updateMetadata(
      record.id,
      {
        displayName: "Timestamp Test",
        description: null,
        category: "Integration",
        iconUrl: null,
        websiteUrl: null,
      },
      ACTOR_ID,
      record.version
    );

    const updated = await repo.getById(record.id);
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

// ─── retire ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — retire", () => {
  test("transitions status to Retired and increments version", async () => {
    const record = await createAndPersist("RET-001");

    await repo.retire(record.id, ACTOR_ID, record.version);

    const retired = await repo.getById(record.id);
    expect(retired).not.toBeNull();
    expect(retired!.status).toBe(PLATFORM_APPLICATION_STATUS.Retired);
    expect(retired!.version).toBe(2n);
    expect(retired!.updatedBy).toBe(ACTOR_ID);
  });

  test("throws PlatformApplicationConcurrencyError on stale version during retire", async () => {
    const record = await createAndPersist("RET-CONC");

    await expect(repo.retire(record.id, ACTOR_ID, 999n)).rejects.toThrow(
      PlatformApplicationConcurrencyError
    );
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — list", () => {
  test("returns records filtered by status", async () => {
    // Create one Draft record with a recognizable category
    const record = await createAndPersist("LST-STAT", { category: `CAT-${RUN_ID}-LIST` });

    const results = await repo.list({
      status: PLATFORM_APPLICATION_STATUS.Draft,
      category: `CAT-${RUN_ID}-LIST`,
    });

    const found = results.find(r => r.id === record.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe(PLATFORM_APPLICATION_STATUS.Draft);
  });

  test("does not return soft-deleted records", async () => {
    const record = await createAndPersist("LST-DEL", { category: `CAT-${RUN_ID}-DEL` });

    await (prisma as any).$executeRaw`
      UPDATE platform_applications SET is_deleted = true WHERE id = ${record.id}::uuid
    `;

    const results = await repo.list({ category: `CAT-${RUN_ID}-DEL` });
    const found = results.find(r => r.id === record.id);
    expect(found).toBeUndefined();
  });

  test("returns records filtered by category", async () => {
    const uniqueCategory = `CAT-UNIQUE-${RUN_ID}`;
    const r1 = await createAndPersist("LST-CAT1", { category: uniqueCategory });
    const r2 = await createAndPersist("LST-CAT2", { category: uniqueCategory });

    const results = await repo.list({ category: uniqueCategory });
    const ids = results.map(r => r.id);
    expect(ids).toContain(r1.id);
    expect(ids).toContain(r2.id);
  });
});

// ─── search ───────────────────────────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — search", () => {
  test("finds records by code fragment", async () => {
    const record = await createAndPersist("SRCH-CD");

    const results = await repo.search({ query: record.code });
    const found = results.find(r => r.id === record.id);
    expect(found).toBeDefined();
  });

  test("finds records by name fragment", async () => {
    const record = await createAndPersist("SRCH-NM");

    const results = await repo.search({ query: record.name.slice(0, 20) });
    const found = results.find(r => r.id === record.id);
    expect(found).toBeDefined();
  });

  test("returns empty array for a query that matches nothing", async () => {
    const results = await repo.search({
      query: "ABSOLUTELY-NO-MATCH-XYZZY-99999",
    });
    expect(results).toEqual([]);
  });
});

// ─── Unique constraint violations ─────────────────────────────────────────────

describe("PlatformApplicationRepository (integration) — unique constraint violations", () => {
  test("throws DuplicateApplicationCodeError on duplicate code", async () => {
    const record = await createAndPersist("DUP-CD");

    // Attempt to create a second application with the same code
    const duplicate = PlatformApplication.create({
      code: record.code, // same code
      name: uniqueName("DUP-CD-2"), // different name
      displayName: "Duplicate Code Test",
      category: "Integration",
      actorUserId: ACTOR_ID,
    });

    await expect(repo.create(duplicate.toRecord())).rejects.toThrow(
      DuplicateApplicationCodeError
    );
  });

  test("throws DuplicateApplicationNameError on duplicate name", async () => {
    const record = await createAndPersist("DUP-NM");

    // Attempt to create a second application with the same name
    const duplicate = PlatformApplication.create({
      code: uniqueCode("DUP-NM-2"), // different code
      name: record.name, // same name
      displayName: "Duplicate Name Test",
      category: "Integration",
      actorUserId: ACTOR_ID,
    });

    await expect(repo.create(duplicate.toRecord())).rejects.toThrow(
      DuplicateApplicationNameError
    );
  });
});
