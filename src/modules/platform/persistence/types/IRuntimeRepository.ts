/**
 * CM-003 Runtime Data Engine — Repository Interface
 *
 * All persistence operations flow through this interface.
 * Implementations: DynamicTableRepository (physical tables), EavRepository (legacy EAV).
 * Consumers never reference implementations directly — they receive an IRuntimeRepository
 * from the IPersistenceProvider.
 *
 * Standards: ES-006, ES-007
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { PersistenceExecutionContext } from "./PersistenceExecutionContext";
import type { PlatformQuery } from "./PlatformQuery";
import type { RuntimeRecord } from "./RuntimeRecord";

export interface IRuntimeRepository {
  // ── Single Record CRUD ─────────────────────────────────────────────────────

  create(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord>;

  update(
    manifest: RuntimeManifest,
    id: string,
    payload: Record<string, any>,
    expectedVersion: number,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord>;

  delete(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void>;

  restore(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void>;

  // ── Queries ────────────────────────────────────────────────────────────────

  getById(
    manifest: RuntimeManifest,
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<RuntimeRecord | null>;

  query(
    manifest: RuntimeManifest,
    q: PlatformQuery
  ): Promise<RuntimeRecord[]>;

  count(
    manifest: RuntimeManifest,
    q: Pick<PlatformQuery, "where" | "includeDeleted">
  ): Promise<number>;

  exists(
    manifest: RuntimeManifest,
    id: string
  ): Promise<boolean>;

  // ── Bulk Operations ────────────────────────────────────────────────────────

  bulkInsert(
    manifest: RuntimeManifest,
    records: Record<string, any>[],
    ctx: PersistenceExecutionContext
  ): Promise<number>;

  bulkUpdate(
    manifest: RuntimeManifest,
    updates: Array<{
      id: string;
      payload: Record<string, any>;
      expectedVersion: number;
    }>,
    ctx: PersistenceExecutionContext
  ): Promise<number>;

  // ── Lookup Resolution ──────────────────────────────────────────────────────

  resolveLookupOptions(
    manifest: RuntimeManifest,
    displayColumn: string,
    searchQuery?: string,
    take?: number
  ): Promise<Array<{ id: string; label: string }>>;
}
