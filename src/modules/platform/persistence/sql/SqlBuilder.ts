/**
 * CM-003 Runtime Data Engine — SQL Builder
 *
 * Produces fully parameterized SQL commands from PersistenceModel + PlatformQuery.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SECURITY CONTRACT                                                        │
 * │                                                                          │
 * │ Table names  → from PersistenceTable (TRUSTED MANIFEST IDENTIFIER)       │
 * │ Column names → from ColumnSpec       (TRUSTED MANIFEST IDENTIFIER)       │
 * │ User values  → ALWAYS positional parameters ($1, $2, ...)                │
 * │                NEVER concatenated into the SQL string                    │
 * │                                                                          │
 * │ This class must never receive business entity names, field codes from    │
 * │ user input, or any string that has not been sourced from the published   │
 * │ RuntimeManifest → PersistenceModel → PersistenceTable → ColumnSpec.     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Standards: ES-006, ES-007
 */
import type { ISqlDialect } from "./ISqlDialect";
import type { PersistenceTable, ColumnSpec, PersistencePolicy } from "../types/PersistenceModel";
import type { PlatformQuery, PlatformFilter } from "../types/PlatformQuery";

// ─── Output Type ──────────────────────────────────────────────────────────────

/** A fully parameterized SQL statement ready for $queryRawUnsafe / $executeRawUnsafe. */
export interface SqlCommand {
  /** SQL string with $1, $2, … placeholders for user values. */
  sql: string;
  /** Parameter values in positional order. NEVER concatenated into sql. */
  params: any[];
}

// ─── SQL Builder ──────────────────────────────────────────────────────────────

export class SqlBuilder {

  // ── INSERT ─────────────────────────────────────────────────────────────────

  /**
   * Builds an INSERT statement for one record.
   * All column values are positional parameters — never concatenated.
   *
   * @param table    TRUSTED: from PersistenceModel.tables[0]
   * @param valueMap Map of colName → value for non-system columns + system-set values
   * @param dialect  SQL dialect for identifier quoting and parameter formatting
   */
  static buildInsert(
    table: PersistenceTable,
    valueMap: Map<string, any>,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const cols: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [col, val] of valueMap.entries()) {
      cols.push(dialect.identifier(col)); // TRUSTED MANIFEST IDENTIFIER
      params.push(val);                   // USER/SYSTEM VALUE → positional param
      paramIndex++;
    }

    const colList = cols.join(", ");
    const paramList = Array.from({ length: params.length }, (_, i) => dialect.param(i + 1)).join(", ");

    return {
      sql: `INSERT INTO ${tableRef} (${colList}) VALUES (${paramList}) RETURNING *`,
      params,
    };
  }

  // ── BULK INSERT ────────────────────────────────────────────────────────────

  /**
   * Builds a single multi-row INSERT for bulk operations.
   * Significantly more efficient than N individual INSERTs.
   */
  static buildBulkInsert(
    table: PersistenceTable,
    rows: Map<string, any>[],
    dialect: ISqlDialect
  ): SqlCommand {
    if (rows.length === 0) {
      throw new Error("SqlBuilder.buildBulkInsert: rows array must not be empty");
    }

    const tableRef = dialect.tableRef(table.schema, table.name);
    const columnNames = Array.from(rows[0].keys());
    const colList = columnNames.map(c => dialect.identifier(c)).join(", "); // TRUSTED IDENTIFIERS
    const params: any[] = [];
    const valueSets: string[] = [];
    let paramIndex = 1;

    for (const row of rows) {
      const rowParams: string[] = [];
      for (const col of columnNames) {
        params.push(row.get(col));
        rowParams.push(dialect.param(paramIndex++));
      }
      valueSets.push(`(${rowParams.join(", ")})`);
    }

    return {
      sql: `INSERT INTO ${tableRef} (${colList}) VALUES ${valueSets.join(", ")} RETURNING id`,
      params,
    };
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  /**
   * Builds an UPDATE statement with optimistic concurrency check.
   * Concurrency field name comes from PersistencePolicy — never hardcoded.
   *
   * Pattern: WHERE id = $N AND "<concurrencyField>" = $M
   * If 0 rows affected → ConcurrencyConflictError should be thrown by the repository.
   */
  static buildUpdate(
    table: PersistenceTable,
    id: string,
    expectedVersion: number,
    valueMap: Map<string, any>,
    policy: PersistencePolicy,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const params: any[] = [];
    let paramIndex = 1;

    const setClauses: string[] = [];
    for (const [col, val] of valueMap.entries()) {
      setClauses.push(`${dialect.identifier(col)} = ${dialect.param(paramIndex++)}`); // TRUSTED col
      params.push(val); // USER/SYSTEM VALUE
    }

    // Always increment row_version on update
    const versionCol = dialect.identifier(policy.concurrency.field); // TRUSTED MANIFEST IDENTIFIER
    setClauses.push(`${versionCol} = ${versionCol} + 1`);

    const idParam = dialect.param(paramIndex++);
    params.push(id); // USER VALUE → positional param

    let whereClause = `${dialect.identifier(table.columns.find(c => c.isPrimaryKey)?.name ?? "id")} = ${idParam}`;

    if (policy.concurrency.strategy !== "NONE") {
      const versionParam = dialect.param(paramIndex++);
      params.push(expectedVersion); // USER VALUE → positional param
      whereClause += ` AND ${versionCol} = ${versionParam}`;
    }

    return {
      sql: `UPDATE ${tableRef} SET ${setClauses.join(", ")} WHERE ${whereClause} RETURNING *`,
      params,
    };
  }

  // ── SOFT DELETE ────────────────────────────────────────────────────────────

  /**
   * Builds a soft-delete UPDATE.
   * Soft-delete column names come from PersistencePolicy — never hardcoded.
   */
  static buildSoftDelete(
    table: PersistenceTable,
    id: string,
    userId: string,
    policy: PersistencePolicy,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const { field, deletedAtField, deletedByField } = policy.softDelete;
    const pkCol = dialect.identifier(table.columns.find(c => c.isPrimaryKey)?.name ?? "id");

    return {
      sql: `UPDATE ${tableRef} SET ${dialect.identifier(field)} = true, ${dialect.identifier(deletedAtField)} = ${dialect.nowExpression()}, ${dialect.identifier(deletedByField)} = $1 WHERE ${pkCol} = $2 RETURNING *`,
      params: [userId, id],
    };
  }

  // ── RESTORE ────────────────────────────────────────────────────────────────

  /**
   * Builds a restore UPDATE (reverses a soft delete).
   */
  static buildRestore(
    table: PersistenceTable,
    id: string,
    policy: PersistencePolicy,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const { field, deletedAtField, deletedByField } = policy.softDelete;
    const pkCol = dialect.identifier(table.columns.find(c => c.isPrimaryKey)?.name ?? "id");

    return {
      sql: `UPDATE ${tableRef} SET ${dialect.identifier(field)} = false, ${dialect.identifier(deletedAtField)} = NULL, ${dialect.identifier(deletedByField)} = NULL WHERE ${pkCol} = $1 RETURNING *`,
      params: [id],
    };
  }

  // ── SELECT ─────────────────────────────────────────────────────────────────

  /**
   * Builds a SELECT query from a PlatformQuery.
   * All filter values are positional parameters.
   * Column names and table name are TRUSTED MANIFEST IDENTIFIERS.
   */
  static buildSelect(
    table: PersistenceTable,
    q: PlatformQuery,
    policy: PersistencePolicy,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const params: any[] = [];

    // Column selection
    const selectCols = this._resolveSelectCols(table, q.select, dialect);

    // WHERE clause
    const { clause: whereClause, params: filterParams } = this._buildWhere(
      table, q.where, q.includeDeleted, policy, dialect, 1
    );
    params.push(...filterParams);

    // ORDER BY
    const orderBy = this._buildOrderBy(q.orderBy, dialect);

    // LIMIT / OFFSET
    let paginationSql = "";
    if (q.take !== undefined) {
      paginationSql += ` LIMIT ${dialect.param(params.length + 1)}`;
      params.push(q.take);
    }
    if (q.skip !== undefined && q.skip > 0) {
      paginationSql += ` OFFSET ${dialect.param(params.length + 1)}`;
      params.push(q.skip);
    }

    return {
      sql: `SELECT ${selectCols} FROM ${tableRef}${whereClause}${orderBy}${paginationSql}`,
      params,
    };
  }

  // ── COUNT ──────────────────────────────────────────────────────────────────

  static buildCount(
    table: PersistenceTable,
    q: Pick<PlatformQuery, "where" | "includeDeleted">,
    policy: PersistencePolicy,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const { clause, params } = this._buildWhere(table, q.where, q.includeDeleted, policy, dialect, 1);
    return {
      sql: `SELECT COUNT(*)::int AS count FROM ${tableRef}${clause}`,
      params,
    };
  }

  // ── EXISTS ─────────────────────────────────────────────────────────────────

  static buildExists(
    table: PersistenceTable,
    id: string,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const pkCol = dialect.identifier(table.columns.find(c => c.isPrimaryKey)?.name ?? "id");
    return {
      sql: `SELECT EXISTS(SELECT 1 FROM ${tableRef} WHERE ${pkCol} = $1)::boolean AS exists`,
      params: [id],
    };
  }

  // ── SELECT BY ID ───────────────────────────────────────────────────────────

  static buildSelectById(
    table: PersistenceTable,
    id: string,
    includeDeleted: boolean,
    policy: PersistencePolicy,
    dialect: ISqlDialect
  ): SqlCommand {
    const tableRef = dialect.tableRef(table.schema, table.name);
    const pkCol = dialect.identifier(table.columns.find(c => c.isPrimaryKey)?.name ?? "id");
    const params: any[] = [id];

    let whereClause = `WHERE ${pkCol} = $1`;
    if (policy.softDelete.enabled && !includeDeleted) {
      whereClause += ` AND ${dialect.identifier(policy.softDelete.field)} = false`;
    }

    return {
      sql: `SELECT * FROM ${tableRef} ${whereClause}`,
      params,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private static _resolveSelectCols(
    table: PersistenceTable,
    select: string[] | undefined,
    dialect: ISqlDialect
  ): string {
    if (!select || select.length === 0) return "*";
    // Always include system columns even if not in select list
    const systemCols = table.columns.filter(c => c.isSystem).map(c => c.name);
    const allCols = [...new Set([...systemCols, ...select])];
    return allCols.map(c => dialect.identifier(c)).join(", "); // TRUSTED IDENTIFIERS
  }

  private static _buildWhere(
    table: PersistenceTable,
    filters: PlatformFilter[] | undefined,
    includeDeleted: boolean | undefined,
    policy: PersistencePolicy,
    dialect: ISqlDialect,
    startIndex: number
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let i = startIndex;

    // Soft-delete default filter
    if (policy.softDelete.enabled && !includeDeleted) {
      conditions.push(`${dialect.identifier(policy.softDelete.field)} = false`); // TRUSTED IDENTIFIER
    }

    for (const f of filters ?? []) {
      const col = dialect.identifier(f.field); // TRUSTED MANIFEST IDENTIFIER
      switch (f.operator) {
        case "eq":
          conditions.push(`${col} = ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "neq":
          conditions.push(`${col} <> ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "gt":
          conditions.push(`${col} > ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "gte":
          conditions.push(`${col} >= ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "lt":
          conditions.push(`${col} < ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "lte":
          conditions.push(`${col} <= ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "like":
          conditions.push(`${col} LIKE ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "ilike":
          conditions.push(`${col} ILIKE ${dialect.param(i++)}`);
          params.push(f.value);
          break;
        case "in":
          if (f.values && f.values.length > 0) {
            const inParams = f.values.map(() => dialect.param(i++));
            conditions.push(`${col} IN (${inParams.join(", ")})`);
            params.push(...f.values);
          }
          break;
        case "notIn":
          if (f.values && f.values.length > 0) {
            const notInParams = f.values.map(() => dialect.param(i++));
            conditions.push(`${col} NOT IN (${notInParams.join(", ")})`);
            params.push(...f.values);
          }
          break;
        case "between":
          if (f.values && f.values.length === 2) {
            conditions.push(`${col} BETWEEN ${dialect.param(i++)} AND ${dialect.param(i++)}`);
            params.push(f.values[0], f.values[1]);
          }
          break;
        case "isNull":
          conditions.push(`${col} IS NULL`);
          break;
        case "isNotNull":
          conditions.push(`${col} IS NOT NULL`);
          break;
      }
    }

    const clause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    return { clause, params };
  }

  private static _buildOrderBy(
    orderBy: PlatformQuery["orderBy"],
    dialect: ISqlDialect
  ): string {
    if (!orderBy || orderBy.length === 0) return "";
    const parts = orderBy.map(o => {
      const col = dialect.identifier(o.field); // TRUSTED MANIFEST IDENTIFIER
      const dir = o.direction === "desc" ? "DESC" : "ASC";
      const nulls = o.nulls ? ` NULLS ${o.nulls === "first" ? "FIRST" : "LAST"}` : "";
      return `${col} ${dir}${nulls}`;
    });
    return ` ORDER BY ${parts.join(", ")}`;
  }
}
