# CC-006 — Delivery Tracking

| Field | Value |
| :--- | :--- |
| **Contract ID** | CC-006 |
| **Title** | Delivery Tracking Capability Contract |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Capability Contract |
| **Status** | Approved |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing ADRs** | ADR-009-001, ADR-009-002, ADR-009-003, ADR-009-004 |

---

# 1. Architecture Compliance Statement

This Capability Contract (`CC-006`) formally defines the operational tracking and telemetry observability boundary established by frozen architecture governance artifacts:
- **AFR-001 — VS09 Architecture Freeze Review**
- **ADR-009-001 — Communication Delivery Model**
- **ADR-009-002 — Channel & Provider Abstraction**
- **ADR-009-003 — Template Resolution & Personalization**
- **ADR-009-004 — Queue, Retry & Delivery Tracking**

This document conforms strictly to CAP platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`). **No architectural changes or delivery execution modifications are introduced.**

---

# 2. Purpose

The **`DeliveryTracking`** aggregate root represents the **operational tracking history, telemetry timeline, provider acknowledgement log, and audit record** for a specific `Notification` within the VS09 Communication & Notification Engine.

### Core Principles:
- `DeliveryTracking` encapsulates **operational observability, append-only timeline events, provider receipts, and end-to-end correlation tracing**.
- `DeliveryTracking` **SHALL NOT own delivery execution** (owned strictly by `NotificationDelivery` aggregate CC-003).
- `DeliveryTracking` **SHALL NOT own retry execution, worker queue loops, or Provider Adapters**.
- `DeliveryTracking` provides decoupled, read-optimized tracking telemetry for administrative dashboards and external audit queries.

---

# 3. Aggregate Definition & Identity Model

| Element | Specification |
| :--- | :--- |
| **Aggregate Name** | `DeliveryTracking` |
| **Aggregate Root** | `DeliveryTracking` |
| **Bounded Context** | `Communication & Notification Engine` |
| **Aggregate Classification**| **`Medium Aggregate`** (~15–20 attributes, encapsulates append-only timeline event array and telemetry metadata map). |
| **Aggregate Identity** | **`DeliveryTrackingId` (`id`)** — Surrogate UUID Primary Key used by repositories for persistence and ORM identity tracking. |
| **Business Identity** | **`notificationId`** — Unique natural business key enforcing a 1-to-1 tracking relationship per `Notification` aggregate. |
| **Identity Persistence Rule** | Repositories persist and query by Aggregate Identity (`id`), while operational tracking queries and correlation lookups are enforced through Business Identity (`notificationId`) and `correlationId`. |
| **Multi-Tenancy Mode** | Explicit `TenantContext` isolation (`tenantId`, `workspaceId`). |

---

# 4. Business Responsibilities

The `DeliveryTracking` aggregate root is responsible for enforcing the following business capabilities:

### What `DeliveryTracking` OWNS:
1. **Append-Only Tracking Timeline**: Maintain an immutable, chronological event log (`trackingTimeline`) recording every milestone (ingested, rendered, queued, dispatched, provider acknowledged, delivered, read).
2. **Provider Acknowledgements & Receipts**: Capture vendor-assigned receipt IDs (`providerAcknowledgementId`), raw vendor status codes, and timestamp receipts.
3. **Operational Telemetry & Performance Metrics**: Track latency durations (rendering time, dispatch latency, vendor transit duration) in `telemetryMetadata`.
4. **Distributed Correlation Visibility**: Link all tracking events to the immutable `correlationId` for end-to-end system-wide tracing.
5. **Audit Ledger & Compliance**: Maintain immutable operational audit data (`auditMetadata`) for enterprise compliance reporting.

### What `DeliveryTracking` DOES NOT OWN:
- **Delivery Execution & State Machine**: Owned exclusively by `NotificationDelivery` (CC-003).
- **Retry Schedules & Backoff Calculations**: Owned by `NotificationDelivery` (CC-003).
- **Provider Adapters & Transports**: Owned by Provider Adapters (ADR-009-002).
- **Background Queue Workers**: Executed by background worker loops (ADR-009-004).
- **Template & Content Definitions**: Owned by `NotificationTemplate` (CC-001).

---

# 5. Business Attributes

All attributes follow CAP platform database naming conventions specified in **ES-001**:

| Attribute Name | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Required | Aggregate Identity (`DeliveryTrackingId`). |
| `notificationId` | `UUID` | Required Reference, Business ID | Foreign identity reference to target `Notification` aggregate (CC-003). |
| `tenantId` | `UUID` | Foreign Key, Required | Identifies owning tenant. (Owned by Tenant Engine). |
| `workspaceId` | `UUID` | Foreign Key, Optional | Identifies operational workspace boundary. (Owned by Tenant Engine). |
| `correlationId` | `UUID` | Required, Immutable | Distributed tracing identifier constant across all tracking logs. |
| `trackingStatus` | `Enum` | Required | Tracking state (`TRACKING_STARTED`, `TRACKING_ACTIVE`, `TRACKING_COMPLETED`, `ARCHIVED`). |
| `providerAcknowledgementId`| `String(255)`| Optional, Immutable | Vendor receipt identifier (e.g., SendGrid msg ID, Twilio SID). |
| `providerStatus` | `String(100)` | Optional | Raw status string returned by vendor provider. |
| `providerTimestamp` | `Timestamp` | Optional | UTC timestamp when vendor acknowledged receipt. |
| `deliveryTimestamp` | `Timestamp` | Optional | UTC timestamp when final delivery confirmation was logged. |
| `readTimestamp` | `Timestamp` | Optional | UTC timestamp when recipient opened/read message (future capability). |
| `trackingTimeline` | `Array<JSONMap>`| Required | Append-only chronological list of tracking events and timestamps. |
| `telemetryMetadata` | `JSONMap` | Optional | Performance telemetry (latency breakdown, retry counts, IP trace). |
| `auditMetadata` | `JSONMap` | Optional | Compliance audit snapshot for regulatory reporting. |
| `createdAt` | `Timestamp` | Required, System Managed | UTC timestamp when tracking was initialized. |
| `createdBy` | `UUID` | Required, System Managed | User ID or worker process ID that initialized tracking. |
| `updatedAt` | `Timestamp` | Required, System Managed | UTC timestamp when tracking state was last appended. |
| `updatedBy` | `UUID` | Required, System Managed | User ID or worker process ID of last updater. |
| `version` | `Integer` | Required, Optimistic Lock | OCC aggregate version counter for concurrent modification protection. |

---

# 6. Business Invariants

The `DeliveryTracking` aggregate guarantees the following domain invariants:

1. **Unique 1-to-1 Notification Tracking**: The Business Identity `notificationId` MUST be unique across all `DeliveryTracking` records. Exactly ONE tracking aggregate exists per `Notification`.
2. **Immutable CorrelationId**: `correlationId` is set at tracking initialization and MUST remain strictly **immutable**.
3. **Append-Only Timeline**: Entries added to `trackingTimeline` MUST be append-only. Historical timeline entries CANNOT be edited, reordered, or deleted.
4. **Immutable Provider Receipts**: Once recorded, `providerAcknowledgementId` and `providerTimestamp` become strictly **immutable**.
5. **Archived Immutability**: Tracking records in `ARCHIVED` status (terminal state) are permanently immutable.
6. **Execution Independence**: Errors during tracking write operations MUST NEVER cause active delivery execution to fail.

---

# 7. Lifecycle

The `DeliveryTracking` aggregate root undergoes a deterministic 4-stage operational lifecycle:

```
[ TrackingStarted ] ──► [ TrackingActive ] ──► [ TrackingCompleted ] ──► [ Archived ] (Terminal)
```

### Lifecycle Transition Rules:
- **`TRACKING_STARTED`**: Initialized immediately when `NotificationDelivery` is ingested into `QUEUED`.
- **`TRACKING_ACTIVE`**: Active monitoring state while message is dispatched, retried, or awaiting vendor receipts.
- **`TRACKING_COMPLETED`**: Final delivery or failure receipt received. Timeline recording complete.
- **`ARCHIVED`**: Tracking record moved to historical cold storage / audit archive. **Terminal state**. Fully immutable.

---

# 8. Commands

The `DeliveryTracking` aggregate exposes the following domain commands:

| Command | Arguments | Business Description |
| :--- | :--- | :--- |
| **`StartTracking`** | `notificationId`, `tenantId`, `correlationId`, `createdBy` | Instantiates a new `DeliveryTracking` aggregate in `TRACKING_STARTED` status. |
| **`RecordAcknowledgement`**| `trackingId`, `providerAcknowledgementId`, `providerStatus`, `providerTimestamp` | Records vendor provider receipt and transitions status to `TRACKING_ACTIVE`. |
| **`RecordDeliveryConfirmation`**| `trackingId`, `deliveryTimestamp` | Records final delivery receipt and transitions status to `TRACKING_COMPLETED`. |
| **`AppendTrackingEvent`** | `trackingId`, `eventType`, `eventDetails`, `timestamp` | Appends a new chronological event entry to `trackingTimeline`. |
| **`ArchiveTracking`** | `trackingId`, `archivedBy` | Transitions completed tracking record to `ARCHIVED` (terminal state). |

---

# 9. Queries

The `DeliveryTracking` aggregate supports the following read queries:

| Query | Parameters | Return Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`GetById`** | `trackingId` | `DeliveryTrackingDTO` | Fetches tracking aggregate by Aggregate Identity (`id`). |
| **`GetByNotification`** | `notificationId` | `DeliveryTrackingDTO` | Fetches tracking record by Business Identity (`notificationId`). |
| **`GetByCorrelationId`** | `correlationId` | `DeliveryTrackingDTO` | Fetches tracking record by distributed trace identifier. |
| **`ListPendingAcknowledgements`**| `tenantId`, `limit` | `List<DeliveryTrackingDTO>` | Returns tracking records awaiting provider receipts. |
| **`ListCompletedTracking`**| `tenantId`, `limit` | `List<DeliveryTrackingDTO>` | Returns completed tracking records for audit reporting. |

---

# 10. External References

External entity attributes referenced by `DeliveryTracking` are held **by identity reference only**:

| External Attribute | Owning Bounded Context | Relationship Type | Rules & Restrictions |
| :--- | :--- | :--- | :--- |
| `notificationId` | VS09 Notification Context | Identity Reference | Parent `Notification` aggregate (CC-003). |
| `providerProfileId` | VS09 Provider Context | Identity Reference | Bound `ProviderProfile` ID (CC-005). |
| `tenantId` | Tenant Engine | Identity Reference | Identifies owning tenant organization. No domain ownership transfer. |
| `workspaceId` | Tenant Engine | Identity Reference | Identifies operational workspace boundary. No domain ownership transfer. |
| `correlationId` | Platform Tracing Context | Identity Reference | Global distributed trace identifier. |

---

# 11. Ownership Rules

The `DeliveryTracking` aggregate owns its telemetry ledger strictly:

### What `DeliveryTracking` OWNS:
- Chronological append-only timeline events (`trackingTimeline`).
- Vendor provider receipts (`providerAcknowledgementId`) and raw status codes.
- Performance latency telemetry (`telemetryMetadata`) and audit snapshots (`auditMetadata`).
- Tracking lifecycle status (`TRACKING_STARTED` $\rightarrow$ `TRACKING_COMPLETED` $\rightarrow$ `ARCHIVED`).

### What `DeliveryTracking` DOES NOT OWN:
- **`Notification` Aggregate**: Owned by `NotificationDelivery` (CC-003).
- **Delivery Attempts & Retries**: Owned by `NotificationDelivery` (CC-003).
- **Provider Adapters**: Owned by concrete transport adapters (ADR-009-002).
- **Queue Workers**: Owned by background processing workers (ADR-009-004).

---

# 12. Validation Rules

The `DeliveryTracking` aggregate enforces the following input validation rules:

1. **Notification Reference Required**: `notificationId` MUST reference a valid parent `Notification` (CC-003).
2. **Correlation ID Required & Immutable**: `correlationId` MUST be a valid UUID and CANNOT be updated after creation.
3. **Timeline Append-Only**: Attempts to modify existing indices within `trackingTimeline` MUST be rejected.
4. **Unique Provider Acknowledgements**: `providerAcknowledgementId` MUST be unique per provider instance.
5. **Terminal Archival Boundary**: Commands attempting to modify an `ARCHIVED` tracking record MUST be rejected.

---

# 13. Domain Events

The `DeliveryTracking` aggregate emits the following immutable domain events:

| Domain Event | Event Payload Attributes | Business Description |
| :--- | :--- | :--- |
| **`TrackingStarted`** | `trackingId`, `notificationId`, `tenantId`, `correlationId`, `createdAt` | Emitted when delivery tracking is initialized. |
| **`AcknowledgementReceived`**| `trackingId`, `notificationId`, `providerAcknowledgementId`, `providerStatus`, `timestamp` | Emitted when vendor receipt is logged. |
| **`DeliveryConfirmed`** | `trackingId`, `notificationId`, `tenantId`, `deliveryTimestamp` | Emitted when final delivery confirmation is logged. |
| **`TrackingArchived`** | `trackingId`, `notificationId`, `tenantId`, `archivedBy`, `archivedAt` | Emitted when tracking record reaches `ARCHIVED` terminal state. |

---

# 14. Dependencies

### Allowed Dependencies:
- **`Notification`** (CC-003): Primary parent aggregate.
- **`ProviderProfile`** (CC-005): Referenced provider metadata.
- **Audit Engine**: Receives compliance audit snapshots.
- **Platform Monitoring / Telemetry**: Consumes delivery latency metrics.

### Forbidden Dependencies:
- **Vendor SDKs** (SMTP, Twilio SDK, Microsoft Graph SDK, Firebase SDK): `DeliveryTracking` MUST NEVER import vendor driver code.
- **Provider Adapters**: `DeliveryTracking` observes receipts; it does not contain transport code.
- **Queue Workers**: `DeliveryTracking` MUST NEVER depend on background processing workers.
- **Caller Business Modules**: `DeliveryTracking` MUST NEVER import business application module logic.

---

# 15. Repository Lookup Patterns

The `DeliveryTracking` repository MUST support the following standardized lookup methods:

- **`GetByNotification(notificationId)`**: Retrieves tracking record for a specific notification.
- **`GetByCorrelationId(correlationId)`**: Retrieves tracking record by distributed trace identifier.
- **`ListPendingAcknowledgements(tenantId, limit)`**: Returns tracking records awaiting provider receipts.
- **`ListCompletedTracking(tenantId, limit)`**: Returns completed tracking records for audit reporting.
- **`ExistsTracking(notificationId)`**: Evaluates whether tracking exists for a notification.

---

# 16. Capability Dependency Matrix

The `DeliveryTracking` aggregate interacts with other VS09 capability contracts as follows:

| Capability Contract | Inter-Aggregate Relationship | Description |
| :--- | :--- | :--- |
| **CC-001 Notification Template** | Independent | Independent. Tracking observes rendered outputs via CC-003. |
| **CC-002 Notification Channel** | Independent | Independent. Channel selection logged in timeline events. |
| **CC-003 Notification** | **Primary Parent** | `DeliveryTracking` maintains 1-to-1 tracking for `Notification`. |
| **CC-004 Notification Recipient**| Indirect | Recipient delivery outcome logged in tracking timeline. |
| **CC-005 Provider Profile** | References | Provider receipts map back to `providerProfileId`. |

---

# 17. Definition of Done

This Capability Contract (`CC-006`) is certified **COMPLETE** when all the following criteria are satisfied:

- [x] Aggregate root `DeliveryTracking` defined with clear boundaries and `Medium Aggregate` classification.
- [x] Aggregate Identity (`id`) vs. Business Identity (`notificationId`) explicitly defined.
- [x] Business attributes mapped according to `ES-001` database conventions.
- [x] All 6 domain invariants formally documented and non-negotiable.
- [x] 4-stage tracking lifecycle (`TrackingStarted` $\rightarrow$ `TrackingActive` $\rightarrow$ `TrackingCompleted` $\rightarrow$ `Archived`) defined.
- [x] 5 domain commands and 5 read queries specified.
- [x] 5 repository lookup patterns formally documented.
- [x] Complete Capability Dependency Matrix documented.
- [x] Explicit domain ownership boundaries established (observability ledger vs. delivery execution).
- [x] Validation rules and domain events formally defined.
- [x] Allowed vs. Forbidden dependencies audited against platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`).

**Status**: **100% READY FOR ENGINEERING WORK PACKAGE EWP-006 IMPLEMENTATION**.
