/**
 * CM-003 Runtime Data Engine — Computed Field Engine Interface (Reservation)
 *
 * Interface reservation for the Computed Field Engine.
 * Will evaluate metadata expressions before save and after load.
 *
 * Examples:
 *   Full Name     = FIRST_NAME + " " + LAST_NAME
 *   Available Qty = TOTAL_QTY - RESERVED_QTY
 *   Total Amount  = SUM(LINE_TOTAL)
 *   Incident Age  = NOW() - REPORTED_DATE
 *   SLA Remaining = DUE_DATE - NOW()
 *   Open Balance  = INVOICE_AMOUNT - PAID_AMOUNT
 *
 * VS05H: Not implemented — interface defined to prevent future redesign.
 * CM-006 (Expression Engine) provides the evaluation runtime.
 *
 * Standards: ES-008
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { RuntimeRecord } from "../types/RuntimeRecord";

export interface IComputedFieldEngine {
  /**
   * Evaluates computed fields before a record is saved.
   * Allows persisted computed values (e.g., denormalized aggregates).
   *
   * @param manifest   Entity manifest with field definitions and expressions
   * @param payload    Payload about to be written
   * @returns          Payload with computed field values injected
   */
  computeBeforeSave(
    manifest: RuntimeManifest,
    payload: Record<string, any>
  ): Promise<Record<string, any>>;

  /**
   * Evaluates computed fields after a record is loaded.
   * Allows runtime-only computed values (not persisted).
   *
   * @param manifest   Entity manifest
   * @param record     Loaded record
   * @returns          Record with computed field values injected
   */
  computeAfterLoad(
    manifest: RuntimeManifest,
    record: RuntimeRecord
  ): Promise<RuntimeRecord>;
}
