/**
 * CM-003 Runtime Data Engine — Runtime Cache Interface
 *
 * Interface reservation for future caching layer.
 *
 * VS05H: NoOpRuntimeCache (all operations are pass-through, no caching)
 * Future milestones: RedisRuntimeCache, InMemoryRuntimeCache
 *
 * Caching candidates:
 *   - RuntimeManifest objects (invalidated on Publish)
 *   - Lookup option lists (reference data, rarely changing)
 *   - Permission sets (per user per entity)
 *   - Platform settings and configuration
 *   - Dropdown / selection lists
 *   - Computed field results
 *
 * Cache key convention:
 *   manifest:{entityId}           → RuntimeManifest
 *   lookup:{entityId}:{fieldCode} → lookup options list
 *   perms:{userId}:{entityId}     → permission set
 *   settings:{tenantId}           → tenant settings
 *
 * Standards: ES-008
 */

export interface IRuntimeCache {
  /**
   * Retrieves a cached value by key.
   * Returns null if the key does not exist or has expired.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value under a key with an optional TTL.
   * @param key          Cache key (use defined conventions above)
   * @param value        Serializable value to cache
   * @param ttlSeconds   Time-to-live in seconds. Default: implementation-defined.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Removes a specific key from the cache.
   */
  invalidate(key: string): Promise<void>;

  /**
   * Removes all keys matching a pattern.
   * Example: invalidatePattern("manifest:*") clears all manifest caches.
   * Note: Pattern support is implementation-specific.
   */
  invalidatePattern(pattern: string): Promise<void>;

  /**
   * Returns basic cache statistics.
   * Used by IPlatformEngine.diagnostics().
   */
  stats(): Promise<{ hits: number; misses: number; keys: number }>;
}
