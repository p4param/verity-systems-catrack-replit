/**
 * VS05HC Certification — Test Table Manager
 *
 * Creates and drops scratch tables for integration tests.
 * Uses raw pg (not Prisma) so it can run before any entity is published.
 *
 * Tables created:
 *   cap_test_records   — primary entity scratch table
 *   cap_test_children  — child entity scratch table (for graph tests)
 *   cap_test_evo_*     — schema evolution scratch tables (C-16)
 */
import { Client } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

export const SCHEMA_EVOLUTION_TABLE = "cap_test_evo_entity";

// ─── Column DDL snippets ──────────────────────────────────────────────────────

const SYSTEM_COLUMNS_DDL = `
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     INTEGER NOT NULL,
  "record_number" VARCHAR(50),
  "status"        VARCHAR(50) DEFAULT 'ACTIVE',
  "row_version"   INTEGER DEFAULT 1,
  "is_deleted"    BOOLEAN NOT NULL DEFAULT false,
  "deleted_at"    TIMESTAMP WITH TIME ZONE,
  "deleted_by"    UUID,
  "created_at"    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "created_by"    UUID,
  "updated_at"    TIMESTAMP WITH TIME ZONE,
  "updated_by"    UUID
`;

const BUSINESS_COLUMNS_DDL = `
  "name"          VARCHAR(255),
  "code"          VARCHAR(50),
  "description"   TEXT
`;

const CHILD_COLUMNS_DDL = `
  "parent_id"     UUID NOT NULL,
  "observation"   VARCHAR(500),
  "severity"      VARCHAR(50)
`;

// ─── TestTableManager ─────────────────────────────────────────────────────────

export class TestTableManager {
  private client: Client;
  private connected = false;

  constructor() {
    this.client = new Client({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }

  async createScratchTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "public"."cap_test_records" (
        ${SYSTEM_COLUMNS_DDL},
        ${BUSINESS_COLUMNS_DDL}
      );
    `);
  }

  async createChildTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "public"."cap_test_children" (
        ${SYSTEM_COLUMNS_DDL},
        ${CHILD_COLUMNS_DDL}
      );
    `);
  }

  async dropScratchTable(): Promise<void> {
    await this.client.query(`DROP TABLE IF EXISTS "public"."cap_test_records" CASCADE;`);
  }

  async dropChildTable(): Promise<void> {
    await this.client.query(`DROP TABLE IF EXISTS "public"."cap_test_children" CASCADE;`);
  }

  async truncateScratchTable(): Promise<void> {
    await this.client.query(`TRUNCATE "public"."cap_test_records" RESTART IDENTITY;`);
  }

  async truncateChildTable(): Promise<void> {
    await this.client.query(`TRUNCATE "public"."cap_test_children" RESTART IDENTITY;`);
  }

  // ── Schema Evolution helpers (C-16) ────────────────────────────────────────

  async createSchemaEvolutionTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "public"."${SCHEMA_EVOLUTION_TABLE}" (
        ${SYSTEM_COLUMNS_DDL},
        "evo_code"    VARCHAR(50),
        "evo_name"    VARCHAR(255),
        "evo_desc"    TEXT
      );
    `);
  }

  async dropSchemaEvolutionTable(): Promise<void> {
    await this.client.query(`DROP TABLE IF EXISTS "public"."${SCHEMA_EVOLUTION_TABLE}" CASCADE;`);
  }

  async addSchemaEvolutionColumns(): Promise<void> {
    // Simulate schema evolution: add 3 new columns (ALTER TABLE ADD COLUMN)
    await this.client.query(`
      ALTER TABLE "public"."${SCHEMA_EVOLUTION_TABLE}"
        ADD COLUMN IF NOT EXISTS "manager_id"    UUID,
        ADD COLUMN IF NOT EXISTS "cost_center"   VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "is_active"     BOOLEAN DEFAULT true;
    `);
  }

  async insertEvoRows(count: number, tenantId = 1): Promise<void> {
    for (let i = 1; i <= count; i++) {
      await this.client.query(`
        INSERT INTO "public"."${SCHEMA_EVOLUTION_TABLE}"
          ("tenant_id", "record_number", "evo_code", "evo_name", "evo_desc")
        VALUES ($1, $2, $3, $4, $5)
      `, [tenantId, `EVO-${String(i).padStart(6, "0")}`, `CODE${i}`, `Name ${i}`, `Desc ${i}`]);
    }
  }

  // ── Number sequences (C-10) ─────────────────────────────────────────────────

  async resetSequenceForEntity(entityId: string): Promise<void> {
    await this.client.query(
      `UPDATE "platform_record_sequences" SET "last_value" = 0 WHERE "entity_id" = $1`,
      [entityId]
    );
    await this.client.query(
      `DELETE FROM "platform_record_sequences" WHERE "entity_id" = $1`,
      [entityId]
    );
  }

  // ── Raw query helper ────────────────────────────────────────────────────────

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.client.query(sql, params);
    return result.rows as T[];
  }

  async exists(table: string, id: string): Promise<boolean> {
    const rows = await this.client.query(
      `SELECT EXISTS(SELECT 1 FROM "public"."${table}" WHERE "id" = $1) AS exists`,
      [id]
    );
    return rows.rows[0]?.exists ?? false;
  }

  async count(table: string, where: string = "is_deleted = false"): Promise<number> {
    const rows = await this.client.query(
      `SELECT COUNT(*)::int AS cnt FROM "public"."${table}" WHERE ${where}`
    );
    return parseInt(rows.rows[0]?.cnt ?? "0", 10);
  }

  async rawRow(table: string, id: string): Promise<any | null> {
    const rows = await this.client.query(
      `SELECT * FROM "public"."${table}" WHERE "id" = $1`,
      [id]
    );
    return rows.rows[0] ?? null;
  }

  // ── PostgreSQL version ───────────────────────────────────────────────────────

  async postgresVersion(): Promise<string> {
    const rows = await this.client.query("SELECT version() AS v");
    return rows.rows[0]?.v ?? "unknown";
  }
}

/** Singleton for shared test usage. Each test file should call connect/disconnect via beforeAll/afterAll. */
export function createTestTableManager(): TestTableManager {
  return new TestTableManager();
}
