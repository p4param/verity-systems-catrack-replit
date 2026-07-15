/**
 * CM-003 Runtime Data Engine — Platform Query Model
 *
 * The universal query abstraction for the entire CAP platform.
 * Used by: Runtime, Reporting, Dashboards, Search, AI, REST APIs, Workflow, Scheduler.
 *
 * No consumer of PlatformQuery needs to know about SQL, Prisma, EAV,
 * or any specific database provider.
 *
 * Standards: ES-006, ES-007
 */

// ─── Filter ───────────────────────────────────────────────────────────────────

export type PlatformFilterOperator =
  | "eq"      // =
  | "neq"     // <>
  | "gt"      // >
  | "gte"     // >=
  | "lt"      // <
  | "lte"     // <=
  | "like"    // LIKE (case-sensitive)
  | "ilike"   // ILIKE (case-insensitive, Postgres)
  | "in"      // IN (...)
  | "notIn"   // NOT IN (...)
  | "between" // BETWEEN x AND y
  | "isNull"  // IS NULL
  | "isNotNull"; // IS NOT NULL

export interface PlatformFilter {
  /** Field code (maps to ColumnSpec.name via the PersistenceModel) */
  field: string;

  operator: PlatformFilterOperator;

  /** Single value — used for eq, neq, gt, gte, lt, lte, like, ilike */
  value?: any;

  /** Multiple values — used for "in", "notIn" (array), "between" (exactly 2 elements) */
  values?: any[];
}

// ─── Ordering ─────────────────────────────────────────────────────────────────

export interface PlatformOrderBy {
  field: string;
  direction: "asc" | "desc";
  nulls?: "first" | "last";
}

// ─── Lookup Inclusion ─────────────────────────────────────────────────────────

/**
 * Specifies a lookup field whose referenced value should be resolved and
 * included in the result as a label. Triggers a sub-query against the
 * referenced entity's repository (physical or EAV — transparent to caller).
 */
export interface PlatformInclude {
  /** Field code of the LOOKUP/FK field on the queried entity */
  field: string;

  /** Which column of the referenced entity to surface as the display label */
  displayField: string;

  /**
   * Alias for the resolved label in the result object.
   * Default: `${field}_label`
   */
  alias?: string;
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

export type AggregateFunction = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

export interface PlatformAggregate {
  function: AggregateFunction;
  /** Field code to aggregate */
  field: string;
  /** Result property name in the returned object */
  alias: string;
}

// ─── Platform Query ───────────────────────────────────────────────────────────

/**
 * The complete, immutable query specification.
 * Passed from any consumer into RuntimeDataEngine.query() or count().
 * Translated to SQL by SqlBuilder inside the provider layer.
 */
export interface PlatformQuery {
  /**
   * Field codes to include in the result.
   * null / undefined = all non-system columns.
   * Use sparingly — prefer full records for grid/form consumers.
   */
  select?: string[];

  /**
   * Lookup fields to resolve and include as labels.
   * Each entry triggers a secondary query against the referenced entity.
   */
  include?: PlatformInclude[];

  /** Filter predicates. Applied as AND conditions by default. */
  where?: PlatformFilter[];

  /** Ordering. Multiple entries applied in order. */
  orderBy?: PlatformOrderBy[];

  /** Pagination — number of rows to skip. */
  skip?: number;

  /** Pagination — maximum rows to return. Default: 50. */
  take?: number;

  /**
   * Whether to include soft-deleted records in results.
   * Default: false (only active records returned).
   */
  includeDeleted?: boolean;

  /**
   * Aggregation functions to compute alongside rows.
   * Future: for dashboard widgets, report summaries, KPI cards.
   */
  aggregates?: PlatformAggregate[];

  /**
   * Group result rows by these field codes.
   * Future: for reports, dashboards, charts.
   * Requires aggregates to be meaningful.
   */
  groupBy?: string[];
}
