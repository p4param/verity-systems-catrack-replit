/**
 * CM-003 Runtime Data Engine — Aggregate Root
 *
 * Generic aggregate model for graph persistence.
 * Covers every enterprise record pattern without entity-specific knowledge.
 *
 * Examples:
 *   Purchase Order:  entity=header, collections=[lines, taxes], documents=[attachments], actions=[approvals]
 *   Incident:        entity=incident, collections=[observations, photos], actions=[corrective actions, workflow]
 *   Catering Event:  entity=event, collections=[menus, resources], documents=[contracts], actions=[approvals]
 *   Laundry Order:   entity=order, collections=[items], relations=[customer, supplier]
 *
 * Standards: ES-006, ES-008
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";

// ─── Aggregate Entity (Header) ────────────────────────────────────────────────

export interface AggregateEntity {
  /** The entity's runtime manifest — provides PersistenceModel, storageMode, permissions. */
  manifest: RuntimeManifest;

  /** Field values to persist. Keys are logical field codes. */
  payload: Record<string, any>;

  /**
   * Record UUID for update operations. Omit for create.
   * When set, RuntimeDataEngine performs an upsert.
   */
  id?: string;

  /**
   * Current row_version for optimistic locking on updates.
   * Required when `id` is provided. Omit for creates.
   */
  expectedVersion?: number;
}

// ─── Child Collections ────────────────────────────────────────────────────────

/**
 * A ONE-TO-MANY child record set belonging to the aggregate header.
 * Each child is a full entity record in its own physical table.
 *
 * Examples: order lines, incident observations, event menus, risk matrix rows
 */
export interface AggregateCollection {
  /**
   * Logical name identifying this collection within the aggregate.
   * Example: "orderLines", "observations", "menuItems"
   */
  collectionKey: string;

  /** The child entity's runtime manifest. */
  childManifest: RuntimeManifest;

  /**
   * Records to create or update.
   * - id absent → CREATE
   * - id present + expectedVersion present → UPDATE with optimistic lock
   * - id present + expectedVersion absent → UPSERT (no lock check)
   */
  records: Array<{
    id?: string;
    payload: Record<string, any>;
    expectedVersion?: number;
  }>;

  /**
   * UUIDs of child records to soft-delete.
   * Applied within the same transaction as the header save.
   */
  deletedIds?: string[];
}

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * Binary/document attachments linked to the aggregate.
 * VS05H: interface defined. Full implementation in CM-010 Document Engine.
 */
export interface AggregateDocument {
  /** Logical name for this attachment group. Example: "evidence", "contracts" */
  collectionKey: string;

  files: Array<{
    name: string;
    mimeType: string;
    /** Opaque storage key returned by CM-010 Document Engine. */
    storageKey: string;
    sizeBytes: number;
    metadata?: Record<string, any>;
  }>;

  /** Storage keys of documents to remove. */
  deletedKeys?: string[];
}

// ─── Relations ────────────────────────────────────────────────────────────────

/**
 * Cross-entity references that form graph edges.
 * VS05H: interface defined. Full implementation in later milestones.
 *
 * Examples: Incident → Reporter (User), PO → Supplier, Event → Venue
 */
export interface AggregateRelation {
  /** Logical relation name. Example: "reporter", "primarySupplier" */
  relationKey: string;

  /** UUID of the referenced configuration entity. */
  targetEntityId: string;

  /** UUID of the referenced physical record. */
  targetRecordId: string;

  relationType: "REFERENCES" | "LINKED_TO" | "CHILD_OF" | "APPROVED_BY";
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Workflow triggers, approval requests, notifications, webhooks.
 * VS05H: interface defined. Full implementation in CM-007 Workflow Engine / CM-009 Notification Engine.
 */
export interface AggregateAction {
  actionType:
    | "WORKFLOW_TRIGGER"
    | "APPROVAL_REQUEST"
    | "NOTIFICATION"
    | "WEBHOOK"
    | "SCHEDULED_TASK";

  payload: Record<string, any>;
}

// ─── Aggregate Root ───────────────────────────────────────────────────────────

/**
 * The top-level aggregate submitted to RuntimeDataEngine.saveGraph().
 * All components are optional except `entity`.
 */
export interface AggregateRoot {
  /** The primary record (header / master document). */
  entity: AggregateEntity;

  /** ONE-TO-MANY child record collections (e.g., order lines, observations). */
  collections?: AggregateCollection[];

  /** Binary attachments and uploaded files. */
  documents?: AggregateDocument[];

  /** Cross-entity references forming graph edges. */
  relations?: AggregateRelation[];

  /** Workflow triggers and actions to fire on commit. */
  actions?: AggregateAction[];
}

// ─── Aggregate Result ─────────────────────────────────────────────────────────

export interface AggregateCollectionResult {
  created: number;
  updated: number;
  deleted: number;
}

export interface AggregateResult {
  /** UUID of the header record (created or updated). */
  id: string;

  /** Assigned record number (e.g., "PO-000001"). */
  recordNumber: string;

  /** Final concurrency version after save. */
  version: number;

  /** Per-collection save summary. Keys match AggregateCollection.collectionKey. */
  collections: Record<string, AggregateCollectionResult>;

  /** Domain event names that were emitted during this save. */
  eventsEmitted: string[];
}
