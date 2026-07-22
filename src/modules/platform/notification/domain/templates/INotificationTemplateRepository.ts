// VS09 EWP-001: INotificationTemplateRepository contract
// Clean repository interface governing all persistence operations for the
// NotificationTemplate aggregate. Implementations must enforce:
//   - Tenant isolation (tenantId filter on every query)
//   - Soft-delete filtering (isDeleted = false on every read)
//   - Optimistic Concurrency Control on every write
//
// Per AG-001 §8: Repositories persist Aggregates and contain zero business logic.

import type { NotificationTemplate } from './NotificationTemplate';

export interface INotificationTemplateRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  /**
   * Persists a NotificationTemplate aggregate.
   * Inserts when version = 1n (new record).
   * Updates with OCC when version > 1n (existing record).
   * Throws TemplateConcurrencyError on version mismatch.
   * Throws DuplicateTemplateVersionError on business key collision.
   */
  save(template: NotificationTemplate): Promise<void>;

  /**
   * Soft-deletes a template by id within the specified tenant.
   * Sets isDeleted = true and increments version.
   */
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  /**
   * Finds a template by surrogate id, scoped to the tenant.
   * Returns null when not found or soft-deleted.
   */
  findById(id: string, tenantId: string): Promise<NotificationTemplate | null>;

  /**
   * Finds a template by business code, optionally pinned to a specific version.
   * When version is omitted, returns the most recently stored match.
   * Returns null when not found or soft-deleted.
   */
  findByCode(
    tenantId:     string,
    templateCode: string,
    version?:     string
  ): Promise<NotificationTemplate | null>;

  /**
   * Finds the latest PUBLISHED version of a template code within the tenant.
   * Returns null when no published version exists.
   */
  findLatestPublishedVersion(
    tenantId:     string,
    templateCode: string
  ): Promise<NotificationTemplate | null>;

  /**
   * Finds the parent template of a versioned template.
   * Returns null when no parent exists or parent is soft-deleted.
   */
  findParentTemplate(
    parentTemplateId: string,
    tenantId:         string
  ): Promise<NotificationTemplate | null>;

  /**
   * Lists all PUBLISHED templates for the tenant, optionally filtered by category.
   * Results are ordered by (templateCode ASC, templateVersion DESC).
   */
  listPublished(
    tenantId:  string,
    category?: string
  ): Promise<NotificationTemplate[]>;

  /**
   * Lists all templates for the tenant that support a specific delivery channel.
   * Optionally filtered by status; defaults to PUBLISHED only.
   * Results are ordered by (templateCode ASC, templateVersion DESC).
   */
  listByChannel(
    tenantId: string,
    channel:  string,
    status?:  string
  ): Promise<NotificationTemplate[]>;

  /**
   * Lists all templates for the tenant that support a specific language code.
   * Returns only PUBLISHED templates.
   * Results are ordered by (templateCode ASC, templateVersion DESC).
   */
  listByLanguage(
    tenantId:     string,
    languageCode: string
  ): Promise<NotificationTemplate[]>;
}
