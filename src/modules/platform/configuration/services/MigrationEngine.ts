import { 
  MetadataDiff, 
  MigrationPlan, 
  MigrationOperation,
  TableDiff,
  SchemaManifest
} from "./SchemaPlatformTypes";

export class MigrationEngine {
  /**
   * Compares the metadata diff and compiles a database-independent MigrationPlan.
   */
  static compilePlan(diff: MetadataDiff, currentManifest: SchemaManifest): MigrationPlan {
    const timestamp = new Date().toISOString().replace(/[-T:]/g, "").slice(0, 14);
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const migrationId = `CM002-${timestamp}-${uniqueSuffix}`;

    const operations: MigrationOperation[] = [];

    // Map table schema metadata objects by name to retrieve details during compilation
    const tablesMetadata = new Map<string, any>();
    currentManifest.tables.forEach(t => tablesMetadata.set(t.name.toLowerCase(), t));

    // Sort table diffs: CREATED first, MODIFIED second, REMOVED last
    const sortedTableDiffs = [...diff.tableDiffs].sort((a, b) => {
      const rank = (type: string) => (type === "CREATED" ? 1 : type === "MODIFIED" ? 2 : 3);
      return rank(a.type) - rank(b.type);
    });

    for (const tableDiff of sortedTableDiffs) {
      const tableName = tableDiff.tableName;

      if (tableDiff.type === "CREATED") {
        const metadata = tablesMetadata.get(tableName.toLowerCase());
        operations.push({
          type: "CREATE_TABLE",
          tableName,
          columns: metadata.columns,
          constraints: metadata.constraints,
          persistenceProfile: metadata.persistenceProfile,
          auditProfile: metadata.auditProfile,
        });

        // Add indices and constraints declared on creation
        metadata.indexes.forEach((idx: any) => {
          operations.push({
            type: "CREATE_INDEX",
            tableName,
            index: idx,
          });
        });

        metadata.constraints.forEach((cons: any) => {
          if (cons.type === "PRIMARY") return; // Primary constraint is handled inline in CREATE_TABLE
          // Foreign keys are created after index bindings
          operations.push({
            type: "ADD_CONSTRAINT",
            tableName,
            constraint: cons,
          });
        });
      } else if (tableDiff.type === "MODIFIED") {
        // 1. Column additions & alterations
        for (const colChange of tableDiff.columnChanges) {
          if (colChange.type === "ADDED" && colChange.newColumn) {
            operations.push({
              type: "ADD_COLUMN",
              tableName,
              column: colChange.newColumn,
            });
          } else if (colChange.type === "MODIFIED" && colChange.oldColumn && colChange.newColumn) {
            operations.push({
              type: "ALTER_COLUMN",
              tableName,
              oldColumn: colChange.oldColumn,
              newColumn: colChange.newColumn,
            });
          } else if (colChange.type === "REMOVED") {
            operations.push({
              type: "DROP_COLUMN",
              tableName,
              columnName: colChange.name,
            });
          }
        }

        // 2. Index updates
        for (const idxChange of tableDiff.indexChanges) {
          if (idxChange.type === "ADDED" && idxChange.newIndex) {
            operations.push({
              type: "CREATE_INDEX",
              tableName,
              index: idxChange.newIndex,
            });
          } else if (idxChange.type === "REMOVED") {
            operations.push({
              type: "DROP_INDEX",
              tableName,
              indexName: idxChange.name,
            });
          }
        }

        // 3. Constraint updates
        for (const consChange of tableDiff.constraintChanges) {
          if (consChange.type === "ADDED" && consChange.newConstraint) {
            operations.push({
              type: "ADD_CONSTRAINT",
              tableName,
              constraint: consChange.newConstraint,
            });
          } else if (consChange.type === "REMOVED") {
            operations.push({
              type: "DROP_CONSTRAINT",
              tableName,
              constraintName: consChange.name,
            });
          }
        }
      } else if (tableDiff.type === "REMOVED") {
        // Drop table operation compiles details (though marked unsafe)
        // Drops are sorted to execute references first
        const prevMetadata = tablesMetadata.get(tableName.toLowerCase());
        if (prevMetadata) {
          prevMetadata.constraints.forEach((cons: any) => {
            operations.push({
              type: "DROP_CONSTRAINT",
              tableName,
              constraintName: cons.name,
            });
          });

          prevMetadata.indexes.forEach((idx: any) => {
            operations.push({
              type: "DROP_INDEX",
              tableName,
              indexName: idx.name,
            });
          });
        }

        // Add table drops
        // (we represent this by dropping columns or just drop table instructions in providers)
      }
    }

    return {
      migrationId,
      entityId: currentManifest.entityId,
      version: currentManifest.schemaVersion,
      operations,
    };
  }
}

