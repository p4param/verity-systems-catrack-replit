export type PersistenceProfile =
  | "MASTER"
  | "TRANSACTION"
  | "LEDGER"
  | "HISTORY"
  | "REFERENCE"
  | "CONFIGURATION"
  | "TEMPORARY"
  | "CACHE";

export type AuditProfile = "NONE" | "STANDARD" | "FULL" | "LEDGER";

export interface ColumnDefinition {
  name: string;
  dataType: string;
  length?: number;
  required: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isGenerated?: boolean;
  generationExpression?: string;
}

export interface ConstraintDefinition {
  name: string;
  type: "PRIMARY" | "UNIQUE" | "CHECK" | "FOREIGN";
  columns: string[];
  checkExpression?: string;
  refTable?: string;
  refColumns?: string[];
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export interface TableSchemaObject {
  type: "TABLE";
  name: string;
  columns: ColumnDefinition[];
  constraints: ConstraintDefinition[];
  indexes: IndexDefinition[];
  persistenceProfile: PersistenceProfile;
  auditProfile: AuditProfile;
}

export interface SchemaManifest {
  entityId: string;
  persistenceModelCode: string;
  schemaVersion: number;
  tables: TableSchemaObject[];
  views?: any[];
  materializedViews?: any[];
  sequences?: any[];
  functions?: any[];
  triggers?: any[];
  procedures?: any[];
}

export interface DatabaseCapabilities {
  supportsJsonb: boolean;
  supportsGeneratedColumns: boolean;
  supportsMaterializedViews: boolean;
  supportsPartitioning: boolean;
  supportsArrays: boolean;
  supportsSpatial: boolean;
}

export interface ColumnChange {
  name: string;
  type: "ADDED" | "MODIFIED" | "REMOVED";
  oldColumn?: ColumnDefinition;
  newColumn?: ColumnDefinition;
}

export interface IndexChange {
  name: string;
  type: "ADDED" | "REMOVED";
  oldIndex?: IndexDefinition;
  newIndex?: IndexDefinition;
}

export interface ConstraintChange {
  name: string;
  type: "ADDED" | "REMOVED";
  oldConstraint?: ConstraintDefinition;
  newConstraint?: ConstraintDefinition;
}

export interface TableDiff {
  tableName: string;
  type: "CREATED" | "MODIFIED" | "REMOVED";
  columnChanges: ColumnChange[];
  indexChanges: IndexChange[];
  constraintChanges: ConstraintChange[];
}

export interface MetadataDiff {
  entityId: string;
  tableDiffs: TableDiff[];
}

export type MigrationOperation =
  | { type: "CREATE_TABLE"; tableName: string; columns: ColumnDefinition[]; constraints: ConstraintDefinition[]; persistenceProfile: PersistenceProfile; auditProfile: AuditProfile }
  | { type: "ADD_COLUMN"; tableName: string; column: ColumnDefinition }
  | { type: "ALTER_COLUMN"; tableName: string; oldColumn: ColumnDefinition; newColumn: ColumnDefinition }
  | { type: "DROP_COLUMN"; tableName: string; columnName: string }
  | { type: "CREATE_INDEX"; tableName: string; index: IndexDefinition }
  | { type: "DROP_INDEX"; tableName: string; indexName: string }
  | { type: "ADD_CONSTRAINT"; tableName: string; constraint: ConstraintDefinition }
  | { type: "DROP_CONSTRAINT"; tableName: string; constraintName: string };

export interface MigrationPlan {
  migrationId: string;
  entityId: string;
  version: number;
  operations: MigrationOperation[];
}

export interface MigrationManifest {
  migrationId: string;
  entityId: string;
  version: number;
  checksum: string;
  applySql: string;
  rollbackSql: string;
  manifestJson: string;
}

