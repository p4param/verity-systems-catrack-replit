/**
 * CM-003 Runtime Data Engine — Persistence Domain Events
 *
 * Defines the persistence event types emitted by RuntimeDataEngine
 * for every create, update, delete, restore, and graph save operation.
 *
 * Events are published via the existing RuntimeEventBus.
 * Subscribers: Workflow Engine (CM-007), Notification Engine (CM-009),
 * Audit Engine (REGULATED profile), AI Engine (CM-016), Integration Engine (CM-015).
 *
 * RuntimeDataEngine never imports those engines — it only publishes events.
 * Full decoupling: engines subscribe independently.
 *
 * Standards: ES-008
 */
import type { PersistenceExecutionContext } from "../types/PersistenceExecutionContext";

// ─── Event Type Strings ────────────────────────────────────────────────────────

/**
 * Persistence event type identifiers.
 * Namespaced with "persistence:" to avoid conflicts with UI RuntimeEventType values.
 */
export type PersistenceEventType =
  | "persistence:before_create"
  | "persistence:after_create"
  | "persistence:before_update"
  | "persistence:after_update"
  | "persistence:before_delete"
  | "persistence:after_delete"
  | "persistence:before_restore"
  | "persistence:after_restore"
  | "persistence:before_graph_save"
  | "persistence:after_graph_save"
  | "persistence:bulk_insert_complete"
  | "persistence:concurrency_conflict";

// ─── Platform Audit Event Types ───────────────────────────────────────────────

/**
 * Platform infrastructure events — separate from business record audit.
 * These document platform lifecycle and operational events, not user data changes.
 *
 * Kept separate to allow different retention, access control, and storage.
 */
export type PlatformAuditEventType =
  | "platform:entity_published"
  | "platform:manifest_generated"
  | "platform:schema_migrated"
  | "platform:runtime_started"
  | "platform:runtime_stopped"
  | "platform:cache_cleared"
  | "platform:provider_switched"
  | "platform:migration_failed"
  | "platform:health_check_failed";

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface PersistenceEvent {
  type: PersistenceEventType;
  entityId: string;
  entityCode: string;
  recordId?: string;
  recordNumber?: string;
  payload?: Record<string, any>;
  ctx: PersistenceExecutionContext;
  timestamp: Date;
}

export interface PlatformAuditEvent {
  type: PlatformAuditEventType;
  entityId?: string;
  entityCode?: string;
  actorId?: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
}
