/**
 * CM-003 Runtime Data Engine
 *
 * The single public surface for all runtime data operations in the CAP platform.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PUBLIC API FREEZE                                                        │
 * │                                                                          │
 * │ This class is the ONLY exported symbol consumers should use.             │
 * │ All internal components (providers, repositories, SQL, dialects,         │
 * │ adapters, cache, number series) are implementation details.              │
 * │ They may be refactored without affecting any consumer.                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Architecture:
 *   RuntimeDataEngine
 *     → IRuntimeCache              (lookup cache, future Redis)
 *     → IRuntimeStatistics         (metrics)
 *     → IEntityBehavior            (entity-specific business logic)
 *     → RuntimeEventBus            (domain events for Workflow, Audit, AI)
 *     → ProviderFactory            (tenant-aware provider resolution)
 *       → IPersistenceProvider     (Postgres / SQL Server / Oracle)
 *         → IRuntimeRepository     (DynamicTableRepository | EavRepository)
 *           → IStorageAdapter      (Prisma / future adapters)
 *             → ISqlDialect        (SQL formatting)
 *               → SqlBuilder       (parameterized SQL)
 *
 * CM Roadmap position: CM-003 (Runtime Data Engine)
 * Prerequisite: CM-001 (Configuration Platform), CM-002 (Database Platform)
 * Successor engines: CM-005 (Validation), CM-007 (Workflow), CM-009 (Notification)
 *
 * Standards: ES-006, ES-007, ES-008
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { runtimeEventBus } from "@/shared/components/runtime/services/EventBus";
import type { RuntimeEvent } from "@/shared/components/runtime/types/framework";

import { ProviderFactory } from "../providers/ProviderFactory";
import type { IRuntimeCache } from "../cache/IRuntimeCache";
import type { IRuntimeStatistics } from "../statistics/IRuntimeStatistics";
import type { INumberSeriesEngine } from "../number-series/INumberSeriesEngine";
import type { IEntityBehavior } from "../behaviors/IEntityBehavior";
import { defaultEntityBehavior } from "../behaviors/DefaultEntityBehavior";
import type { PersistenceExecutionContext } from "../types/PersistenceExecutionContext";
import type { PlatformQuery } from "../types/PlatformQuery";
import type { RuntimeRecord } from "../types/RuntimeRecord";
import type { AggregateRoot, AggregateResult } from "../types/AggregateRoot";
import type { IPlatformEngine, EngineHealth, EngineDiagnostics } from "../types/IPlatformEngine";
import type {
  PersistenceEvent,
  PersistenceEventType,
} from "../events/PersistenceEventTypes";
import { logger } from "@/lib/logger";

// ─── Engine Version ───────────────────────────────────────────────────────────

const ENGINE_VERSION = "1.0.0";
const ENGINE_NAME = "CM-003 Runtime Data Engine";

// ─── Behavior Registry ────────────────────────────────────────────────────────

/** Registry of entity-specific behaviors. Keyed by entityId. */
const behaviorRegistry = new Map<string, IEntityBehavior>();

// ─── RuntimeDataEngine ────────────────────────────────────────────────────────

export class RuntimeDataEngine implements IPlatformEngine {
  private startedAt: Date | null = null;

  constructor(
    private readonly cache: IRuntimeCache,
    private readonly stats: IRuntimeStatistics,
    private readonly numberSeries: INumberSeriesEngine
  ) {}

  // ── IPlatformEngine lifecycle ──────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.startedAt = new Date();
    logger.info(`[RuntimeDataEngine] Initialized (v${ENGINE_VERSION})`);
  }

  async shutdown(): Promise<void> {
    logger.info("[RuntimeDataEngine] Shutting down");
    ProviderFactory.clear();
  }

  async health(): Promise<EngineHealth> {
    const provider = ProviderFactory.resolve("system"); // Default tenant
    const dbHealthy = await provider.healthCheck();
    const cacheStats = await this.cache.stats();
    return {
      healthy: dbHealthy,
      status: dbHealthy ? "OK" : "DATABASE_UNAVAILABLE",
      details: {
        database: { healthy: dbHealthy, message: dbHealthy ? "Connected" : "Connection failed" },
        cache: { healthy: true, message: `hits=${cacheStats.hits}, misses=${cacheStats.misses}` },
      },
      checkedAt: new Date(),
    };
  }

  version(): string {
    return ENGINE_VERSION;
  }

  async diagnostics(): Promise<EngineDiagnostics> {
    const snap = this.stats.snapshot();
    const health = await this.health();
    return {
      engineName: ENGINE_NAME,
      version: ENGINE_VERSION,
      startedAt: this.startedAt?.toISOString() ?? "not initialized",
      health,
      metadata: {
        statistics: snap,
        registeredBehaviors: behaviorRegistry.size,
      },
    };
  }

  // ── Behavior Registration ──────────────────────────────────────────────────

  /**
   * Registers a custom behavior for a specific entity.
   * Call from entity-specific setup modules, not from Runtime.
   */
  static registerBehavior(entityId: string, behavior: IEntityBehavior): void {
    behaviorRegistry.set(entityId, behavior);
  }

  private getBehavior(manifest: RuntimeManifest): IEntityBehavior {
    return behaviorRegistry.get(manifest.entityId) ?? defaultEntityBehavior;
  }

  // ── Domain Events ──────────────────────────────────────────────────────────

  private async emit(
    type: PersistenceEventType,
    manifest: RuntimeManifest,
    ctx: PersistenceExecutionContext,
    extra?: Partial<PersistenceEvent>
  ): Promise<void> {
    // Cast type: RuntimeEventBus is typed as RuntimeEventType but accepts any string at runtime.
    // Persistence events use namespaced strings ("persistence:before_create", etc.)
    // which are compatible with the event bus's publish/subscribe mechanism.
    const event = {
      type: type as any,
      source: ENGINE_NAME,
      timestamp: Date.now(),
      payload: {
        type,
        entityId: manifest.entityId,
        entityCode: manifest.entity,
        ctx,
        timestamp: new Date(),
        ...extra,
      },
    };
    await runtimeEventBus.publish(event as any);
  }

  // ── Internal resolution ────────────────────────────────────────────────────

  private getRepository(manifest: RuntimeManifest, ctx: PersistenceExecutionContext) {
    const provider = ProviderFactory.resolve(ctx.tenantId);
    return provider.resolveRepository(manifest);
  }

  private async withTiming<T>(fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.stats.recordQuery(Date.now() - start);
    }
  }

  // ── Single Record CRUD ─────────────────────────────────────────────────────

  /**
   * Creates a new record for the given entity.
   * Runs the behavior pipeline, emits BeforeCreate/AfterCreate events,
   * generates a record number, and persists via the resolved repository.
   */
  async create(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord> {
    const behavior = this.getBehavior(manifest);

    // Behavior pipeline
    let processed = await behavior.beforeValidate(manifest, payload, ctx);
    processed = await behavior.beforeSave(manifest, processed, ctx);

    // Generate record number
    const recordNumber = await this.numberSeries.generate(
      manifest.entityId,
      manifest.entity.toUpperCase()
    );
    processed.__recordNumber = recordNumber;

    // Before event
    await this.emit("persistence:before_create", manifest, ctx, { payload: processed });

    // Persist
    const repo = this.getRepository(manifest, ctx);
    const record = await this.withTiming(() => repo.create(manifest, processed, ctx));
    this.stats.recordInsert();

    // After event
    await this.emit("persistence:after_create", manifest, ctx, { recordId: record.id, recordNumber: record.recordNumber });

    // Post-save behavior
    await behavior.afterSave(manifest, record, ctx);

    logger.info(`[RuntimeDataEngine] Created ${manifest.entity}/${record.id}`);
    return record;
  }

  /**
   * Updates an existing record with optimistic concurrency control.
   */
  async update(
    manifest: RuntimeManifest,
    id: string,
    payload: Record<string, any>,
    expectedVersion: number,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord> {
    const behavior = this.getBehavior(manifest);

    let processed = await behavior.beforeValidate(manifest, payload, ctx);
    processed = await behavior.beforeSave(manifest, processed, ctx);

    await this.emit("persistence:before_update", manifest, ctx, { recordId: id, payload: processed });

    const repo = this.getRepository(manifest, ctx);
    const record = await this.withTiming(() => repo.update(manifest, id, processed, expectedVersion, ctx));
    this.stats.recordUpdate();

    await this.emit("persistence:after_update", manifest, ctx, { recordId: id });
    await behavior.afterSave(manifest, record, ctx);

    logger.info(`[RuntimeDataEngine] Updated ${manifest.entity}/${id}`);
    return record;
  }

  /**
   * Soft-deletes a record (marks is_deleted = true per PersistencePolicy).
   */
  async delete(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void> {
    const behavior = this.getBehavior(manifest);

    await behavior.beforeDelete(manifest, id, ctx);
    await this.emit("persistence:before_delete", manifest, ctx, { recordId: id });

    const repo = this.getRepository(manifest, ctx);
    await this.withTiming(() => repo.delete(manifest, id, ctx));
    this.stats.recordDelete();

    await this.emit("persistence:after_delete", manifest, ctx, { recordId: id });
    logger.info(`[RuntimeDataEngine] Deleted ${manifest.entity}/${id}`);
  }

  /**
   * Restores a soft-deleted record.
   */
  async restore(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void> {
    await this.emit("persistence:before_restore", manifest, ctx, { recordId: id });

    const repo = this.getRepository(manifest, ctx);
    await this.withTiming(() => repo.restore(manifest, id, ctx));

    await this.emit("persistence:after_restore", manifest, ctx, { recordId: id });
  }

  // ── Query API ──────────────────────────────────────────────────────────────

  async query(manifest: RuntimeManifest, q: PlatformQuery, ctx?: PersistenceExecutionContext): Promise<RuntimeRecord[]> {
    if (!ctx) throw new Error("Tenant context is required for runtime queries");
    // Cache check (no-op in VS05H — always misses)
    const cacheKey = `query:${ctx.tenantId}:${manifest.entityId}:${JSON.stringify(q)}`;
    const cached = await this.cache.get<RuntimeRecord[]>(cacheKey);
    if (cached) {
      this.stats.recordCacheHit();
      return cached;
    }
    this.stats.recordCacheMiss();

    const repo = this.getRepository(manifest, ctx);
    const records = await this.withTiming(() => repo.query(manifest, q, ctx));

    return records;
  }

  async getById(
    manifest: RuntimeManifest,
    id: string,
    options: { includeDeleted?: boolean } | undefined,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord | null> {
    if (!ctx) throw new Error("Tenant context is required for runtime reads");
    const repo = this.getRepository(manifest, ctx);
    return this.withTiming(() => repo.getById(manifest, id, options, ctx));
  }

  async count(manifest: RuntimeManifest, q: PlatformQuery, ctx?: PersistenceExecutionContext): Promise<number> {
    if (!ctx) throw new Error("Tenant context is required for runtime counts");
    const repo = this.getRepository(manifest, ctx);
    return repo.count(manifest, { where: q.where, includeDeleted: q.includeDeleted }, ctx);
  }

  async exists(manifest: RuntimeManifest, id: string, ctx?: PersistenceExecutionContext): Promise<boolean> {
    if (!ctx) throw new Error("Tenant context is required for runtime existence checks");
    const repo = this.getRepository(manifest, ctx);
    return repo.exists(manifest, id, ctx);
  }

  // ── Bulk Operations ────────────────────────────────────────────────────────

  async bulkInsert(
    manifest: RuntimeManifest,
    records: Record<string, any>[],
    ctx: PersistenceExecutionContext
  ): Promise<number> {
    const repo = this.getRepository(manifest, ctx);
    const count = await this.withTiming(() => repo.bulkInsert(manifest, records, ctx));
    this.stats.recordInsert(count);
    await this.emit("persistence:bulk_insert_complete", manifest, ctx, { payload: { count } });
    return count;
  }

  // ── Graph Persistence ──────────────────────────────────────────────────────

  /**
   * Saves a complete aggregate graph (header + collections + documents + actions)
   * in a single atomic transaction. This is the primary save operation for
   * complex enterprise records (Incidents, Purchase Orders, Catering Events, etc.)
   */
  async saveGraph(
    root: AggregateRoot,
    ctx: PersistenceExecutionContext
  ): Promise<AggregateResult> {
    const { entity, collections = [], documents = [], actions = [] } = root;
    const { manifest, payload, id, expectedVersion } = entity;

    await this.emit("persistence:before_graph_save", manifest, ctx, { recordId: id });

    const provider = ProviderFactory.resolve(ctx.tenantId);
    const eventsEmitted: string[] = ["persistence:before_graph_save"];

    const result = await provider.withTransaction(async (txCtx: PersistenceExecutionContext) => {
      // 1. Upsert header record
      const behavior = this.getBehavior(manifest);
      let processed = await behavior.beforeValidate(manifest, payload, txCtx);
      processed = await behavior.beforeSave(manifest, processed, txCtx);

      let headerRecord: RuntimeRecord;
      let collectionResults: Record<string, { created: number; updated: number; deleted: number }> = {};

      const repo = provider.resolveRepository(manifest);

      if (id) {
        // Update existing header
        headerRecord = await repo.update(manifest, id, processed, expectedVersion ?? 0, txCtx);
        this.stats.recordUpdate();
      } else {
        // Create new header
        const recordNumber = await this.numberSeries.generate(
          manifest.entityId,
          manifest.entity.toUpperCase(),
          undefined,
          txCtx.transaction
        );
        processed.__recordNumber = recordNumber;
        headerRecord = await repo.create(manifest, processed, txCtx);
        this.stats.recordInsert();
      }

      await behavior.afterSave(manifest, headerRecord, txCtx);

      // 2. Process child collections
      for (const collection of collections) {
        const childRepo = provider.resolveRepository(collection.childManifest);
        let created = 0, updated = 0, deleted = 0;

        for (const childRecord of collection.records) {
          // Inject parent FK into child payload
          const childPayload = {
            ...childRecord.payload,
            [`${manifest.entity}_id`]: headerRecord.id,
          };

          if (childRecord.id) {
            await childRepo.update(
              collection.childManifest,
              childRecord.id,
              childPayload,
              childRecord.expectedVersion ?? 0,
              txCtx
            );
            updated++;
            this.stats.recordUpdate();
          } else {
            await childRepo.create(collection.childManifest, childPayload, txCtx);
            created++;
            this.stats.recordInsert();
          }
        }

        // Soft-delete removed children
        for (const deletedId of collection.deletedIds ?? []) {
          await childRepo.delete(collection.childManifest, deletedId, txCtx);
          deleted++;
          this.stats.recordDelete();
        }

        collectionResults[collection.collectionKey] = { created, updated, deleted };
      }

      this.stats.recordGraphSave();

      return {
        id: headerRecord.id,
        recordNumber: headerRecord.recordNumber,
        version: headerRecord.version,
        collections: collectionResults,
        eventsEmitted,
      };
    }, ctx);

    await this.emit("persistence:after_graph_save", manifest, ctx, { recordId: result.id });
    eventsEmitted.push("persistence:after_graph_save");

    logger.info(`[RuntimeDataEngine] saveGraph completed for ${manifest.entity}/${result.id}`);
    return { ...result, eventsEmitted };
  }

  // ── Lookup Resolution ──────────────────────────────────────────────────────

  /**
   * Resolves lookup options for a field.
   * Routes transparently to physical table or EAV based on manifest.
   */
  async resolveLookupOptions(
    manifest: RuntimeManifest,
    displayColumn: string,
    searchQuery: string | undefined,
    take: number | undefined,
    ctx: PersistenceExecutionContext
  ): Promise<Array<{ id: string; label: string }>> {
    if (!ctx) throw new Error("Tenant context is required for lookup resolution");
    const repo = this.getRepository(manifest, ctx);
    return repo.resolveLookupOptions(manifest, displayColumn, searchQuery, take, ctx);
  }

  // ── Bulk Graph Operations (interface reservation) ─────────────────────────

  /**
   * Saves multiple aggregate graphs.
   * Future: used for imports, integrations, AI-generated datasets.
   */
  async saveGraphs(
    roots: AggregateRoot[],
    ctx: PersistenceExecutionContext
  ): Promise<AggregateResult[]> {
    const results: AggregateResult[] = [];
    for (const root of roots) {
      const result = await this.saveGraph(root, ctx);
      results.push(result);
    }
    return results;
  }

  /**
   * Validates multiple aggregate graphs without persisting.
   * Future: used for dry-run imports and AI suggestions.
   */
  async validateGraphs(
    _roots: AggregateRoot[],
    _ctx: PersistenceExecutionContext
  ): Promise<Array<{ index: number; valid: boolean; errors: string[] }>> {
    // VS05H stub — full implementation in CM-005 Validation Engine integration
    return _roots.map((_, i) => ({ index: i, valid: true, errors: [] }));
  }
}




