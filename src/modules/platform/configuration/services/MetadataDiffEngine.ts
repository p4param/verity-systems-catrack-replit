import { 
  SchemaManifest, 
  MetadataDiff, 
  TableDiff, 
  ColumnChange, 
  IndexChange, 
  ConstraintChange, 
  TableSchemaObject,
  ColumnDefinition,
  IndexDefinition,
  ConstraintDefinition
} from "./SchemaPlatformTypes";

export class MetadataDiffEngine {
  /**
   * Compares the previous schema manifest against the current schema manifest to generate a structural diff.
   */
  static diff(previous: SchemaManifest | null, current: SchemaManifest): MetadataDiff {
    const tableDiffs: TableDiff[] = [];

    // Map tables by name
    const prevTables = new Map<string, TableSchemaObject>();
    if (previous) {
      previous.tables.forEach(t => prevTables.set(t.name.toLowerCase(), t));
    }

    const currTables = new Map<string, TableSchemaObject>();
    current.tables.forEach(t => currTables.set(t.name.toLowerCase(), t));

    // 1. Process Created & Modified Tables
    for (const [tableName, currTable] of currTables.entries()) {
      const prevTable = prevTables.get(tableName);

      if (!prevTable) {
        // Table Created
        const columnChanges = currTable.columns.map(col => ({
          name: col.name,
          type: "ADDED" as const,
          newColumn: col,
        }));

        const indexChanges = currTable.indexes.map(idx => ({
          name: idx.name,
          type: "ADDED" as const,
          newIndex: idx,
        }));

        const constraintChanges = currTable.constraints.map(cons => ({
          name: cons.name,
          type: "ADDED" as const,
          newConstraint: cons,
        }));

        tableDiffs.push({
          tableName: currTable.name,
          type: "CREATED",
          columnChanges,
          indexChanges,
          constraintChanges,
        });
      } else {
        // Table Modified - run detailed columns, indexes, and constraints diffs
        const columnChanges = this.diffColumns(prevTable.columns, currTable.columns);
        const indexChanges = this.diffIndexes(prevTable.indexes, currTable.indexes);
        const constraintChanges = this.diffConstraints(prevTable.constraints, currTable.constraints);

        if (columnChanges.length > 0 || indexChanges.length > 0 || constraintChanges.length > 0) {
          tableDiffs.push({
            tableName: currTable.name,
            type: "MODIFIED",
            columnChanges,
            indexChanges,
            constraintChanges,
          });
        }
      }
    }

    // 2. Process Removed Tables
    for (const [tableName, prevTable] of prevTables.entries()) {
      if (!currTables.has(tableName)) {
        const columnChanges = prevTable.columns.map(col => ({
          name: col.name,
          type: "REMOVED" as const,
          oldColumn: col,
        }));

        const indexChanges = prevTable.indexes.map(idx => ({
          name: idx.name,
          type: "REMOVED" as const,
          oldIndex: idx,
        }));

        const constraintChanges = prevTable.constraints.map(cons => ({
          name: cons.name,
          type: "REMOVED" as const,
          oldConstraint: cons,
        }));

        tableDiffs.push({
          tableName: prevTable.name,
          type: "REMOVED",
          columnChanges,
          indexChanges,
          constraintChanges,
        });
      }
    }

    return {
      entityId: current.entityId,
      tableDiffs,
    };
  }

  /**
   * Compares columns lists.
   */
  private static diffColumns(prevCols: ColumnDefinition[], currCols: ColumnDefinition[]): ColumnChange[] {
    const changes: ColumnChange[] = [];
    const prevMap = new Map<string, ColumnDefinition>();
    prevCols.forEach(c => prevMap.set(c.name.toLowerCase(), c));

    const currMap = new Map<string, ColumnDefinition>();
    currCols.forEach(c => currMap.set(c.name.toLowerCase(), c));

    // Check for added/modified columns
    for (const [colName, currCol] of currMap.entries()) {
      const prevCol = prevMap.get(colName);
      if (!prevCol) {
        changes.push({
          name: currCol.name,
          type: "ADDED",
          newColumn: currCol,
        });
      } else {
        // Compare columns parameters
        const isModified = 
          prevCol.dataType !== currCol.dataType ||
          prevCol.length !== currCol.length ||
          prevCol.required !== currCol.required ||
          prevCol.defaultValue !== currCol.defaultValue ||
          prevCol.isGenerated !== currCol.isGenerated ||
          prevCol.generationExpression !== currCol.generationExpression;

        if (isModified) {
          changes.push({
            name: currCol.name,
            type: "MODIFIED",
            oldColumn: prevCol,
            newColumn: currCol,
          });
        }
      }
    }

    // Check for removed columns
    for (const [colName, prevCol] of prevMap.entries()) {
      if (!currMap.has(colName)) {
        changes.push({
          name: prevCol.name,
          type: "REMOVED",
          oldColumn: prevCol,
        });
      }
    }

    return changes;
  }

  /**
   * Compares indexes lists.
   */
  private static diffIndexes(prevIdxs: IndexDefinition[], currIdxs: IndexDefinition[]): IndexChange[] {
    const changes: IndexChange[] = [];
    const prevMap = new Map<string, IndexDefinition>();
    prevIdxs.forEach(i => prevMap.set(i.name.toLowerCase(), i));

    const currMap = new Map<string, IndexDefinition>();
    currIdxs.forEach(i => currMap.set(i.name.toLowerCase(), i));

    for (const [idxName, currIdx] of currMap.entries()) {
      const prevIdx = prevMap.get(idxName);
      if (!prevIdx) {
        changes.push({
          name: currIdx.name,
          type: "ADDED",
          newIndex: currIdx,
        });
      }
    }

    for (const [idxName, prevIdx] of prevMap.entries()) {
      if (!currMap.has(idxName)) {
        changes.push({
          name: prevIdx.name,
          type: "REMOVED",
          oldIndex: prevIdx,
        });
      }
    }

    return changes;
  }

  /**
   * Compares constraints lists.
   */
  private static diffConstraints(prevCons: ConstraintDefinition[], currCons: ConstraintDefinition[]): ConstraintChange[] {
    const changes: ConstraintChange[] = [];
    const prevMap = new Map<string, ConstraintDefinition>();
    prevCons.forEach(c => prevMap.set(c.name.toLowerCase(), c));

    const currMap = new Map<string, ConstraintDefinition>();
    currCons.forEach(c => currMap.set(c.name.toLowerCase(), c));

    for (const [consName, currConsVal] of currMap.entries()) {
      const prevConsVal = prevMap.get(consName);
      if (!prevConsVal) {
        changes.push({
          name: currConsVal.name,
          type: "ADDED",
          newConstraint: currConsVal,
        });
      }
    }

    for (const [consName, prevConsVal] of prevMap.entries()) {
      if (!currMap.has(consName)) {
        changes.push({
          name: prevConsVal.name,
          type: "REMOVED",
          oldConstraint: prevConsVal,
        });
      }
    }

    return changes;
  }

  /**
   * Analyzes the diff structure and flags any destructive operations (e.g. column drop, type shrinking).
   */
  static validateSafety(diff: MetadataDiff): { isSafe: boolean; unsafeReason?: string } {
    for (const tableDiff of diff.tableDiffs) {
      // 1. Table removal check
      if (tableDiff.type === "REMOVED") {
        return {
          isSafe: false,
          unsafeReason: `Unsafe operation: dropping physical table "${tableDiff.tableName}" is forbidden.`,
        };
      }

      // 2. Column checks
      for (const colChange of tableDiff.columnChanges) {
        if (colChange.type === "REMOVED") {
          return {
            isSafe: false,
            unsafeReason: `Unsafe operation: dropping column "${colChange.name}" on table "${tableDiff.tableName}" is forbidden.`,
          };
        }

        if (colChange.type === "MODIFIED" && colChange.oldColumn && colChange.newColumn) {
          const oldCol = colChange.oldColumn;
          const newCol = colChange.newColumn;

          // Check type changes. Only block LOSSY conversions.
          // Safe promotions (e.g. STRING → TEXT, STRING → UUID, INTEGER → BIGINT)
          // are allowed because no existing data is truncated or invalidated.
          if (oldCol.dataType !== newCol.dataType) {
            const isSafePromotion = MetadataDiffEngine.isSafeTypePromotion(oldCol.dataType, newCol.dataType);
            if (!isSafePromotion) {
              return {
                isSafe: false,
                unsafeReason: `Unsafe operation: changing datatype of "${colChange.name}" from "${oldCol.dataType}" to "${newCol.dataType}" on table "${tableDiff.tableName}" could result in data loss.`,
              };
            }
          }

          // Check length shrinking
          if (oldCol.length !== undefined && newCol.length !== undefined && newCol.length < oldCol.length) {
            return {
              isSafe: false,
              unsafeReason: `Unsafe operation: shrinking length limit of column "${colChange.name}" from ${oldCol.length} to ${newCol.length} on table "${tableDiff.tableName}" could cause truncation errors.`,
            };
          }

          // Check nullability changes (from NULL to NOT NULL without a default)
          if (!oldCol.required && newCol.required && newCol.defaultValue === undefined) {
            return {
              isSafe: false,
              unsafeReason: `Unsafe operation: changing column "${colChange.name}" on table "${tableDiff.tableName}" to NOT NULL without providing a default value.`,
            };
          }
        }
      }

      // 3. Constraint checks (e.g. dropping foreign keys or unique constraints could affect schema references)
      for (const consChange of tableDiff.constraintChanges) {
        if (consChange.type === "REMOVED") {
          return {
            isSafe: false,
            unsafeReason: `Unsafe operation: dropping constraint "${consChange.name}" on table "${tableDiff.tableName}" requires approval.`,
          };
        }
      }
    }

    return { isSafe: true };
  }

  /**
   * Determines whether a column datatype change is a safe, lossless promotion.
   *
   * Safe promotions preserve all existing data without truncation or format errors.
   * Examples:
   *   STRING  → TEXT    (text grows: safe)
   *   STRING  → UUID    (LogicalSchemaBuilder normalizes lookup FK cols: safe when empty)
   *   INTEGER → BIGINT  (numeric widening: safe)
   *   DECIMAL → FLOAT   (precision widening: safe)
   *
   * Anything NOT in the safe set is treated as a potentially lossy, blocked change.
   */
  static isSafeTypePromotion(from: string, to: string): boolean {
    /** Map from source type → set of safe destination types */
    const SAFE_PROMOTIONS: Record<string, Set<string>> = {
      // String types — can widen to TEXT or be redeclared as UUID (FK normalization)
      STRING:   new Set(["TEXT", "UUID"]),
      VARCHAR:  new Set(["TEXT", "STRING", "UUID"]),
      // Text types — already at max width; STRING/VARCHAR would be a shrink, not safe
      TEXT:     new Set([]),
      // Integer widening
      INTEGER:  new Set(["BIGINT", "DECIMAL", "FLOAT"]),
      BIGINT:   new Set([]),
      // Decimal widening
      DECIMAL:  new Set(["FLOAT"]),
      FLOAT:    new Set([]),
      // Date/time widening — DATE can become DATETIME (adds time component)
      DATE:     new Set(["DATETIME"]),
      DATETIME: new Set([]),
      // Boolean → no safe widening
      BOOLEAN:  new Set([]),
      // UUID → no safe narrowing
      UUID:     new Set([]),
      // JSON → no safe narrowing
      JSON:     new Set([]),
    };

    const safe = SAFE_PROMOTIONS[from.toUpperCase()];
    if (!safe) return false; // Unknown type — treat as unsafe
    return safe.has(to.toUpperCase());
  }
}

