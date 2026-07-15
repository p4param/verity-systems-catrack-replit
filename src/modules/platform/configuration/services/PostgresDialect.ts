import { IDatabaseDialect } from "./IDatabaseDialect";
import { 
  DatabaseCapabilities, 
  TableSchemaObject, 
  ColumnDefinition, 
  IndexDefinition, 
  ConstraintDefinition 
} from "./SchemaPlatformTypes";

export class PostgresDialect implements IDatabaseDialect {
  capabilities: DatabaseCapabilities = {
    supportsJsonb: true,
    supportsGeneratedColumns: true,
    supportsMaterializedViews: true,
    supportsPartitioning: true,
    supportsArrays: true,
    supportsSpatial: true,
  };

  formatTableName(moduleCode: string, entityCode: string): string {
    return `${moduleCode.toLowerCase()}_${entityCode.toLowerCase()}`;
  }

  mapDataType(dataType: string, length?: number): string {
    const type = dataType.toUpperCase();
    switch (type) {
      case "STRING":
        return length ? `VARCHAR(${length})` : "VARCHAR(255)";
      case "TEXT":
        return "TEXT";
      case "INTEGER":
        return "INTEGER";
      case "BIGINT":
        return "BIGINT";
      case "DECIMAL":
        return "NUMERIC(14, 4)";
      case "BOOLEAN":
        return "BOOLEAN";
      case "DATE":
      case "DATETIME":
        return "TIMESTAMP WITH TIME ZONE";
      case "JSON":
      case "JSONB":
        return "JSONB";
      case "UUID":
        return "UUID";
      default:
        return "VARCHAR(255)";
    }
  }

  private formatDefaultValue(defaultValue: string | undefined, dataType: string): string {
    if (defaultValue === undefined) return "";
    if (defaultValue.toUpperCase() === "CURRENT_TIMESTAMP") return "DEFAULT CURRENT_TIMESTAMP";
    if (defaultValue.toLowerCase() === "true" || defaultValue.toLowerCase() === "false") {
      return `DEFAULT ${defaultValue.toLowerCase()}`;
    }
    
    // Check if numeric
    if (!isNaN(Number(defaultValue))) {
      return `DEFAULT ${defaultValue}`;
    }
    
    return `DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
  }

  generateCreateTableSql(op: { tableName: string; columns: ColumnDefinition[]; constraints: ConstraintDefinition[] }): string {
    const colSql = op.columns.map(col => {
      let sql = `  "${col.name}" ${this.mapDataType(col.dataType, col.length)}`;
      
      // Generation check
      if (col.isGenerated && col.generationExpression) {
        sql += ` GENERATED ALWAYS AS (${col.generationExpression}) STORED`;
      } else {
        if (col.required) {
          sql += " NOT NULL";
        } else {
          sql += " NULL";
        }
        
        if (col.defaultValue !== undefined) {
          sql += ` ${this.formatDefaultValue(col.defaultValue, col.dataType)}`;
        }
      }
      
      return sql;
    });

    // Add Primary Key Constraint directly
    const pkConstraint = op.constraints.find(c => c.type === "PRIMARY");
    if (pkConstraint) {
      colSql.push(`  CONSTRAINT "${pkConstraint.name}" PRIMARY KEY (${pkConstraint.columns.map(c => `"${c}"`).join(", ")})`);
    }

    return `CREATE TABLE "public"."${op.tableName}" (\n${colSql.join(",\n")}\n);`;
  }

  generateAddColumnSql(tableName: string, column: ColumnDefinition): string {
    let sql = `ALTER TABLE "public"."${tableName}" ADD COLUMN "${column.name}" ${this.mapDataType(column.dataType, column.length)}`;
    
    if (column.isGenerated && column.generationExpression) {
      sql += ` GENERATED ALWAYS AS (${column.generationExpression}) STORED`;
    } else {
      if (column.required) {
        sql += " NOT NULL";
      } else {
        sql += " NULL";
      }
      
      if (column.defaultValue !== undefined) {
        sql += ` ${this.formatDefaultValue(column.defaultValue, column.dataType)}`;
      }
    }
    
    return sql + ";";
  }

  generateAlterColumnSql(tableName: string, oldColumn: ColumnDefinition, newColumn: ColumnDefinition): string {
    const sqlCommands: string[] = [];
    const colName = newColumn.name;

    // Type change query
    if (oldColumn.dataType !== newColumn.dataType || oldColumn.length !== newColumn.length) {
      sqlCommands.push(
        `ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" TYPE ${this.mapDataType(newColumn.dataType, newColumn.length)} USING "${colName}"::${this.mapDataType(newColumn.dataType, newColumn.length)}`
      );
    }

    // Nullability change query
    if (oldColumn.required !== newColumn.required) {
      if (newColumn.required) {
        sqlCommands.push(`ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" SET NOT NULL`);
      } else {
        sqlCommands.push(`ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" DROP NOT NULL`);
      }
    }

    // Default value changes query
    if (oldColumn.defaultValue !== newColumn.defaultValue) {
      if (newColumn.defaultValue === undefined) {
        sqlCommands.push(`ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" DROP DEFAULT`);
      } else {
        sqlCommands.push(
          `ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" SET ${this.formatDefaultValue(newColumn.defaultValue, newColumn.dataType)}`
        );
      }
    }

    return sqlCommands.join(";\n") + (sqlCommands.length > 0 ? ";" : "");
  }

  generateDropColumnSql(tableName: string, columnName: string): string {
    return `ALTER TABLE "public"."${tableName}" DROP COLUMN IF EXISTS "${columnName}";`;
  }

  generateCreateIndexSql(tableName: string, index: IndexDefinition): string {
    const unique = index.isUnique ? "UNIQUE " : "";
    const cols = index.columns.map(c => `"${c}"`).join(", ");
    return `CREATE ${unique}INDEX "${index.name}" ON "public"."${tableName}" (${cols});`;
  }

  generateDropIndexSql(tableName: string, indexName: string): string {
    return `DROP INDEX IF EXISTS "public"."${indexName}";`;
  }

  generateAddConstraintSql(tableName: string, constraint: ConstraintDefinition): string {
    let sql = `ALTER TABLE "public"."${tableName}" ADD CONSTRAINT "${constraint.name}"`;
    
    if (constraint.type === "UNIQUE") {
      sql += ` UNIQUE (${constraint.columns.map(c => `"${c}"`).join(", ")})`;
    } else if (constraint.type === "FOREIGN") {
      sql += ` FOREIGN KEY (${constraint.columns.map(c => `"${c}"`).join(", ")}) REFERENCES "public"."${constraint.refTable}" (${constraint.refColumns?.map(c => `"${c}"`).join(", ")}) ON DELETE CASCADE`;
    } else if (constraint.type === "CHECK" && constraint.checkExpression) {
      sql += ` CHECK (${constraint.checkExpression})`;
    } else {
      throw new Error(`Unsupported constraint type: ${constraint.type}`);
    }
    
    return sql + ";";
  }

  generateDropConstraintSql(tableName: string, constraintName: string): string {
    return `ALTER TABLE "public"."${tableName}" DROP CONSTRAINT IF EXISTS "${constraintName}";`;
  }

  generateAdvisoryLockSql(tenantId: number, moduleCode: string, entityCode: string): string {
    // Generate a stable numeric hash from the scoped key
    const scopedKey = `${tenantId}:${moduleCode.toLowerCase()}:${entityCode.toLowerCase()}`;
    let hash = 5381;
    for (let i = 0; i < scopedKey.length; i++) {
      hash = (hash * 33) ^ scopedKey.charCodeAt(i);
    }
    // Limit to PG signed 32-bit integer range
    const hash32 = Math.abs(hash) % 2147483647;
    return `SELECT pg_advisory_xact_lock(${hash32});`;
  }
}

