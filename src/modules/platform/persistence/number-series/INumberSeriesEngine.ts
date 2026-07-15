/**
 * CM-004 Number Series Engine — Contract Interface
 *
 * Defines the public contract for the Number Series Engine.
 * Every record number generated in the CAP platform flows through this interface.
 *
 * VS05H provides PlatformNumberSeriesEngine as a stub implementation.
 * CM-004 will replace the stub with full formatting rules:
 *   - Branch prefixes (e.g., "DXB-INC-2026-000034")
 *   - Fiscal year sequences (e.g., "PO-FY26-000001")
 *   - Custom format expressions
 *   - Multi-segment sequences
 *   - Reservation and pre-allocation
 *
 * Used by: RuntimeDataEngine.create() and RuntimeDataEngine.saveGraph()
 *
 * Standards: ES-008
 */

export interface NumberSeriesConfig {
  /** Prefix applied to all generated numbers. Example: "DEP", "INC", "PO" */
  prefix: string;

  /** Zero-padded sequence length. Default: 6 → "000001" */
  sequenceLength?: number;

  /**
   * Future: format expression evaluated by CM-006 Expression Engine.
   * Example: "{PREFIX}-{YEAR}-{SEQ:6}"
   */
  formatExpression?: string;

  /** Future: reset sequence on each fiscal year. */
  resetOnFiscalYear?: boolean;
}

export interface INumberSeriesEngine {
  /**
   * Generates the next unique record number for an entity.
   *
   * @param entityId  UUID of the configuration entity
   * @param entityCode  Short code for prefix derivation (e.g., "DEPARTMENT", "INCIDENT")
   * @param config    Optional override; defaults come from entity manifest
   * @param tx        Optional Prisma transaction for atomic generation
   * @returns         Formatted record number (e.g., "DEP-000001", "INC-000042")
   */
  generate(
    entityId: string,
    entityCode: string,
    config?: NumberSeriesConfig,
    tx?: any
  ): Promise<string>;
}
