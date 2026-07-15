/**
 * CM-003 Runtime Data Engine — SQL Dialect Interface
 *
 * Provides database-specific formatting helpers consumed by SqlBuilder.
 * Implementations: PostgresRuntimeDialect (VS05H)
 * Future: SqlServerDialect, OracleDialect, MySqlDialect
 *
 * Standards: ES-006, ES-007
 */

export interface ISqlDialect {
  /**
   * Wraps a table or column name as a safely-quoted identifier.
   * Postgres: "name" → `"name"`
   * SQL Server: "name" → `[name]`
   * Oracle: "name" → `"name"`
   *
   * SECURITY: Only platform-owned manifest identifiers should be passed here.
   * Never pass user-supplied strings to this method.
   */
  identifier(name: string): string;

  /**
   * Formats a schema-qualified table reference.
   * Example: schema="public", name="hr_department" → `"public"."hr_department"`
   */
  tableRef(schema: string, name: string): string;

  /**
   * Maps a CAP logical data type to this dialect's SQL type string.
   * Example (Postgres): "STRING" → "VARCHAR(255)", "UUID" → "UUID", "DECIMAL" → "NUMERIC(18,6)"
   */
  mapDataType(dataType: string, length?: number): string;

  /**
   * Generates a new UUID value.
   * Postgres: crypto.randomUUID() (client-side) or gen_random_uuid() (server-side)
   * Implementation may choose either approach.
   */
  newId(): string;

  /**
   * Returns the SQL expression for the current timestamp.
   * Postgres: "CURRENT_TIMESTAMP"
   * SQL Server: "GETUTCDATE()"
   * Oracle: "SYSTIMESTAMP"
   */
  nowExpression(): string;

  /**
   * Formats a positional parameter placeholder.
   * Postgres: $1, $2, ...
   * SQL Server: @p1, @p2, ...
   * Oracle: :1, :2, ...
   */
  param(index: number): string;
}
