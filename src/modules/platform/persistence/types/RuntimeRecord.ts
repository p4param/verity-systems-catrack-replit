/**
 * CM-003 Runtime Data Engine — Runtime Record
 *
 * The standard flattened record returned by all repository and engine methods.
 * Every field is surfaced as a flat key-value pair using the field's logical code.
 *
 * Standards: ES-006
 */

// ─── Runtime Metadata Stamp ───────────────────────────────────────────────────

/**
 * Lightweight metadata attached to every record returned by RuntimeDataEngine.
 * Invaluable for diagnosing production issues across deployed versions.
 */
export interface RuntimeRecordMeta {
  /** Version of the RuntimeManifest used when the record was fetched. */
  manifestVersion: number;

  /** Version identifier of the CM-003 RuntimeDataEngine. */
  engineVersion: string;

  /** Active persistence provider code. */
  provider: "POSTGRES" | "SQLSERVER" | "ORACLE" | "MYSQL" | "COSMOS" | string;

  /** Storage mode used for this entity's data. */
  storageMode: "PHYSICAL" | "EAV";
}

// ─── Runtime Record ───────────────────────────────────────────────────────────

/**
 * The universal flattened record shape.
 *
 * System fields (id, recordNumber, status, version, timestamps) are always present.
 * Business fields are keyed by their logical field code (e.g., "NAME", "REG_NO").
 * Resolved lookup labels appear as `${fieldCode}_label`.
 *
 * Example for Vehicle entity:
 * {
 *   id: "uuid",
 *   recordNumber: "LAU-000001",
 *   version: 3,
 *   REG_NO: "KL-01-AB-1234",
 *   TYPE: "uuid-of-vehicle-type",
 *   TYPE_label: "SUV",
 *   EMISSION: "BS6",
 *   createdAt: Date,
 *   updatedAt: Date,
 *   __runtime: { manifestVersion: 1, engineVersion: "1.0.0", provider: "POSTGRES", storageMode: "PHYSICAL" }
 * }
 */
export interface RuntimeRecord {
  /** Physical record UUID */
  id: string;

  /** Human-readable record identifier (e.g., "DEP-000001", "INC-2026-000034") */
  recordNumber: string;

  /** Record lifecycle status (e.g., "ACTIVE", "DRAFT", "ARCHIVED") */
  status: string;

  /** Optimistic concurrency version counter */
  version: number;

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;

  /** Business field values — keyed by logical field code */
  [fieldCode: string]: any;

  /**
   * Engine metadata stamp.
   * Attached by RuntimeDataEngine after every fetch.
   * Stripped before sending to client if configured (future: configurable).
   */
  __runtime: RuntimeRecordMeta;
}
