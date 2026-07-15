/**
 * CM-003 Runtime Data Engine — Provider Factory
 *
 * Tenant-aware factory for resolving IPersistenceProvider instances.
 *
 * Today (VS05H): all tenants → PostgresPersistenceProvider.
 *
 * Future multi-database architecture:
 *   Tenant A → Postgres
 *   Tenant B → SQL Server
 *   Tenant C → Oracle
 *   Tenant D → Cosmos DB
 *
 * RuntimeDataEngine calls ProviderFactory.resolve(ctx.tenantId).
 * Zero Runtime changes when new providers are added.
 *
 * Standards: ES-006, ES-007
 */
import type { IPersistenceProvider } from "../types/IPersistenceProvider";
import { PostgresPersistenceProvider } from "./postgres/PostgresPersistenceProvider";

export class ProviderFactory {
  /**
   * Per-tenant provider cache.
   * Avoids creating new provider instances on every request.
   */
  private static providers = new Map<string, IPersistenceProvider>();

  /**
   * Resolves the persistence provider for a given tenant.
   *
   * Future implementation:
   *   1. Look up tenant configuration from a tenant registry
   *   2. Return the appropriate provider based on tenant.databaseProvider
   *
   * VS05H: All tenants use PostgresPersistenceProvider.
   */
  static resolve(tenantId: string): IPersistenceProvider {
    const key = `tenant:${tenantId}`;

    if (!this.providers.has(key)) {
      // Future: switch(tenantConfig.databaseProvider) { case "SQLSERVER": ...  }
      this.providers.set(key, new PostgresPersistenceProvider());
    }

    return this.providers.get(key)!;
  }

  /**
   * Invalidates the cached provider for a tenant.
   * Call when a tenant's database provider configuration changes.
   */
  static invalidate(tenantId: string): void {
    this.providers.delete(`tenant:${tenantId}`);
  }

  /**
   * Clears all cached providers.
   * Used in testing and application restart scenarios.
   */
  static clear(): void {
    this.providers.clear();
  }
}
