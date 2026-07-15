/**
 * CM-003 Runtime Data Engine — Entity Behavior Interface (ES-008 Candidate)
 *
 * Optional behavior pipeline executed around persistence operations.
 * Allows entities to attach business calculations without embedding them in the engine.
 *
 * Examples:
 *   Incident:       calculateSeverity(), autoGenerateIncidentNumber()
 *   Purchase Order: calculateTotals(), calculateTaxes(), calculateDiscounts()
 *   Catering Event: calculateCost(), checkResourceAvailability()
 *
 * For most entities this pipeline will be empty (DefaultEntityBehavior).
 * Entity-specific behaviors are registered per entityId in the BehaviorRegistry.
 *
 * Architecture:
 *   RuntimeDataEngine
 *     → IEntityBehavior.beforeValidate(payload)
 *     → [validation engine]
 *     → IEntityBehavior.beforeSave(payload)
 *     → Repository
 *     → IEntityBehavior.afterSave(record)
 *
 * Standards: ES-008
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { PersistenceExecutionContext } from "../types/PersistenceExecutionContext";
import type { RuntimeRecord } from "../types/RuntimeRecord";

export interface IEntityBehavior {
  /**
   * Called before validation runs.
   * Use to normalize, compute derived values, or enrich the payload.
   * Returns the (potentially modified) payload.
   */
  beforeValidate(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    ctx: PersistenceExecutionContext
  ): Promise<Record<string, any>>;

  /**
   * Called after validation and before the record is written to the database.
   * Use for final computation (totals, taxes) or pre-save side effects.
   * Returns the (potentially modified) payload.
   */
  beforeSave(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    ctx: PersistenceExecutionContext
  ): Promise<Record<string, any>>;

  /**
   * Called after the record is successfully saved.
   * Use for post-save side effects (update aggregates, clear caches, etc.).
   * Cannot modify the saved record — return value is informational.
   */
  afterSave(
    manifest: RuntimeManifest,
    record: RuntimeRecord,
    ctx: PersistenceExecutionContext
  ): Promise<void>;

  /**
   * Called before a record is soft-deleted.
   * Use to validate deletion eligibility or cascade-delete related data.
   * Throw to prevent deletion.
   */
  beforeDelete(
    manifest: RuntimeManifest,
    recordId: string,
    ctx: PersistenceExecutionContext
  ): Promise<void>;
}
