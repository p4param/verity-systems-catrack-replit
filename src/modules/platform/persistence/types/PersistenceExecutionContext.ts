/**
 * CM-003 Runtime Data Engine — Persistence Execution Context
 *
 * Replaces raw `tx` propagation through all persistence layers.
 * Every persistence operation receives a single PersistenceExecutionContext.
 * The transaction is embedded and invisible to callers above the provider layer.
 */

// ─── Core Context ─────────────────────────────────────────────────────────────

export interface PersistenceExecutionContext {
  /** Prisma transaction client — internal to provider layer, never exposed to Runtime. */
  transaction?: any;

  /** Tenant UUID — used for tenant_id column and provider resolution. */
  tenantId: string;

  /**
   * Actor user UUID — for audit fields: created_by, updated_by, deleted_by.
   * VS05Z: User.id is now a real UUID. No coercion needed.
   */
  userId: string;

  /** Future: multi-language entity names, date/number formatting. */
  culture?: string;

  /** Future: date/time handling, SLA calculations. */
  timezone?: string;

  /** HTTP request identifier — for distributed tracing and log correlation. */
  requestId?: string;

  /** Cross-service correlation identifier — for integration and workflow tracing. */
  correlationId?: string;
}

// ─── Persistence Errors ───────────────────────────────────────────────────────

/**
 * Thrown when an optimistic locking check fails.
 * Indicates the record was modified by another user between read and write.
 */
export class ConcurrencyConflictError extends Error {
  public readonly entityId: string;
  public readonly recordId: string;
  public readonly expectedVersion: number;

  constructor(entityId: string, recordId: string, expectedVersion: number) {
    super(
      `Concurrency conflict on record "${recordId}" (entity "${entityId}"). ` +
      `Expected version ${expectedVersion} but the record has been modified. ` +
      `Please reload the record and try again.`
    );
    this.name = "ConcurrencyConflictError";
    this.entityId = entityId;
    this.recordId = recordId;
    this.expectedVersion = expectedVersion;
  }
}

/**
 * Thrown when a required record cannot be found.
 */
export class RecordNotFoundError extends Error {
  public readonly recordId: string;

  constructor(recordId: string) {
    super(`Record not found: "${recordId}"`);
    this.name = "RecordNotFoundError";
    this.recordId = recordId;
  }
}

/**
 * Thrown when a bulk operation encounters validation or constraint failures.
 */
export class BulkOperationError extends Error {
  public readonly failures: Array<{ index: number; id?: string; reason: string }>;

  constructor(failures: Array<{ index: number; id?: string; reason: string }>) {
    super(`Bulk operation failed on ${failures.length} record(s).`);
    this.name = "BulkOperationError";
    this.failures = failures;
  }
}
