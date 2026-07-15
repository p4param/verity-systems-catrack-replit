/**
 * CM-003 Runtime Data Engine — In-Memory Runtime Statistics (VS05H)
 *
 * Simple atomic in-memory implementation of IRuntimeStatistics.
 * Suitable for single-process deployments.
 * Future: Replace with OpenTelemetry metrics or Redis-backed counters for cluster deployments.
 *
 * Standards: ES-008
 */
import type { IRuntimeStatistics, RuntimeStatisticsSnapshot } from "./IRuntimeStatistics";

const SLOW_QUERY_THRESHOLD_MS = 500;

export class AtomicRuntimeStatistics implements IRuntimeStatistics {
  private queryCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private rowsInserted = 0;
  private rowsUpdated = 0;
  private rowsDeleted = 0;
  private graphsSaved = 0;
  private totalQueryMs = 0;
  private slowQueryCount = 0;
  private readonly startedAt = new Date();

  recordQuery(durationMs: number): void {
    this.queryCount++;
    this.totalQueryMs += durationMs;
    if (durationMs > SLOW_QUERY_THRESHOLD_MS) this.slowQueryCount++;
  }

  recordCacheHit(): void { this.cacheHits++; }
  recordCacheMiss(): void { this.cacheMisses++; }
  recordInsert(rowCount = 1): void { this.rowsInserted += rowCount; }
  recordUpdate(rowCount = 1): void { this.rowsUpdated += rowCount; }
  recordDelete(): void { this.rowsDeleted++; }
  recordGraphSave(): void { this.graphsSaved++; }

  snapshot(): RuntimeStatisticsSnapshot {
    return {
      queryCount: this.queryCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      rowsInserted: this.rowsInserted,
      rowsUpdated: this.rowsUpdated,
      rowsDeleted: this.rowsDeleted,
      graphsSaved: this.graphsSaved,
      avgQueryMs: this.queryCount > 0 ? this.totalQueryMs / this.queryCount : 0,
      slowQueryCount: this.slowQueryCount,
      startedAt: this.startedAt,
      snapshotAt: new Date(),
    };
  }

  reset(): void {
    this.queryCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.rowsInserted = 0;
    this.rowsUpdated = 0;
    this.rowsDeleted = 0;
    this.graphsSaved = 0;
    this.totalQueryMs = 0;
    this.slowQueryCount = 0;
  }
}
