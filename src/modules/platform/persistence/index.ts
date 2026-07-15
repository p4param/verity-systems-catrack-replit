/**
 * CM-003 Runtime Data Engine — Public API
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PUBLIC API FREEZE                                                        │
 * │                                                                          │
 * │ Only the symbols exported from this file are considered part of the      │
 * │ public API of CM-003.                                                    │
 * │                                                                          │
 * │ All other files in this module are internal implementation details.      │
 * │ They may be refactored, renamed, or replaced without any consumer        │
 * │ being aware of the change.                                               │
 * │                                                                          │
 * │ Consumers must import ONLY from:                                         │
 * │   @/modules/platform/persistence                                         │
 * │                                                                          │
 * │ NOT from:                                                                │
 * │   @/modules/platform/persistence/providers/...                           │
 * │   @/modules/platform/persistence/sql/...                                 │
 * │   @/modules/platform/persistence/storage/...                             │
 * │   @/modules/platform/persistence/cache/...                               │
 * │   @/modules/platform/persistence/repositories/...                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ─── The Engine ───────────────────────────────────────────────────────────────

export { RuntimeDataEngine } from "./engine/RuntimeDataEngine";

// ─── Essential Public Types ───────────────────────────────────────────────────

// Query model — universal across Runtime, Reporting, AI, Dashboards, Search
export type {
  PlatformQuery,
  PlatformFilter,
  PlatformFilterOperator,
  PlatformOrderBy,
  PlatformInclude,
  PlatformAggregate,
  AggregateFunction,
} from "./types/PlatformQuery";

// Record shape returned by all engine methods
export type { RuntimeRecord, RuntimeRecordMeta } from "./types/RuntimeRecord";

// Aggregate root for graph persistence
export type {
  AggregateRoot,
  AggregateEntity,
  AggregateCollection,
  AggregateDocument,
  AggregateRelation,
  AggregateAction,
  AggregateResult,
  AggregateCollectionResult,
} from "./types/AggregateRoot";

// Execution context
export type { PersistenceExecutionContext } from "./types/PersistenceExecutionContext";

// Typed errors
export {
  ConcurrencyConflictError,
  RecordNotFoundError,
  BulkOperationError,
} from "./types/PersistenceExecutionContext";

// Platform engine contract (used by all CM engines)
export type {
  IPlatformEngine,
  EngineHealth,
  EngineDiagnostics,
} from "./types/IPlatformEngine";

// Behavior extension point (ES-008)
export type { IEntityBehavior } from "./behaviors/IEntityBehavior";

// Number series contract (CM-004 interface)
export type { INumberSeriesEngine, NumberSeriesConfig } from "./number-series/INumberSeriesEngine";

// Domain event types (for subscribers: Workflow, Notifications, Audit, AI)
export type {
  PersistenceEvent,
  PersistenceEventType,
  PlatformAuditEvent,
  PlatformAuditEventType,
} from "./events/PersistenceEventTypes";

// ─── Singleton Factory ────────────────────────────────────────────────────────

import { RuntimeDataEngine } from "./engine/RuntimeDataEngine";
import { NoOpRuntimeCache } from "./cache/NoOpRuntimeCache";
import { AtomicRuntimeStatistics } from "./statistics/AtomicRuntimeStatistics";
import { PlatformNumberSeriesEngine } from "./number-series/PlatformNumberSeriesEngine";

/**
 * Default singleton RuntimeDataEngine instance.
 * All runtime modules should import and use this instance directly.
 *
 * Injecting custom dependencies (cache, stats, numberSeries) is supported
 * for testing by constructing RuntimeDataEngine directly.
 */
export const runtimeDataEngine = new RuntimeDataEngine(
  new NoOpRuntimeCache(),
  new AtomicRuntimeStatistics(),
  new PlatformNumberSeriesEngine()
);
