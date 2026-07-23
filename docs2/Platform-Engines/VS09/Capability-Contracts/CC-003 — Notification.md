# CC-003 — Notification

| Field | Value |
| :--- | :--- |
| **Contract ID** | CC-003 |
| **Title** | Notification Delivery Capability Contract |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Capability Contract |
| **Status** | Approved |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing ADRs** | ADR-009-001, ADR-009-002, ADR-009-003, ADR-009-004 |

---

# 1. Architecture Compliance Statement

This Capability Contract (`CC-003`) formally implements the notification delivery aggregate and state tracking boundaries defined by frozen architecture governance artifacts:
- **AFR-001 — VS09 Architecture Freeze Review**
- **ADR-009-001 — Communication Delivery Model**
- **ADR-009-002 — Channel & Provider Abstraction**
- **ADR-009-003 — Template Resolution & Personalization**
- **ADR-009-004 — Queue, Retry & Delivery Tracking**

This document conforms strictly to CAP platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`). **No architectural changes or vendor implementation details are introduced.**

---

# 2. Purpose

The **`NotificationDelivery`** (or `Notification`) aggregate root represents an active or historical notification delivery execution record within the central ledger of the VS09 Communication & Notification Engine.

### Core Responsibilities:
- Managing delivery aggregate identity and correlation tracing (`correlationId`).
- Enforcing deterministic duplicate suppression via idempotency ledger checks (`idempotencyKey`).
- Managing the provider-independent 10-state delivery lifecycle state machine.
- Preserving rendered content snapshots (`RenderedContent`).
- Recording sequential delivery attempts (`DeliveryAttempt` entities).
- Orchestrating automated exponential backoff retries and Dead Letter Queue (DLQ) state transitions.
- Emitting real-time delivery telemetry and audit events.

### Excluded Responsibilities (Governed by Downstream Engines / Adapters):
- **Business Event Triggering**: Managed by caller business modules.
- **Concrete Vendor Driver Execution**: Isolated inside Provider Adapters (ADR-009-002).
- **Physical Queue Persistence**: Managed by abstract infrastructure queue brokers (ADR-009-004).
- **UI Inbox Presentation**: Managed by Runtime Application UI components.

---

# 3. Aggregate Definition, Identity Model & Composition

| Element | Specification |
| :--- | :--- |
| **Aggregate Name** | `NotificationDelivery` (or `Notification`) |
| **Aggregate Root** | `NotificationDelivery` |
| **Bounded Context** | `Communication & Notification Engine` |
| **Aggregate Classification**| **`Large Aggregate`** (~20–30 attributes, encapsulates `DeliveryAttempt` entity collection and `RenderedContent` value object). |
| **Aggregate Identity** | **`NotificationDeliveryId` (`id`)** — Surrogate UUID Primary Key used by repositories for persistence and ORM identity tracking. |
| **Business Identity** | **`tenantId` + `idempotencyKey`** (or `tenantId` + `notificationIntentId`) — Unique natural business key enforcing duplicate suppression. |
| **Identity Persistence Rule** | Repositories persist and query by Aggregate Identity (`id`), while idempotency checks and business status lookups are enforced through Business Identity (`tenantId` + `idempotencyKey`). |
| **Multi-Tenancy Mode** | Explicit `TenantContext` isolation (`tenantId`, `workspaceId`). |

### Aggregate Internal Composition & Ownership:
- **`NotificationDelivery` (Aggregate Root)**: Controls the lifecycle, state machine, idempotency checks, and concurrency locks for the entire delivery unit.
- **`RenderedContent` (Value Object)**: Immutable point-in-time content snapshot containing rendered subject line, body payload, and resolved language/branding metadata.
- **`DeliveryAttempt` (Internal Entity Collection)**: Append-only collection tracking individual execution attempts.
  - **Ownership Rule**: `DeliveryAttempt` is an **internal entity** owned exclusively by the `NotificationDelivery` aggregate root. It **cannot exist independently**, has **no standalone repository**, and is always created, updated, and persisted strictly through its parent `NotificationDelivery` aggregate.
  - **Expected Collection Size**: Typical retry history ranges from **1–10 attempts** per notification delivery instance, and rarely exceeds 20 attempts across its operational lifecycle.

---

# 4. Business Responsibilities

The `NotificationDelivery` aggregate root is responsible for enforcing the following business capabilities:

### What `NotificationDelivery` OWNS:
1. **Delivery State Machine**: Drive status transitions across `QUEUED`, `PROCESSING`, `RENDERED`, `DISPATCHED`, `PROVIDER_ACCEPTED`, `DELIVERED`, `SUPPRESSED`, `FAILED`, and `DEAD_LETTER`.
2. **Idempotency Ledger Verification**: Enforce zero duplicate dispatches by validating `(tenantId, idempotencyKey)` before worker execution.
3. **Attempt History Logging**: Maintain an append-only collection of internal `DeliveryAttempt` entities capturing timestamps, provider IDs, response codes, and error traces.
4. **Rendered Payload Snapshot**: Store the localized and branded content model (`RenderedContent`) generated during template resolution.
5. **Distributed Correlation Tracing**: Maintain a constant `correlationId` linking the intent, queue headers, worker execution logs, provider requests, and audit receipts.
6. **Retry Schedule Management**: Calculate next retry execution timestamps (`nextAttemptAt`) using exponential backoff formulas.

### What `NotificationDelivery` DOES NOT OWN:
- **`NotificationIntent` Boundary**: Notification references `NotificationIntent` **by identity reference only** (`notificationIntentId`). Notification NEVER modifies `NotificationIntent`. `NotificationIntent` remains **strictly immutable** throughout the delivery execution lifecycle.
- **Template Schema & Override Rules**: Owned by `NotificationTemplate` (CC-001) and `TemplateResolutionService` (ADR-009-003).
- **Channel Business Definitions**: Owned by `NotificationChannel` (CC-002).
- **Vendor Network Drivers**: Owned by concrete Provider Adapter classes (ADR-009-002).
- **User Profile Data**: Owned by Identity Engine (CM-002).

---

# 5. Business Attributes

All attributes follow CAP platform database naming conventions specified in **ES-001**:

| Attribute Name | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Required | Aggregate Identity (`NotificationDeliveryId`). |
| `tenantId` | `UUID` | Foreign Key, Required | Part of Business Identity. Identifies owning tenant. (Owned by Tenant Engine). |
| `workspaceId` | `UUID` | Foreign Key, Optional | Identifies operational workspace boundary. (Owned by Tenant Engine). |
| `notificationIntentId` | `UUID` | Required Reference | Foreign identity reference to originating `NotificationIntent` (Identity reference only). |
| `correlationId` | `UUID` | Required, Immutable | Distributed tracing identifier constant across all delivery logs and audit entries. |
| `idempotencyKey` | `String(255)` | Required, Part of Business ID | Deterministic key for duplicate suppression per tenant. |
| `templateId` | `UUID` | Required Reference | Foreign identity reference to `NotificationTemplate` (CC-001). |
| `templateVersion` | `String(50)` | Required | Bound immutable template version string. |
| `channelId` | `UUID` | Required Reference | Foreign identity reference to `NotificationChannel` (CC-002). |
| `providerId` | `UUID` | Optional Reference | Bound delivery provider instance ID (set during provider selection). |
| `recipientUserId` | `UUID` | Optional Reference | Target user profile ID (owned by Identity Engine CM-002). |
| `recipientEndpoint` | `String(500)` | Required | Physical destination address (email address, phone number, push token, webhook URL). |
| `deliveryStatus` | `Enum` | Required | State machine status (`QUEUED`, `PROCESSING`, `RENDERED`, `DISPATCHED`, `PROVIDER_ACCEPTED`, `DELIVERED`, `SUPPRESSED`, `FAILED`, `DEAD_LETTER`). |
| `retryCount` | `Integer` | Required, Default `0` | Current completed retry attempt counter. |
| `maxRetries` | `Integer` | Required, Default `3` | Maximum allowed retry threshold before dead-lettering. |
| `nextAttemptAt` | `Timestamp` | Optional | UTC timestamp for scheduled exponential backoff retry. |
| `renderedSubject` | `String(1000)`| Optional | Rendered subject line snapshot (part of `RenderedContent` Value Object). |
| `renderedBody` | `Text` | Optional | Rendered content body snapshot (part of `RenderedContent` Value Object). |
| `failureReason` | `String(2000)`| Optional | Diagnostic error summary if status is `FAILED` or `DEAD_LETTER`. |
| `dispatchedAt` | `Timestamp` | Optional | UTC timestamp when handed over to Provider Adapter. |
| `acceptedAt` | `Timestamp` | Optional | UTC timestamp when Provider Adapter received vendor acceptance receipt. |
| `deliveredAt` | `Timestamp` | Optional | UTC timestamp when final delivery confirmation was received. |
| `createdAt` | `Timestamp` | Required, System Managed | UTC timestamp when intent was ingested. |
| `createdBy` | `UUID` | Required, System Managed | User ID or system service account of ingestor. |
| `updatedAt` | `Timestamp` | Required, System Managed | UTC timestamp when state was last updated. |
| `updatedBy` | `UUID` | Required, System Managed | User ID or worker process ID of last updater. |
| `version` | `Integer` | Required, Optimistic Lock | OCC aggregate version counter for concurrent worker protection. |

---

# 6. Business Invariants

The `NotificationDelivery` aggregate guarantees the following domain invariants:

1. **Deterministic Idempotency**: The Business Identity combination of `(tenantId, idempotencyKey)` MUST be unique. A duplicate intent publication MUST NOT instantiate a second active delivery pipeline.
2. **Terminal State Immutability**: Transitions to `DELIVERED`, `SUPPRESSED`, or `DEAD_LETTER` are terminal for a delivery cycle. Terminal dispatches CANNOT be re-dispatched without administrative replay commands.
3. **Monotonic Retry Counter**: `retryCount` MUST increment monotonically with each `DeliveryAttempt` execution and MUST NOT exceed `maxRetries`.
4. **Immutable CorrelationId**: `correlationId` is set at ingestion and MUST remain strictly **immutable** across all retries, attempt logs, and audit records.
5. **RenderedContent Point-in-Time Immutability**: `RenderedContent` represents a point-in-time rendered snapshot. Once rendering is completed, the snapshot is **strictly immutable**. Subsequent template edits, branding profile updates, localization dictionary changes, or new template versions SHALL NEVER alter historical rendered content snapshots.
6. **No Business Transaction Rollback**: Delivery failures or provider outages MUST NEVER cause caller business transactions to fail or rollback.

---

# 7. Delivery Lifecycle State Machine

The `NotificationDelivery` aggregate root governs a 10-state provider-independent state machine:

```
[ QUEUED ] ──► [ PROCESSING ] ──► [ RENDERED ] ──► [ DISPATCHED ] ──► [ PROVIDER_ACCEPTED ] ──► [ DELIVERED ]
    │                │                 │                  │                      │
    ├────────────────┴─────────────────┴──────────────────┴──────────────────────┼──► [ SUPPRESSED ]
    │                                                                            │
    └──► (Failure / Max Retries) ────────────────────────────────────────────────┴──► [ FAILED ] ──► [ DEAD_LETTER ]
```

---

# 8. Commands

The `NotificationDelivery` aggregate exposes the following domain commands:

| Command | Arguments | Business Description |
| :--- | :--- | :--- |
| **`IngestNotificationIntent`** | `tenantId`, `notificationIntentId`, `idempotencyKey`, `correlationId`, `templateId`, `channelId`, `recipientEndpoint` | Ingests intent and creates `NotificationDelivery` in `QUEUED` status. |
| **`MarkProcessing`** | `deliveryId`, `workerId` | Transitions state from `QUEUED` to `PROCESSING` under worker lease lock. |
| **`RecordRenderedContent`** | `deliveryId`, `renderedSubject`, `renderedBody` | Stores `RenderedContent` snapshot and transitions state to `RENDERED`. |
| **`DispatchToProvider`** | `deliveryId`, `providerId` | Records provider binding and transitions state to `DISPATCHED`. |
| **`RecordProviderAcceptance`** | `deliveryId`, `providerReceiptId` | Transitions state to `PROVIDER_ACCEPTED` upon successful provider submission. |
| **`RecordDeliverySuccess`** | `deliveryId`, `deliveredAt` | Transitions state to terminal `DELIVERED` status upon final delivery receipt. |
| **`RecordDeliveryFailure`** | `deliveryId`, `failureReason`, `isTransient` | Evaluates failure type. Appends internal `DeliveryAttempt`. If transient and `retryCount < maxRetries`, schedules retry; otherwise transitions to `FAILED` or `DEAD_LETTER`. |
| **`ScheduleRetry`** | `deliveryId`, `nextAttemptAt` | Increments `retryCount` and schedules next backoff execution. |
| **`MoveToDeadLetter`** | `deliveryId`, `failureReason` | Transitions failed message to `DEAD_LETTER` status as a Poison Message. |
| **`ReplayDeadLetter`** | `deliveryId`, `replayedBy` | Administrative command resetting `DEAD_LETTER` status back to `QUEUED` for manual replay. |

---

# 9. Queries

The `NotificationDelivery` aggregate supports the following read queries:

| Query | Parameters | Return Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`GetById`** | `deliveryId` | `NotificationDeliveryDTO` | Fetches delivery aggregate by Aggregate Identity (`id`). |
| **`GetByIdempotencyKey`**| `tenantId`, `idempotencyKey` | `NotificationDeliveryDTO` | Fetches delivery aggregate by Business Identity. |
| **`GetByCorrelationId`** | `correlationId` | `List<NotificationDeliveryDTO>` | Fetches all delivery records associated with a distributed trace. |
| **`GetByIntentId`** | `notificationIntentId` | `NotificationDeliveryDTO` | Resolves delivery aggregate for an originating intent ID. |
| **`ListPendingRetries`** | `nowTimestamp`, `limit` | `List<NotificationDeliveryDTO>` | Fetches scheduled retries eligible for execution (`nextAttemptAt <= now`). |
| **`ListDeadLetters`** | `tenantId`, `limit` | `List<NotificationDeliveryDTO>` | Fetches unhandled Dead Letter Queue records for administrative review. |

---

# 10. External References & Boundary Rules

External entity attributes referenced by `NotificationDelivery` are held **by identity reference only**:

| External Attribute | Owning Bounded Context | Relationship Type | Rules & Restrictions |
| :--- | :--- | :--- | :--- |
| `tenantId` | Tenant Engine | Identity Reference | Identifies owning tenant organization. No domain ownership transfer. |
| `workspaceId` | Tenant Engine | Identity Reference | Identifies operational workspace boundary. No domain ownership transfer. |
| `notificationIntentId` | Intent Context | Identity Reference | Identifies originating intent. Notification NEVER modifies `NotificationIntent`. |
| `recipientUserId` | Identity Engine (CM-002) | Identity Reference | Target recipient user profile ID. No user profile mutation. |
| `workflowInstanceId` | Workflow Engine | Identity Reference | Originating workflow process instance ID. No workflow engine mutation. |
| `documentId` | Document Engine | Identity Reference | Referenced attachment document ID. No document compilation in VS09. |

---

# 11. Ownership Rules

The `NotificationDelivery` aggregate owns its domain ledger strictly:

### What `NotificationDelivery` OWNS:
- Delivery lifecycle status and state machine transitions.
- Internal `DeliveryAttempt` entity collection (no independent repository; owned 100% by root).
- `RenderedContent` point-in-time value object snapshot (strictly immutable).
- Retry attempt counters, exponential backoff schedules, and DLQ state.
- Idempotency ledger checks and `CorrelationId` tracing data.

### What `NotificationDelivery` DOES NOT OWN:
- **`NotificationIntent`**: Referenced by identity only; Notification never mutates `NotificationIntent`.
- **Vendor Transport Drivers**: Owned by concrete Provider Adapter classes (ADR-009-002).
- **Physical Queue Infrastructure**: Owned by abstract message broker infrastructure (ADR-009-004).
- **User Profile Directory**: Owned by Identity Engine (CM-002).
- **Notification Templates**: Owned by `NotificationTemplate` aggregate (CC-001).
- **Notification Channels**: Owned by `NotificationChannel` aggregate (CC-002).

---

# 12. Validation Rules

The `NotificationDelivery` aggregate enforces the following input validation rules:

1. **Idempotency Key Required**: `idempotencyKey` MUST NOT be null or empty.
2. **Correlation ID Required**: `correlationId` MUST be a valid UUID.
3. **Channel Reference Required**: `channelId` MUST reference a valid, active `NotificationChannel` (CC-002).
4. **Template Reference Required**: `templateId` MUST reference a valid, published `NotificationTemplate` (CC-001).
5. **Recipient Endpoint Required**: `recipientEndpoint` MUST NOT be null or empty and MUST conform to channel address format (e.g., valid email address for `EMAIL`, phone number for `SMS`).
6. **Monotonic Retry Validation**: Manually overriding `retryCount` to a value lower than the current count MUST be rejected.

---

# 13. Domain Events

The `NotificationDelivery` aggregate emits the following immutable domain events:

| Domain Event | Event Payload Attributes | Business Description |
| :--- | :--- | :--- |
| **`NotificationIngested`** | `deliveryId`, `tenantId`, `idempotencyKey`, `correlationId`, `channelId`, `createdAt` | Emitted when intent is ingested into `QUEUED` status. |
| **`NotificationRendered`** | `deliveryId`, `tenantId`, `templateId`, `templateVersion`, `renderedAt` | Emitted when content rendering completes. |
| **`NotificationDispatched`** | `deliveryId`, `tenantId`, `providerId`, `channelId`, `dispatchedAt` | Emitted when handed over to Provider Adapter. |
| **`NotificationAcceptedByProvider`**| `deliveryId`, `tenantId`, `providerId`, `providerReceiptId`, `acceptedAt` | Emitted when Provider Adapter receives positive vendor receipt. |
| **`NotificationDelivered`** | `deliveryId`, `tenantId`, `recipientUserId`, `deliveredAt` | Emitted when final delivery confirmation is received. |
| **`NotificationDeliveryFailed`** | `deliveryId`, `tenantId`, `failureReason`, `retryCount`, `failedAt` | Emitted when a delivery attempt fails. |
| **`NotificationRetryScheduled`** | `deliveryId`, `tenantId`, `retryCount`, `nextAttemptAt` | Emitted when automated retry is scheduled with backoff. |
| **`NotificationMovedToDeadLetter`**| `deliveryId`, `tenantId`, `failureReason`, `deadLetteredAt` | Emitted when message is isolated as a Poison Message in DLQ. |
| **`NotificationDeadLetterReplayed`**| `deliveryId`, `tenantId`, `replayedBy`, `replayedAt` | Emitted when administrative replay is triggered on a DLQ record. |

---

# 14. Dependencies

### Allowed Dependencies:
- **`NotificationTemplate`** (CC-001): Referenced during rendering stage.
- **`NotificationChannel`** (CC-002): Referenced during routing stage.
- **`TemplateResolutionService`** (ADR-009-003): Invoked to execute content composition.
- **Provider Adapters** (ADR-009-002): Invoked to transmit rendered messages over external networks.

### Forbidden Dependencies:
- **Direct Vendor SDK Calls in Domain Logic**: `NotificationDelivery` MUST NEVER invoke Twilio SDK, SendGrid SDK, or Firebase SDK directly.
- **Physical Queue Broker Code**: `NotificationDelivery` MUST NEVER import RabbitMQ, Kafka, or Azure Service Bus driver SDKs.
- **Caller Business Modules**: `NotificationDelivery` MUST NEVER import business application module code (Events, Purchasing, Inventory).

---

# 15. Repository Lookup Patterns & Operational Considerations

### Standard Repository Lookup Patterns:
- **`GetByIdempotencyKey(tenantId, idempotencyKey)`**: Resolves existing delivery record for duplicate suppression checks.
- **`GetByCorrelationId(correlationId)`**: Retrieves all delivery records matching a distributed trace ID.
- **`ListPendingRetries(nowTimestamp, limit)`**: Fetches scheduled retries eligible for worker execution.
- **`ListDeadLettersByTenant(tenantId, limit)`**: Retrieves Dead Letter Queue records for administrative replay dashboards.
- **`ListByStatus(tenantId, deliveryStatus, limit)`**: Retrieves delivery records filtered by lifecycle status.

### High-Volume Ledger Operational Considerations:
`NotificationDelivery` is expected to become a **high-volume ledger aggregate** across the enterprise platform. Future database and repository implementations may introduce operational strategies such as:
- **Table Partitioning**: Range/hash partitioning by `(tenantId, createdAt)` or monthly delivery boundaries.
- **Cold Storage Archival**: Moving terminal dispatches (`DELIVERED`, `SUPPRESSED`) older than retention windows to cold analytical stores.
- **Read-Replica Query Offloading**: Offloading audit trail and reporting queries to read replicas.

---

# 16. Definition of Done

This Capability Contract (`CC-003`) is certified **COMPLETE** when all the following criteria are satisfied:

- [x] Aggregate root `NotificationDelivery` defined with clear boundaries, `Large Aggregate` classification, and internal composition (`RenderedContent` VO + `DeliveryAttempt` Collection).
- [x] Aggregate Identity (`id`) vs. Business Identity (`tenantId` + `idempotencyKey`) explicitly defined.
- [x] Business attributes mapped according to `ES-001` database conventions.
- [x] All 6 domain invariants formally documented (including `RenderedContent` point-in-time immutability).
- [x] Internal entity ownership of `DeliveryAttempt` (no standalone repository) and 1–10 attempt size expectation documented.
- [x] `NotificationIntent` identity-only reference boundary enforced (no mutation of intent).
- [x] Provider-independent 10-state delivery lifecycle state machine defined.
- [x] 10 domain commands and 6 read queries specified.
- [x] 5 repository lookup patterns and future high-volume operational considerations formally documented.
- [x] Allowed vs. Forbidden dependencies audited against platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`).

**Status**: **100% READY FOR ENGINEERING WORK PACKAGE EWP-003 IMPLEMENTATION**.
