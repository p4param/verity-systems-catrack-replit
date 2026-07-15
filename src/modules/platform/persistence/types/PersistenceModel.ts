/**
 * CM-003 Runtime Data Engine — Persistence Model
 *
 * Describes the full physical database mapping for a logical entity.
 * Analogous to Entity Framework's mapping configuration or Hibernate's entity metadata.
 *
 * This is the bridge between the LogicalSchemaManifest (from CM-002 Schema Platform Engine)
 * and the SQL layer (SqlBuilder). It exposes only physical database concepts —
 * no business field names, entity names, or module names.
 *
 * Standards: ES-006, ES-007, ES-008
 */

// ─── Column Specification ─────────────────────────────────────────────────────

/**
 * Physical column descriptor consumed by SqlBuilder.
 * SqlBuilder NEVER receives business field codes — only ColumnSpec.
 */
export interface ColumnSpec {
  /** Physical column name in the database. Example: "reg_no", "tenant_id" */
  name: string;

  /** CAP logical data type. Example: "STRING", "UUID", "DECIMAL", "DATE" */
  dataType: string;

  /**
   * Dialect-specific SQL type. Example: "VARCHAR(255)", "UUID", "NUMERIC(18,4)"
   * Set by PostgresRuntimeDialect from the SchemaManifest column definition.
   */
  sqlType: string;

  required: boolean;
  isPrimaryKey: boolean;

  /** True for platform-managed columns: id, tenant_id, created_at, row_version, etc. */
  isSystem: boolean;

  defaultValue?: string;
  isGenerated?: boolean;
  generationExpression?: string;
}

// ─── Index Specification ──────────────────────────────────────────────────────

export interface IndexSpec {
  name: string;
  columns: string[];
  isUnique: boolean;
}

// ─── Table Specification ──────────────────────────────────────────────────────

export interface PersistenceTable {
  /** Physical table name. Example: "hr_department", "laundry_vehicle" */
  name: string;

  /** Database schema. Default: "public" */
  schema: string;

  /** True for the main entity table; false for extension tables (future). */
  isPrimary: boolean;

  columns: ColumnSpec[];
  indexes: IndexSpec[];
}

// ─── Relationship Specification ───────────────────────────────────────────────

export interface PersistenceRelationship {
  /** Logical name used by AggregateRoot. Example: "orderLines", "observations" */
  collectionKey: string;

  type: "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

  /** FK column on THIS table (for MANY_TO_ONE) or on child table (for ONE_TO_MANY) */
  localColumn: string;

  /** Referenced physical table name */
  foreignTable: string;

  /** Referenced column (usually "id") */
  foreignColumn: string;
}

// ─── Persistence Policy ───────────────────────────────────────────────────────

/**
 * Metadata-driven persistence behavior policy.
 * Stored in the RuntimeManifest — not hardcoded in any engine or repository.
 *
 * Examples:
 *   Incident: deleteStrategy=SOFT, auditProfile=REGULATED, lockingStrategy=ROW_VERSION
 *   Lookup Master: deleteStrategy=HARD, auditProfile=STANDARD, lockingStrategy=NONE
 */
export type DeleteStrategy = "SOFT" | "HARD" | "ARCHIVE";
export type LockingStrategy = "ROW_VERSION" | "TIMESTAMP" | "NONE";
export type AuditProfile = "NONE" | "STANDARD" | "FULL" | "REGULATED";
// NONE     — no audit columns
// STANDARD — created_at, created_by, updated_at, updated_by
// FULL     — STANDARD + deleted_at, deleted_by, row_version
// REGULATED — FULL + immutable audit trail (HSE, Healthcare, Aviation, Financial)

export interface PersistencePolicy {
  deleteStrategy: DeleteStrategy;
  lockingStrategy: LockingStrategy;
  auditProfile: AuditProfile;

  softDelete: {
    enabled: boolean;
    /** Column name for soft-delete flag. Default: "is_deleted" */
    field: string;
    /** Column name for deletion timestamp. Default: "deleted_at" */
    deletedAtField: string;
    /** Column name for deleting user. Default: "deleted_by" */
    deletedByField: string;
  };

  concurrency: {
    /** Physical column name. Example: "row_version" */
    field: string;
    strategy: LockingStrategy;
    // Postgres:   BIGINT (incremented by engine)
    // SQL Server: rowversion (system-managed)
    // Oracle:     ORA_ROWSCN or application timestamp
  };
}

// ─── Persistence Model ────────────────────────────────────────────────────────

/**
 * The complete physical database mapping for a logical entity.
 * Produced by ManifestGeneratorService at Publish time and embedded in RuntimeManifest.
 *
 * Analogous to:
 *   - Entity Framework's EntityTypeConfiguration
 *   - Hibernate's @Entity + @Table + @Column mappings
 *   - Prisma's model definition
 */
export interface PersistenceModel {
  /** tables[0] is the primary table; tables[1..n] are extension tables (future). */
  tables: PersistenceTable[];

  /** Cross-entity relationships for graph persistence. */
  relationships: PersistenceRelationship[];

  /** Name of the primary key column. Default: "id" */
  primaryKey: string;

  /** All persistence behavior policy. */
  policy: PersistencePolicy;
}
