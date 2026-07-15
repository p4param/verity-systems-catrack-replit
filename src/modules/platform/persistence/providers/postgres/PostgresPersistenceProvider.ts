/**
 * CM-003 Runtime Data Engine — PostgreSQL Persistence Provider
 *
 * Implements IPersistenceProvider for PostgreSQL.
 * Resolves the correct IRuntimeRepository based on manifest.persistence.storageMode.
 *
 * Standards: ES-006, ES-007
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { IPersistenceProvider } from "../../types/IPersistenceProvider";
import type { IRuntimeRepository } from "../../types/IRuntimeRepository";
import type { PersistenceExecutionContext } from "../../types/PersistenceExecutionContext";
import { DynamicTableRepository } from "./DynamicTableRepository";
import { EavRepository } from "./EavRepository";
import { postgresRuntimeDialect } from "../../sql/PostgresRuntimeDialect";
import { PrismaStorageAdapter } from "../../storage/PrismaStorageAdapter";
import { prisma } from "@/lib/prisma";

export class PostgresPersistenceProvider implements IPersistenceProvider {
  private readonly dynamicRepo: DynamicTableRepository;
  private readonly eavRepo: EavRepository;

  constructor() {
    const adapter = new PrismaStorageAdapter();
    this.dynamicRepo = new DynamicTableRepository(postgresRuntimeDialect, adapter);
    this.eavRepo = new EavRepository();
  }

  /**
   * Routes to the correct repository based on manifest.persistence.storageMode.
   *
   * PHYSICAL → DynamicTableRepository (physical tables from CM-002)
   * EAV      → EavRepository (legacy entity_records / entity_values)
   *
   * This is the ONLY place where routing logic exists — invisible to all callers above.
   */
  resolveRepository(manifest: RuntimeManifest): IRuntimeRepository {
    const storageMode = manifest.persistence?.storageMode;
    if (storageMode === "PHYSICAL") {
      return this.dynamicRepo;
    }
    return this.eavRepo;
  }

  /**
   * Executes fn inside a Prisma transaction.
   * The transaction client is embedded in PersistenceExecutionContext.transaction.
   * All repository calls within fn that pass ctx will use the transaction.
   */
  async withTransaction<T>(
    fn: (ctx: PersistenceExecutionContext) => Promise<T>,
    baseCtx: PersistenceExecutionContext
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const txCtx: PersistenceExecutionContext = { ...baseCtx, transaction: tx };
      return fn(txCtx);
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
