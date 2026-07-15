/**
 * CM-003 Runtime Data Engine — No-Op Runtime Cache
 *
 * VS05H stub: all operations pass through with no caching.
 * Injected into RuntimeDataEngine at startup.
 * Replace with RedisRuntimeCache or InMemoryRuntimeCache in future milestones.
 *
 * Standards: ES-008
 */
import type { IRuntimeCache } from "./IRuntimeCache";

export class NoOpRuntimeCache implements IRuntimeCache {
  private hits = 0;
  private misses = 0;

  async get<T>(_key: string): Promise<T | null> {
    this.misses++;
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  async invalidate(_key: string): Promise<void> {
    // No-op
  }

  async invalidatePattern(_pattern: string): Promise<void> {
    // No-op
  }

  async stats(): Promise<{ hits: number; misses: number; keys: number }> {
    return { hits: this.hits, misses: this.misses, keys: 0 };
  }
}
