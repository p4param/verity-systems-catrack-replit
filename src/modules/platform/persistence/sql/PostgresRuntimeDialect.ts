/**
 * CM-003 Runtime Data Engine — PostgreSQL Runtime Dialect
 *
 * Implements ISqlDialect for PostgreSQL.
 * Used by SqlBuilder to produce Postgres-compatible parameterized SQL.
 *
 * Standards: ES-006, ES-007
 */
import { randomUUID } from "crypto";
import type { ISqlDialect } from "./ISqlDialect";

export class PostgresRuntimeDialect implements ISqlDialect {
  /**
   * Wraps an identifier in double quotes for PostgreSQL.
   * SECURITY: Only trusted manifest identifiers should be passed here.
   *
   * Escapes embedded double-quotes by doubling them (SQL standard).
   * Example: identifier('my"col') → `"my""col"`
   */
  identifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  /**
   * Returns schema-qualified table reference.
   * Example: tableRef("public", "hr_department") → `"public"."hr_department"`
   */
  tableRef(schema: string, name: string): string {
    return `${this.identifier(schema)}.${this.identifier(name)}`;
  }

  /**
   * Maps CAP logical data types to PostgreSQL SQL types.
   */
  mapDataType(dataType: string, length?: number): string {
    switch (dataType.toUpperCase()) {
      case "STRING":
        return length ? `VARCHAR(${length})` : "VARCHAR(255)";
      case "TEXT":
        return "TEXT";
      case "INTEGER":
      case "NUMBER":
        return "INTEGER";
      case "BIGINT":
        return "BIGINT";
      case "DECIMAL":
        return `NUMERIC(${length ?? 18}, 6)`;
      case "BOOLEAN":
        return "BOOLEAN";
      case "DATE":
        return "DATE";
      case "DATETIME":
        return "TIMESTAMP WITH TIME ZONE";
      case "UUID":
      case "REFERENCE":
        return "UUID";
      case "JSON":
        return "JSONB";
      case "BLOB":
        return "BYTEA";
      default:
        return "TEXT";
    }
  }

  /**
   * Generates a new UUID (client-side for consistency with Prisma default).
   */
  newId(): string {
    return randomUUID();
  }

  /**
   * PostgreSQL current timestamp expression.
   */
  nowExpression(): string {
    return "CURRENT_TIMESTAMP";
  }

  /**
   * PostgreSQL positional parameter placeholder ($1, $2, ...).
   * Index is 1-based.
   */
  param(index: number): string {
    return `$${index}`;
  }
}

/** Singleton instance for use throughout the Postgres provider. */
export const postgresRuntimeDialect = new PostgresRuntimeDialect();
