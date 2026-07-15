import { Prisma } from "@/generated/client";
import { prisma } from "@/lib/prisma";
import { LogicalSchemaBuilder } from "./LogicalSchemaBuilder";
import { MetadataDiffEngine } from "./MetadataDiffEngine";
import { MigrationEngine } from "./MigrationEngine";
import { PostgresDialect } from "./PostgresDialect";
import { 
  SchemaManifest, 
  MigrationManifest, 
  MetadataDiff,
  MigrationOperation
} from "./SchemaPlatformTypes";
import { logger } from "@/lib/logger";
import * as crypto from "crypto";

// Union type: either a Prisma interactive transaction client or the top-level prisma client
type DbClient = Prisma.TransactionClient | typeof prisma;

export class SchemaPlatformEngine {
  private dialect = new PostgresDialect();

  /**
   * Synchronizes the physical database schema for the given entity inside a Prisma transaction block.
   * If bypassSafety is true, destructive actions (like column drops) will be executed.
   */
  async syncSchema(
    entityId: string, 
    tenantId: number, 
    tx: Prisma.TransactionClient, 
    bypassSafety: boolean = false
  ): Promise<MigrationManifest | null> {
    const startTime = Date.now();
    logger.info(`Starting SchemaPlatformEngine sync for entity ${entityId}`);

    // Load Entity metadata from DB
    const entity = await tx.configurationEntity.findUnique({
      where: { id: entityId },
      include: { module: true, fields: true }
    });

    if (!entity) {
      throw new Error(`Entity metadata not found for ID: ${entityId}`);
    }

    const moduleCode = entity.module.code;
    const entityCode = entity.code;

    // 1. Acquire transactional advisory lock scoped to tenant, module, and entity
    const lockSql = this.dialect.generateAdvisoryLockSql(tenantId, moduleCode, entityCode);
    await tx.$executeRawUnsafe(lockSql);
    logger.info(`Acquired transactional advisory lock for entity ${moduleCode}_${entityCode}`);

    // 2. Auto-provision Migration History Table
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."platform_migrations" (
        "migration_id" VARCHAR(50) PRIMARY KEY,
        "entity_id" UUID NOT NULL,
        "version" INTEGER NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "applied_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "duration" INTEGER NOT NULL,
        "succeeded" BOOLEAN NOT NULL,
        "apply_sql" TEXT NOT NULL,
        "rollback_sql" TEXT NOT NULL,
        "manifest_json" TEXT NOT NULL
      );
    `);

    // 3. Load Previous Manifest
    let prevManifest: SchemaManifest | null = null;
    try {
      const rows = await tx.$queryRawUnsafe<any[]>(
        `SELECT "manifest_json" FROM "public"."platform_migrations" WHERE "entity_id" = $1::uuid AND "succeeded" = true ORDER BY "applied_at" DESC LIMIT 1`,
        entityId
      );
      if (rows && rows.length > 0) {
        prevManifest = JSON.parse(rows[0].manifest_json) as SchemaManifest;
        logger.info(`Successfully parsed previous schema manifest for entity ${entityCode}`);
      }
    } catch (err: any) {
      logger.warn(`Could not load previous migration logs, starting fresh: ${err.message}`);
    }
    
    if (!prevManifest) {
      const tableName = `${moduleCode.toLowerCase()}_${entityCode.toLowerCase()}`;
      logger.info(`Orphaned table check: Dropping pre-existing physical table: ${tableName}`);
      await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."${tableName}" CASCADE;`);
    }

    // 4. Build Current Manifest
    const currentManifest = LogicalSchemaBuilder.build(entity);

    // 5. Diff Manifests
    const diff = MetadataDiffEngine.diff(prevManifest, currentManifest);

    // If there are no structural differences, skip migration
    if (diff.tableDiffs.length === 0) {
      logger.info(`No schema changes detected for entity ${entityCode}. Skipping migration execution.`);
      return null;
    }

    // 6. Safety Check Validation
    if (!bypassSafety) {
      const safetyResult = MetadataDiffEngine.validateSafety(diff);
      if (!safetyResult.isSafe) {
        logger.warn(`Validation block: aborting publish due to unsafe changes: ${safetyResult.unsafeReason}`);
        throw new Error(`Unsafe migration blocked: ${safetyResult.unsafeReason}`);
      }
    }

    // 7. Compile Logical Migration Plan
    const plan = MigrationEngine.compilePlan(diff, currentManifest);

    // 8. Generate Dialect Physical SQL (Apply and Rollback SQL)
    const applySqlStatements: string[] = [];
    const rollbackSqlStatements: string[] = [];

    for (const op of plan.operations) {
      const sqlObj = this.generateOperationSql(op);
      if (sqlObj.apply) applySqlStatements.push(sqlObj.apply);
      if (sqlObj.rollback) rollbackSqlStatements.push(sqlObj.rollback);
    }

    const applySql = applySqlStatements.join("\n");
    const rollbackSql = rollbackSqlStatements.join("\n");

    const manifestJson = JSON.stringify(currentManifest);
    const checksum = crypto.createHash("sha256").update(manifestJson).digest("hex");

    const migrationManifest: MigrationManifest = {
      migrationId: plan.migrationId,
      entityId,
      version: plan.version,
      checksum,
      applySql,
      rollbackSql,
      manifestJson,
    };

    // 9. Execute Forward SQL DDL Statements transactionally
    logger.info(`Applying DDL migrations for migration: ${plan.migrationId}`);
    for (const sql of applySqlStatements) {
      const trimmed = sql.trim();
      if (!trimmed) continue;
      
      // Execute each query block
      logger.info(`Executing DDL statement:\n${trimmed}`);
      await tx.$executeRawUnsafe(trimmed);
    }

    // 10. Verify Database Physical Schema State
    await this.verifyPhysicalSchema(currentManifest, tx);

    // 11. Log Successful Migration Record
    const duration = Date.now() - startTime;
    await tx.$executeRawUnsafe(
      `INSERT INTO "public"."platform_migrations" ("migration_id", "entity_id", "version", "checksum", "duration", "succeeded", "apply_sql", "rollback_sql", "manifest_json") VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)`,
      migrationManifest.migrationId,
      migrationManifest.entityId,
      migrationManifest.version,
      migrationManifest.checksum,
      duration,
      true,
      migrationManifest.applySql,
      migrationManifest.rollbackSql,
      migrationManifest.manifestJson
    );

    logger.info(`Successfully synchronized database schema for entity ${entityCode} (v${plan.version}) in ${duration}ms`);
    return migrationManifest;
  }
  /**
   * syncSchemaOutsideTransaction — use this from the Publish pipeline.
   *
   * Runs DDL using the top-level `prisma` client, NOT inside any transaction.
   *
   * WHY: DDL statements (CREATE TABLE / ALTER TABLE / CREATE INDEX) cause
   * PostgreSQL to implicitly commit. If DDL runs inside a Prisma $transaction
   * and fails, the transaction enters state 25P02 (aborted) and all subsequent
   * Prisma queries on that connection throw:
   *   "current transaction is aborted, commands ignored until end of transaction block"
   *
   * By running DDL outside any transaction, we avoid contaminating the
   * application-level DML transaction that follows.
   */
  async syncSchemaOutsideTransaction(
    entityId: string,
    tenantId: number,
    bypassSafety: boolean = false
  ): Promise<MigrationManifest | null> {
    return this.syncSchema(entityId, tenantId, prisma as unknown as Prisma.TransactionClient, bypassSafety);
  }


  private generateOperationSql(op: MigrationOperation): { apply: string; rollback: string } {
    switch (op.type) {
      case "CREATE_TABLE":
        // Fallback rollback drops table
        return {
          apply: this.dialect.generateCreateTableSql(op),
          rollback: `DROP TABLE IF EXISTS "public"."${op.tableName}" CASCADE;`
        };
      case "ADD_COLUMN":
        return {
          apply: this.dialect.generateAddColumnSql(op.tableName, op.column),
          rollback: this.dialect.generateDropColumnSql(op.tableName, op.column.name)
        };
      case "ALTER_COLUMN":
        return {
          apply: this.dialect.generateAlterColumnSql(op.tableName, op.oldColumn, op.newColumn),
          rollback: this.dialect.generateAlterColumnSql(op.tableName, op.newColumn, op.oldColumn)
        };
      case "DROP_COLUMN":
        // Destructive drop requires backup or dummy revert
        return {
          apply: this.dialect.generateDropColumnSql(op.tableName, op.columnName),
          rollback: `-- Reverting Drop Column is not automatically supported for dropped columns.`
        };
      case "CREATE_INDEX":
        return {
          apply: this.dialect.generateCreateIndexSql(op.tableName, op.index),
          rollback: this.dialect.generateDropIndexSql(op.tableName, op.index.name)
        };
      case "DROP_INDEX":
        return {
          apply: this.dialect.generateDropIndexSql(op.tableName, op.indexName),
          rollback: `-- Reverting Drop Index requires index definition attributes.`
        };
      case "ADD_CONSTRAINT":
        return {
          apply: this.dialect.generateAddConstraintSql(op.tableName, op.constraint),
          rollback: this.dialect.generateDropConstraintSql(op.tableName, op.constraint.name)
        };
      case "DROP_CONSTRAINT":
        return {
          apply: this.dialect.generateDropConstraintSql(op.tableName, op.constraintName),
          rollback: `-- Reverting Drop Constraint requires constraint definition attributes.`
        };
      default:
        return { apply: "", rollback: "" };
    }
  }

  /**
   * Verifies database schema tables and columns catalog state against the logical manifest specifications.
   * Accepts either a Prisma TransactionClient or the top-level prisma client.
   */
  private async verifyPhysicalSchema(manifest: SchemaManifest, db: DbClient): Promise<void> {
    logger.info(`Running verification checks for logical schema manifest of entity: ${manifest.persistenceModelCode}`);
    
    for (const table of manifest.tables) {
      const tableName = table.name.toLowerCase();

      // Verify Table Exists
      const txClient = db as Prisma.TransactionClient;
      const tableExistsRows = await txClient.$queryRawUnsafe<any[]>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        tableName
      );

      if (!tableExistsRows || tableExistsRows.length === 0 || !tableExistsRows[0].exists) {
        throw new Error(`Database verification failed: Table "public"."${tableName}" does not exist after migration.`);
      }

      // Verify Columns Exist
      const colRows = await txClient.$queryRawUnsafe<any[]>(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = $1`,
        tableName
      );

      const dbCols = new Map<string, any>();
      colRows.forEach(row => dbCols.set(row.column_name.toLowerCase(), row));

      for (const col of table.columns) {
        const colName = col.name.toLowerCase();
        const dbCol = dbCols.get(colName);

        if (!dbCol) {
          throw new Error(`Database verification failed: Column "${col.name}" does not exist on table "${table.name}".`);
        }

        // Basic datatype format checks
        const dbType = dbCol.data_type.toLowerCase();
        const mappedType = this.dialect.mapDataType(col.dataType, col.length).toLowerCase();

        // Check if DB datatype is compatible with the mapped standard definition (e.g. numeric, timestamp, character varying)
        if (
          !mappedType.startsWith(dbType) && 
          !dbType.startsWith(mappedType.split("(")[0]) && 
          !(dbType === "timestamp with time zone" && mappedType.startsWith("timestamp"))
        ) {
          logger.warn(`Verification mismatch warning: Column "${col.name}" type in manifest is "${mappedType}", DB type is "${dbCol.data_type}"`);
        }
      }
    }
    
    logger.info(`Database verification check completed successfully for all tables.`);
  }
}

