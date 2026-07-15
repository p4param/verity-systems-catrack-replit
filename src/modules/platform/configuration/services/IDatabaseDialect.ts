import { 
  DatabaseCapabilities, 
  TableSchemaObject, 
  AuditProfile, 
  ColumnDefinition, 
  IndexDefinition, 
  ConstraintDefinition 
} from "./SchemaPlatformTypes";

export interface IDatabaseDialect {
  capabilities: DatabaseCapabilities;
  formatTableName(moduleCode: string, entityCode: string): string;
  mapDataType(dataType: string, length?: number): string;
  generateCreateTableSql(op: { tableName: string; columns: ColumnDefinition[]; constraints: ConstraintDefinition[] }): string;
  generateAddColumnSql(tableName: string, column: ColumnDefinition): string;
  generateAlterColumnSql(tableName: string, oldColumn: ColumnDefinition, newColumn: ColumnDefinition): string;
  generateDropColumnSql(tableName: string, columnName: string): string;
  generateCreateIndexSql(tableName: string, index: IndexDefinition): string;
  generateDropIndexSql(tableName: string, indexName: string): string;
  generateAddConstraintSql(tableName: string, constraint: ConstraintDefinition): string;
  generateDropConstraintSql(tableName: string, constraintName: string): string;
  generateAdvisoryLockSql(tenantId: number, moduleCode: string, entityCode: string): string;
}

