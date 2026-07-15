/**
 * CM-003 Runtime Data Engine — Persistence Provider Interface
 *
 * The swappable persistence provider abstraction.
 * Future implementations: PostgresPersistenceProvider, SqlServerProvider,
 * OracleProvider, CosmosProvider, OfflineProvider.
 *
 * RuntimeDataEngine only depends on this interface — never on concrete providers.
 *
 * Standards: ES-006, ES-007
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { PersistenceExecutionContext } from "./PersistenceExecutionContext";
import type { IRuntimeRepository } from "./IRuntimeRepository";

export interface IPersistenceProvider {
  /**
   * Resolves the correct repository for a given entity manifest.
   * Decision is based on manifest.persistence.storageMode:
   *   "PHYSICAL" → DynamicTableRepository
   *   "EAV"      → EavRepository
   */
  resolveRepository(manifest: RuntimeManifest): IRuntimeRepository;

  /**
   * Executes a function inside a database transaction.
   * The transaction is embedded in PersistenceExecutionContext passed to fn.
   * Commits on success, rolls back on any thrown error.
   */
  withTransaction<T>(
    fn: (ctx: PersistenceExecutionContext) => Promise<T>,
    baseCtx: PersistenceExecutionContext
  ): Promise<T>;

  /**
   * Verifies database connectivity.
   * Called by IPlatformEngine.health() and startup diagnostics.
   */
  healthCheck(): Promise<boolean>;
}
