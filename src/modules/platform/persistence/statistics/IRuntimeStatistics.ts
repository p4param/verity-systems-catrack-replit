/**
 * CM-003 Runtime Data Engine — Runtime Statistics Interface
 *
 * Exposes operational metrics for diagnostics, dashboards, and performance tuning.
 * Collected by RuntimeDataEngine and surfaced via IPlatformEngine.diagnostics().
 *
 * VS05H: AtomicRuntimeStatistics is a simple in-memory counter implementation.
 * Future: Feed into OpenTelemetry, Prometheus, or Azure Monitor.
 *
 * Standards: ES-008, CF-005
 */

export interface RuntimeStatisticsSnapshot {
  /** Total queries executed since engine start. */
  queryCount: number;

  /** Total cache hits (IRuntimeCache.get() returned non-null). */
  cacheHits: number;

  /** Total cache misses (IRuntimeCache.get() returned null). */
  cacheMisses: number;

  /** Total rows inserted across all entities. */
  rowsInserted: number;

  /** Total rows updated across all entities. */
  rowsUpdated: number;

  /** Total rows soft-deleted across all entities. */
  rowsDeleted: number;

  /** Total graphs saved via saveGraph(). */
  graphsSaved: number;

  /** Average query execution time in milliseconds. */
  avgQueryMs: number;

  /** Number of queries that exceeded the slow query threshold (default: 500ms). */
  slowQueryCount: number;

  /** Engine start time. */
  startedAt: Date;

  /** Snapshot timestamp. */
  snapshotAt: Date;
}

export interface IRuntimeStatistics {
  /** Increments query counter and records execution time. */
  recordQuery(durationMs: number): void;

  /** Records a cache hit. */
  recordCacheHit(): void;

  /** Records a cache miss. */
  recordCacheMiss(): void;

  /** Records a row insert. */
  recordInsert(rowCount?: number): void;

  /** Records a row update. */
  recordUpdate(rowCount?: number): void;

  /** Records a soft delete. */
  recordDelete(): void;

  /** Records a graph save. */
  recordGraphSave(): void;

  /** Returns a point-in-time snapshot of all counters. */
  snapshot(): RuntimeStatisticsSnapshot;

  /** Resets all counters (used in testing). */
  reset(): void;
}
