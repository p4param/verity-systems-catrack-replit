# CC-004 — Notification Recipient

| Field | Value |
| :--- | :--- |
| **Contract ID** | CC-004 |
| **Title** | Notification Recipient Capability Contract |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Capability Contract |
| **Status** | Approved |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing ADRs** | ADR-009-001, ADR-009-002, ADR-009-003, ADR-009-004 |

---

# 1. Architecture Compliance Statement

This Capability Contract (`CC-004`) formally implements the resolved recipient ledger boundaries defined by frozen architecture governance artifacts:
- **AFR-001 — VS09 Architecture Freeze Review**
- **ADR-009-001 — Communication Delivery Model**
- **ADR-009-002 — Channel & Provider Abstraction**
- **ADR-009-003 — Template Resolution & Personalization**
- **ADR-009-004 — Queue, Retry & Delivery Tracking**

This document conforms strictly to CAP platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`). **No architectural changes or recipient resolution logic are introduced.**

---

# 2. Purpose

The **`NotificationRecipient`** aggregate root represents the **immutable resolved recipient ledger** for a specific `Notification` within the VS09 Communication & Notification Engine.

### Core Principles:
- `NotificationRecipient` stores only the **resolved, point-in-time delivery target metadata** (resolved endpoint address, recipient sequence, user/group identity snapshot, culture/language preferences, and suppression status).
- `NotificationRecipient` **SHALL NOT represent recipient resolution logic**. Recipient resolution belongs **exclusively to `RecipientResolutionService`** during pipeline processing.
- Once populated by `RecipientResolutionService`, `NotificationRecipient` serves as the audit ledger for recipient addressing.

---

# 3. Aggregate Definition & Identity Model

| Element | Specification |
| :--- | :--- |
| **Aggregate Name** | `NotificationRecipient` |
| **Aggregate Root** | `NotificationRecipient` |
| **Bounded Context** | `Communication & Notification Engine` |
| **Aggregate Classification**| **`Medium Aggregate`** (~15–22 attributes, encapsulates recipient endpoint snapshot and preference snapshot). |
| **Aggregate Identity** | **`NotificationRecipientId` (`id`)** — Surrogate UUID Primary Key used by repositories for persistence and ORM identity tracking. |
| **Business Identity** | **`notificationId` + `recipientSequence`** — Unique natural business key enforcing recipient sequence ordering per notification. |
| **Identity Persistence Rule** | Repositories persist and query by Aggregate Identity (`id`), while business lookup rules and sequence uniqueness are enforced through Business Identity (`notificationId` + `recipientSequence`). |
| **Multi-Tenancy Mode** | Explicit `TenantContext` isolation (`tenantId`, `workspaceId`). |

---

# 4. Business Responsibilities

The `NotificationRecipient` aggregate root is responsible for enforcing the following business capabilities:

### What `NotificationRecipient` OWNS:
1. **Resolved Recipient Identity & Sequence**: Store unique recipient sequence numbers (`recipientSequence`) per notification dispatch.
2. **Resolved Delivery Endpoint**: Store the immutable, physical destination address (`recipientEndpoint`) resolved during pipeline execution (e.g., `user@company.com`, `+15550199`).
3. **Recipient Addressing Type**: Classify recipient target types (`INDIVIDUAL_USER`, `USER_GROUP`, `ROLE_MEMBERSHIP`, `EXTERNAL_ENDPOINT`).
4. **Preference Snapshot**: Capture point-in-time recipient delivery preferences (`culture`, `language`, `timezone`, channel preferences).
5. **Suppression Status Ledger**: Maintain suppression flags (`SUPPRESSED`) and recorded suppression reasons (e.g., global opt-out, frequency cap hit, bounce blacklist).

### What `NotificationRecipient` DOES NOT OWN:
- **Recipient Resolution Logic**: Executed exclusively by `RecipientResolutionService`.
- **Identity & User Directory**: Owned by Identity Engine (CM-002) and external directory services.
- **Group/Role Membership Resolution**: Evaluated dynamically by Identity Engine (CM-002).
- **Delivery Provider Routing**: Managed by `ChannelRoutingService` and Provider Adapters (ADR-009-002).
- **Template Rendering & Content Composition**: Managed by `TemplateResolutionService` (ADR-009-003).

---

# 5. Business Attributes

All attributes follow CAP platform database naming conventions specified in **ES-001**:

| Attribute Name | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Required | Aggregate Identity (`NotificationRecipientId`). |
| `notificationId` | `UUID` | Required Reference, Part of Business ID | Foreign identity reference to parent `Notification` aggregate (CC-003). |
| `tenantId` | `UUID` | Foreign Key, Required | Identifies owning tenant organization. (Owned by Tenant Engine). |
| `workspaceId` | `UUID` | Foreign Key, Optional | Identifies operational workspace boundary. (Owned by Tenant Engine). |
| `recipientSequence` | `Integer` | Required, Part of Business ID | Sequence ordinal index (1-based) per notification dispatch. |
| `recipientType` | `Enum` | Required, Immutable | Recipient classification (`INDIVIDUAL_USER`, `USER_GROUP`, `ROLE_MEMBERSHIP`, `EXTERNAL_ENDPOINT`). |
| `recipientUserId` | `UUID` | Optional Reference | Target user profile ID (owned by Identity Engine CM-002). |
| `recipientGroupId` | `UUID` | Optional Reference | Target group ID if resolved from group distribution list. |
| `recipientEndpoint` | `String(500)` | Required, Immutable | Resolved physical destination address (email address, phone number, push token). |
| `channelId` | `UUID` | Required Reference | Foreign identity reference to `NotificationChannel` (CC-002). |
| `deliveryPreferenceSnapshot`| `JSONMap` | Optional | Point-in-time snapshot of user delivery preference settings. |
| `culture` | `String(10)` | Required | ISO locale code for localized template rendering (e.g., `en-US`). |
| `language` | `String(10)` | Required | Primary language code (e.g., `en`). |
| `timezone` | `String(50)` | Required | Recipient timezone string (e.g., `America/New_York`). |
| `status` | `Enum` | Required | Recipient lifecycle state (`RESOLVED`, `ELIGIBLE`, `SUPPRESSED`, `COMPLETED`). |
| `suppressionReason` | `String(500)` | Optional | Recorded reason if status is `SUPPRESSED` (opt-out, blacklist, policy cap). |
| `createdAt` | `Timestamp` | Required, System Managed | UTC timestamp when recipient was resolved and stored. |
| `createdBy` | `UUID` | Required, System Managed | Service account or pipeline process ID. |
| `updatedAt` | `Timestamp` | Required, System Managed | UTC timestamp when recipient record was last updated. |
| `updatedBy` | `UUID` | Required, System Managed | User ID or worker process ID of last updater. |
| `version` | `Integer` | Required, Optimistic Lock | OCC aggregate version counter for concurrent protection. |

---

# 6. Business Invariants

The `NotificationRecipient` aggregate guarantees the following domain invariants:

1. **Unique Recipient Sequence**: The Business Identity combination of `(notificationId, recipientSequence)` MUST be strictly unique across the platform.
2. **Immutable Resolved Endpoint**: Once populated, `recipientEndpoint` and `recipientType` become strictly **immutable**. Subsequent user profile changes in Identity Engine SHALL NEVER alter historical recipient ledger records.
3. **Suppression Dispatch Boundary**: Recipients with status `SUPPRESSED` MUST NEVER accept dispatch attempts or queue execution.
4. **Completed Immutability**: Once status reaches `COMPLETED` (terminal), `NotificationRecipient` becomes fully immutable.
5. **Identity Reference Only**: All user, group, tenant, and channel links MUST be maintained strictly **by identity reference only**.

---

# 7. Lifecycle

The `NotificationRecipient` aggregate root undergoes a deterministic 4-stage lifecycle:

```
[ Resolved ] ──► [ Eligible ] ──► [ Suppressed ]
                       │
                       └──► [ Completed ] (Terminal)
```

### Lifecycle Transition Rules:
- **`RESOLVED`**: Initial state immediately following `RecipientResolutionService` evaluation. Addressing and preferences are captured.
- **`ELIGIBLE`**: Recipient passed preference, consent, and suppression policies; eligible for rendering and delivery dispatch.
- **`SUPPRESSED`**: Recipient failed preference/opt-out checks or commercial policy rules. Dispatch halted permanently.
- **`COMPLETED`**: Final delivery attempt or suppression handling completed. **Terminal state**. Immutable audit record.

---

# 8. Commands

The `NotificationRecipient` aggregate exposes the following domain commands:

| Command | Arguments | Business Description |
| :--- | :--- | :--- |
| **`CreateRecipient`** | `notificationId`, `tenantId`, `recipientSequence`, `recipientType`, `recipientUserId`, `recipientEndpoint`, `channelId`, `culture`, `language`, `timezone` | Instantiates a new `NotificationRecipient` in `RESOLVED` status. |
| **`MarkEligible`** | `recipientId` | Validates preferences and transitions recipient from `RESOLVED` to `ELIGIBLE`. |
| **`SuppressRecipient`** | `recipientId`, `suppressionReason` | Transitions recipient to `SUPPRESSED` status due to opt-out, blacklist, or policy cap. |
| **`MarkCompleted`** | `recipientId` | Transitions recipient state to terminal `COMPLETED` status upon delivery outcome processing. |
| **`UpdateSuppressionReason`**| `recipientId`, `reason` | Updates suppression explanation on a `SUPPRESSED` recipient before completion. |

---

# 9. Queries

The `NotificationRecipient` aggregate supports the following read queries:

| Query | Parameters | Return Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`GetById`** | `recipientId` | `NotificationRecipientDTO` | Fetches recipient aggregate by Aggregate Identity (`id`). |
| **`ListByNotification`** | `notificationId` | `List<NotificationRecipientDTO>` | Returns all resolved recipients associated with a `Notification`. |
| **`ListEligible`** | `notificationId` | `List<NotificationRecipientDTO>` | Returns all `ELIGIBLE` recipients ready for dispatch. |
| **`ListSuppressed`** | `notificationId` | `List<NotificationRecipientDTO>` | Returns all `SUPPRESSED` recipients for a notification. |
| **`ListByRecipientUser`** | `tenantId`, `recipientUserId` | `List<NotificationRecipientDTO>` | Retrieves recipient delivery history for a target user profile. |

---

# 10. External References

External entity attributes referenced by `NotificationRecipient` are held **by identity reference only**:

| External Attribute | Owning Bounded Context | Relationship Type | Rules & Restrictions |
| :--- | :--- | :--- | :--- |
| `notificationId` | VS09 Notification Context | Identity Reference | Identifies parent `Notification` aggregate (CC-003). |
| `tenantId` | Tenant Engine | Identity Reference | Identifies owning tenant organization. No domain ownership transfer. |
| `workspaceId` | Tenant Engine | Identity Reference | Identifies operational workspace boundary. No domain ownership transfer. |
| `recipientUserId` | Identity Engine (CM-002) | Identity Reference | Target user profile ID. No user profile mutation. |
| `recipientGroupId` | Identity Engine (CM-002) | Identity Reference | Target user group ID. No group membership mutation. |
| `channelId` | VS09 Channel Context | Identity Reference | Bound `NotificationChannel` ID (CC-002). |

---

# 11. Ownership Rules

The `NotificationRecipient` aggregate owns its domain ledger strictly:

### What `NotificationRecipient` OWNS:
- Resolved destination addressing (`recipientEndpoint`) and sequence indexing (`recipientSequence`).
- Point-in-time preference snapshot (`culture`, `language`, `timezone`, preference JSON).
- Suppression status (`SUPPRESSED`) and recorded suppression reasons.
- Recipient-level lifecycle state machine (`RESOLVED` $\rightarrow$ `ELIGIBLE` $\rightarrow$ `COMPLETED`).

### What `NotificationRecipient` DOES NOT OWN:
- **Identity Records & Profiles**: Owned by Identity Engine (CM-002).
- **Group / Role Membership**: Owned by Identity Engine (CM-002).
- **Parent Notification Aggregate**: Owned by `Notification` aggregate (CC-003).
- **Delivery Execution & Provider Routing**: Owned by Provider Adapters and `ChannelRoutingService`.

---

# 12. Validation Rules

The `NotificationRecipient` aggregate enforces the following input validation rules:

1. **Resolved Endpoint Required**: `recipientEndpoint` MUST NOT be null, empty, or malformed for the specified channel type.
2. **Notification Reference Required**: `notificationId` MUST reference a valid parent `Notification` (CC-003).
3. **Recipient Type Immutable**: `recipientType` MUST be a valid enum and CANNOT be altered after creation.
4. **No Duplicate Recipient Sequence**: Creating a recipient with an existing `(notificationId, recipientSequence)` MUST fail with `DuplicateSequenceException`.
5. **Suppression Reason Required for Suppressed State**: Transitioning to `SUPPRESSED` status requires a non-empty `suppressionReason`.

---

# 13. Domain Events

The `NotificationRecipient` aggregate emits the following immutable domain events:

| Domain Event | Event Payload Attributes | Business Description |
| :--- | :--- | :--- |
| **`RecipientResolved`** | `recipientId`, `notificationId`, `tenantId`, `recipientSequence`, `recipientEndpoint`, `createdAt` | Emitted when recipient addressing is resolved and stored. |
| **`RecipientEligible`** | `recipientId`, `notificationId`, `tenantId`, `channelId`, `eligibleAt` | Emitted when recipient passes eligibility checks. |
| **`RecipientSuppressed`** | `recipientId`, `notificationId`, `tenantId`, `suppressionReason`, `suppressedAt` | Emitted when recipient dispatch is suppressed due to opt-out or policy. |
| **`RecipientCompleted`** | `recipientId`, `notificationId`, `tenantId`, `status`, `completedAt` | Emitted when recipient execution reaches terminal state. |

---

# 14. Dependencies

### Allowed Dependencies:
- **`RecipientResolutionService`**: Populates `NotificationRecipient` during pipeline execution.
- **Identity Engine (CM-002)**: Supplies recipient identity keys (`recipientUserId`, `recipientGroupId`).
- **`Notification`** (CC-003): Parent notification aggregate.
- **`NotificationChannel`** (CC-002): Bound delivery channel specification.

### Forbidden Dependencies:
- **Provider Adapters** (SendGrid, Twilio, Firebase): `NotificationRecipient` MUST NEVER import vendor transport code.
- **Queue Workers & Brokers**: `NotificationRecipient` MUST NEVER depend on background queues or message broker libraries.
- **Caller Business Modules**: `NotificationRecipient` MUST NEVER import business application module logic.

---

# 15. Repository Lookup Patterns

The `NotificationRecipient` repository MUST support the following standardized lookup methods:

- **`ListByNotification(notificationId)`**: Returns all resolved recipient ledger records for a notification.
- **`ListEligible(notificationId)`**: Returns all eligible recipients ready for dispatch.
- **`ListSuppressed(notificationId)`**: Returns all suppressed recipient records for audit review.
- **`ListByRecipientUser(tenantId, recipientUserId)`**: Retrieves notification receipt history for a user.
- **`ExistsRecipientSequence(notificationId, recipientSequence)`**: Evaluates whether a sequence number exists for a notification.

---

# 16. Definition of Done

This Capability Contract (`CC-004`) is certified **COMPLETE** when all the following criteria are satisfied:

- [x] Aggregate root `NotificationRecipient` defined with clear boundaries and `Medium Aggregate` classification.
- [x] Aggregate Identity (`id`) vs. Business Identity (`notificationId` + `recipientSequence`) explicitly defined.
- [x] Business attributes mapped according to `ES-001` database conventions.
- [x] All 5 domain invariants formally documented and non-negotiable.
- [x] 4-stage recipient lifecycle (`Resolved` $\rightarrow$ `Eligible` $\rightarrow$ `Suppressed` / `Completed`) defined.
- [x] 5 domain commands and 5 read queries specified.
- [x] 5 repository lookup patterns formally documented.
- [x] External identity references (`notificationId`, `recipientUserId`, `recipientGroupId`, `tenantId`, `workspaceId`, `channelId`) audited for identity-only compliance.
- [x] Separation enforced between `NotificationRecipient` (ledger model) and `RecipientResolutionService` (resolution logic).
- [x] Validation rules and domain events formally defined.
- [x] Allowed vs. Forbidden dependencies audited against platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`).

**Status**: **100% READY FOR ENGINEERING WORK PACKAGE EWP-004 IMPLEMENTATION**.
