/**
 * VS05HC Certification — Test Manifest Factory
 *
 * Builds RuntimeManifest objects for PHYSICAL and EAV storage modes.
 * Used by all certification test files to avoid repetition.
 *
 * Physical manifests point to the scratch table created by TestTableManager.
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type {
  PersistenceModel,
  PersistenceTable,
  ColumnSpec,
  PersistencePolicy,
} from "@/modules/platform/persistence/types/PersistenceModel";

export const TEST_SCHEMA = "public";
export const TEST_TABLE = "cap_test_records";
export const TEST_CHILD_TABLE = "cap_test_children";
export const TEST_ENTITY_ID = "00000000-1111-0000-0000-000000000001";
export const TEST_CHILD_ENTITY_ID = "00000000-2222-0000-0000-000000000001";
export const TEST_TENANT_ID = 1;
export const TEST_TENANT_B_ID = 2;
export const TEST_USER_ID = "test-user-001";
export const TEST_USER_B_ID = "test-user-002";

// ─── Standard System Columns ─────────────────────────────────────────────────

export const SYSTEM_COLUMNS: ColumnSpec[] = [
  { name: "id",            dataType: "UUID",     sqlType: "UUID",                        required: true,  isPrimaryKey: true,  isSystem: true },
  { name: "tenant_id",     dataType: "INTEGER",  sqlType: "INTEGER",                     required: true,  isPrimaryKey: false, isSystem: true },
  { name: "record_number", dataType: "STRING",   sqlType: "VARCHAR(50)",                 required: false, isPrimaryKey: false, isSystem: true },
  { name: "status",        dataType: "STRING",   sqlType: "VARCHAR(50)",                 required: false, isPrimaryKey: false, isSystem: true, defaultValue: "ACTIVE" },
  { name: "row_version",   dataType: "INTEGER",  sqlType: "INTEGER",                     required: false, isPrimaryKey: false, isSystem: true, defaultValue: "1" },
  { name: "is_deleted",    dataType: "BOOLEAN",  sqlType: "BOOLEAN",                     required: true,  isPrimaryKey: false, isSystem: true, defaultValue: "false" },
  { name: "deleted_at",    dataType: "DATETIME", sqlType: "TIMESTAMP WITH TIME ZONE",    required: false, isPrimaryKey: false, isSystem: true },
  { name: "deleted_by",    dataType: "UUID",     sqlType: "UUID",                        required: false, isPrimaryKey: false, isSystem: true },
  { name: "created_at",    dataType: "DATETIME", sqlType: "TIMESTAMP WITH TIME ZONE",    required: false, isPrimaryKey: false, isSystem: true },
  { name: "created_by",    dataType: "UUID",     sqlType: "UUID",                        required: false, isPrimaryKey: false, isSystem: true },
  { name: "updated_at",    dataType: "DATETIME", sqlType: "TIMESTAMP WITH TIME ZONE",    required: false, isPrimaryKey: false, isSystem: true },
  { name: "updated_by",    dataType: "UUID",     sqlType: "UUID",                        required: false, isPrimaryKey: false, isSystem: true },
];

export const BUSINESS_COLUMNS: ColumnSpec[] = [
  { name: "name",        dataType: "STRING",  sqlType: "VARCHAR(255)", required: true,  isPrimaryKey: false, isSystem: false },
  { name: "code",        dataType: "STRING",  sqlType: "VARCHAR(50)",  required: false, isPrimaryKey: false, isSystem: false },
  { name: "description", dataType: "STRING",  sqlType: "TEXT",         required: false, isPrimaryKey: false, isSystem: false },
];

export const CHILD_COLUMNS: ColumnSpec[] = [
  { name: "parent_id",   dataType: "UUID",    sqlType: "UUID",         required: true,  isPrimaryKey: false, isSystem: false },
  { name: "observation", dataType: "STRING",  sqlType: "VARCHAR(500)", required: false, isPrimaryKey: false, isSystem: false },
  { name: "severity",    dataType: "STRING",  sqlType: "VARCHAR(50)",  required: false, isPrimaryKey: false, isSystem: false },
];

// ─── Standard Policy ─────────────────────────────────────────────────────────

export const STANDARD_POLICY: PersistencePolicy = {
  deleteStrategy: "SOFT",
  lockingStrategy: "ROW_VERSION",
  auditProfile: "STANDARD",
  softDelete: {
    enabled: true,
    field: "is_deleted",
    deletedAtField: "deleted_at",
    deletedByField: "deleted_by",
  },
  concurrency: {
    field: "row_version",
    strategy: "ROW_VERSION",
  },
};

export const NO_LOCK_POLICY: PersistencePolicy = {
  ...STANDARD_POLICY,
  lockingStrategy: "NONE",
  concurrency: { field: "row_version", strategy: "NONE" },
};

// ─── Manifest Factories ───────────────────────────────────────────────────────

function buildPersistenceModel(
  tableName: string,
  columns: ColumnSpec[],
  policy: PersistencePolicy
): PersistenceModel {
  const table: PersistenceTable = {
    name: tableName,
    schema: TEST_SCHEMA,
    isPrimary: true,
    columns,
    indexes: [],
  };
  return { tables: [table], relationships: [], primaryKey: "id", policy };
}

function buildBaseManifest(entityId: string, code: string): Omit<RuntimeManifest, "persistence"> {
  return {
    module: "test",
    entity: code.toLowerCase(),
    entityId,
    entityName: code,
    route: `/runtime/test/${code.toLowerCase()}`,
    permissions: {
      view: `${code}.View`,
      create: `${code}.Create`,
      edit: `${code}.Edit`,
      delete: `${code}.Delete`,
    },
    numberStrategy: "AUTO",
    searchEnabled: false,
    fields: [
      { id: "f-name", code: "NAME", dataType: "STRING", required: true },
      { id: "f-code", code: "CODE", dataType: "STRING", required: false },
      { id: "f-desc", code: "DESCRIPTION", dataType: "STRING", required: false },
    ],
    presentation: {
      version: "1.0",
      defaultDataViewId: "",
      defaultDataViewCode: "GRID",
      defaultLayoutViewId: "",
      defaultLayoutViewCode: "",
      dataViews: [],
      layoutViews: [],
      shared: {},
    },
    _artifact: { version: 1, generatedAt: new Date().toISOString(), generatorVersion: "1.0.0" },
  };
}

/**
 * Builds a PHYSICAL storage manifest pointing to cap_test_records.
 */
export function buildPhysicalManifest(
  tableName = TEST_TABLE,
  policy = STANDARD_POLICY,
  entityId = TEST_ENTITY_ID
): RuntimeManifest {
  const columns = [...SYSTEM_COLUMNS, ...BUSINESS_COLUMNS];
  return {
    ...buildBaseManifest(entityId, "TEST_ENTITY"),
    persistence: {
      provider: "POSTGRES",
      storageMode: "PHYSICAL",
      model: buildPersistenceModel(tableName, columns, policy),
    },
  };
}

/**
 * Builds an EAV storage manifest (legacy).
 */
export function buildEavManifest(entityId = TEST_ENTITY_ID): RuntimeManifest {
  return {
    ...buildBaseManifest(entityId, "TEST_EAV_ENTITY"),
    persistence: {
      provider: "POSTGRES",
      storageMode: "EAV",
      model: {
        tables: [],
        relationships: [],
        primaryKey: "id",
        policy: NO_LOCK_POLICY,
      },
    },
  };
}

/**
 * Builds a child entity manifest (for graph persistence tests).
 */
export function buildChildManifest(parentTable = TEST_TABLE): RuntimeManifest {
  const columns = [...SYSTEM_COLUMNS, ...CHILD_COLUMNS];
  return {
    ...buildBaseManifest(TEST_CHILD_ENTITY_ID, "TEST_CHILD"),
    fields: [
      { id: "f-parent", code: "PARENT_ID", dataType: "UUID", required: true },
      { id: "f-obs", code: "OBSERVATION", dataType: "STRING", required: false },
      { id: "f-sev", code: "SEVERITY", dataType: "STRING", required: false },
    ],
    persistence: {
      provider: "POSTGRES",
      storageMode: "PHYSICAL",
      model: buildPersistenceModel(TEST_CHILD_TABLE, columns, STANDARD_POLICY),
    },
  };
}

/**
 * Builds a manifest with no persistence field (tests EAV fallback).
 */
export function buildNoPersistenceManifest(): RuntimeManifest {
  return buildBaseManifest(TEST_ENTITY_ID, "NO_PERSISTENCE") as RuntimeManifest;
}
