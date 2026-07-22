// VS09 EWP-002: INotificationChannelRepository contract
// Clean repository interface governing all persistence operations for the
// NotificationChannel aggregate. Implementations must enforce:
//   - Tenant isolation (tenantId filter on every query)
//   - Soft-delete filtering (isDeleted = false on every read)
//   - Optimistic Concurrency Control on every write

import { NotificationChannel } from './NotificationChannel';

export interface INotificationChannelRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  /**
   * Persists a NotificationChannel aggregate.
   * Inserts when version = 1 (new record).
   * Updates with OCC when version > 1 (existing record).
   * Throws ChannelConcurrencyError on version mismatch.
   * Throws DuplicateChannelCodeError on business key collision.
   */
  save(channel: NotificationChannel): Promise<void>;

  /**
   * Unsets the isDefault flag (sets to false) on all other channels of the specified
   * channelType within the tenant, excluding the specified channel.
   * Executed within a transaction boundary at the service level (RC-003).
   */
  clearOtherDefaults(tenantId: string, channelType: string, excludeChannelId: string): Promise<void>;

  /**
   * Soft-deletes a channel by id within the specified tenant.
   */
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  /**
   * Finds a channel by surrogate id, scoped to the tenant.
   * Returns null when not found or soft-deleted.
   */
  findById(id: string, tenantId: string): Promise<NotificationChannel | null>;

  /**
   * Finds a channel by business code, scoped to the tenant.
   * Returns null when not found or soft-deleted.
   */
  findByCode(tenantId: string, channelCode: string): Promise<NotificationChannel | null>;

  /**
   * Finds the default channel for a given channelType within the tenant.
   * Returns null when no default channel is configured.
   */
  findDefaultChannel(tenantId: string, channelType: string): Promise<NotificationChannel | null>;

  /**
   * Lists all ACTIVE channels for the tenant, optionally filtered by supported template category.
   * Results are ordered by (priority DESC, channelCode ASC).
   */
  listActive(tenantId: string, category?: string): Promise<NotificationChannel[]>;

  /**
   * Lists all enabled channels for the tenant.
   * Results are ordered by (priority DESC, channelCode ASC).
   */
  listEnabled(tenantId: string): Promise<NotificationChannel[]>;

  /**
   * Lists all channels of a specific channelType within the tenant.
   */
  listByType(tenantId: string, channelType: string): Promise<NotificationChannel[]>;

  /**
   * Checks if a channel code already exists for the tenant.
   */
  existsChannelCode(tenantId: string, channelCode: string): Promise<boolean>;
}
