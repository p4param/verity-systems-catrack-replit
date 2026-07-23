# CC-002 — Notification Channel

| Field | Value |
| :--- | :--- |
| **Contract ID** | CC-002 |
| **Title** | Notification Channel Capability Contract |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Capability Contract |
| **Status** | Approved |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing ADRs** | ADR-009-001, ADR-009-002, ADR-009-003, ADR-009-004 |

---

# 1. Architecture Compliance Statement

This Capability Contract (`CC-002`) formally implements the communication channel boundaries defined by frozen architecture governance artifacts:
- **AFR-001 — VS09 Architecture Freeze Review**
- **ADR-009-001 — Communication Delivery Model**
- **ADR-009-002 — Channel & Provider Abstraction**
- **ADR-009-003 — Template Resolution & Personalization**
- **ADR-009-004 — Queue, Retry & Delivery Tracking**

This document conforms strictly to CAP platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`). **No architectural changes or vendor implementation details are introduced.**

---

# 2. Purpose

The **`NotificationChannel`** aggregate root represents an abstract **business communication medium** within the VS09 Communication & Notification Engine.

Supported channel types include:
- `EMAIL`: Electronic mail delivery.
- `SMS`: Short Message Service text alerts.
- `PUSH`: Mobile device push notifications.
- `IN_APP`: In-application user notification inbox and real-time alerts.
- `WEBHOOK`: Event webhooks for system-to-system integrations.
- `INTERNAL_MESSAGE`: Internal platform messaging stream.

### Core Principles:
- `NotificationChannel` encapsulates **business delivery media and semantics**.
- `NotificationChannel` **DOES NOT represent concrete vendor implementations** (e.g., SendGrid, Twilio, Firebase).
- `NotificationChannel` **DOES NOT own or manage delivery provider drivers**, which remain completely isolated behind Provider Adapters (ADR-009-002).

---

# 3. Aggregate Definition & Identity Model

| Element | Specification |
| :--- | :--- |
| **Aggregate Name** | `NotificationChannel` |
| **Aggregate Root** | `NotificationChannel` |
| **Bounded Context** | `Communication & Notification Engine` |
| **Aggregate Classification**| **`Small Aggregate`** (~10–18 attributes, high query throughput, lightweight domain state). |
| **Aggregate Identity** | **`NotificationChannelId` (`id`)** — Surrogate UUID Primary Key used by repositories for persistence and ORM identity tracking. |
| **Business Identity** | **`tenantId` + `channelCode`** — Unique natural business key enforcing channel uniqueness per tenant. |
| **Identity Persistence Rule** | Repositories persist and query by Aggregate Identity (`id`), while business domain uniqueness and channel lookup rules are enforced through Business Identity (`tenantId` + `channelCode`). |
| **Multi-Tenancy Mode** | Explicit `TenantContext` isolation (`tenantId`, `workspaceId`). |

---

# 4. Business Responsibilities

The `NotificationChannel` aggregate root is responsible for enforcing the following business capabilities:

### What `NotificationChannel` OWNS:
1. **Channel Identity & Metadata**: Maintain unique channel codes, display names, and channel descriptions.
2. **Channel Availability & Status**: Govern whether a channel is operational (`ACTIVE`, `SUSPENDED`, `DISABLED`).
3. **Template Category Mapping**: Define which template categories (e.g., `TRANSACTIONAL`, `SECURITY`, `MARKETING`) are compatible with the channel.
4. **Default Channel Rules**: Mark default primary channels per channel type (e.g., Default Email Channel vs. Custom Email Channel).
5. **Business Configuration**: Store business-level delivery parameters (e.g., max payload size, rate limit caps, character truncation policies).

### What `NotificationChannel` DOES NOT OWN:
- **Provider Selection & Routing**: Managed by `ChannelRoutingService` and Provider Selection rules (ADR-009-002).
- **Provider Adapters & Drivers**: Managed by isolated Provider Adapter classes (ADR-009-002).
- **Queue Processing**: Managed by Channel Dispatch Queues and background workers (ADR-009-004).
- **Content Rendering**: Managed by engine rendering pipelines (ADR-009-003).
- **Retry Execution & Tracking**: Managed by `NotificationDelivery` aggregate (ADR-009-004).

---

# 5. Business Attributes

All attributes follow CAP platform database naming conventions specified in **ES-001**:

| Attribute Name | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Required | Aggregate Identity (`NotificationChannelId`). |
| `tenantId` | `UUID` | Foreign Key, Required | Part of Business Identity. Identifies owning tenant. (Owned by Tenant Engine). |
| `workspaceId` | `UUID` | Foreign Key, Optional | Identifies operational workspace boundary. (Owned by Tenant Engine). |
| `channelCode` | `String(100)` | Required, Part of Business ID | Unique business code identifying the channel (e.g., `TENANT_PRIMARY_EMAIL`). |
| `channelName` | `String(255)` | Required | Human-readable title of the channel. |
| `description` | `String(1000)`| Optional | Summary of channel purpose and usage scope. |
| `channelType` | `Enum` | Required, Immutable | Classification (`EMAIL`, `SMS`, `PUSH`, `IN_APP`, `WEBHOOK`, `INTERNAL_MESSAGE`). |
| `status` | `Enum` | Required | Administrative status (`DRAFT`, `ACTIVE`, `SUSPENDED`, `ARCHIVED`). |
| `priority` | `Integer` | Required, Default `100` | Priority weighting for channel selection rules. |
| `isDefault` | `Boolean` | Required, Default `false` | Indicates whether this is the default channel for its `channelType`. |
| `isEnabled` | `Boolean` | Required, Default `true` | Operational toggle switch for runtime intent routing. |
| `supportedTemplateCategories` | `Array<Enum>` | Required, Non-Empty | Compatible template categories (e.g., `[TRANSACTIONAL, SECURITY, WORKFLOW]`). |
| `configurationMetadata` | `JSONMap` | Optional | Non-vendor business parameters (max character limits, payload size caps). |
| `createdAt` | `Timestamp` | Required, System Managed | UTC timestamp when channel was created. |
| `createdBy` | `UUID` | Required, System Managed | User ID of creator (owned by Identity Engine CM-002). |
| `updatedAt` | `Timestamp` | Required, System Managed | UTC timestamp when channel was last updated. |
| `updatedBy` | `UUID` | Required, System Managed | User ID of last modifier (owned by Identity Engine CM-002). |
| `version` | `Integer` | Required, Optimistic Lock | OCC aggregate version counter for concurrent modification protection. |

---

# 6. Business Invariants

The `NotificationChannel` aggregate guarantees the following domain invariants:

1. **Unique Channel Code**: The Business Identity combination of `(tenantId, channelCode)` MUST be unique across the platform.
2. **Single Default Per Channel Type**: Only ONE active `NotificationChannel` per `(tenantId, channelType)` can have `isDefault = true`. Marking a channel as default automatically unsets `isDefault` on previous default channels for that type.
3. **Immutable Channel Type**: Once created, `channelType` is strictly **immutable** and CANNOT be modified.
4. **Disabled Routing Boundary**: Disabled channels (`isEnabled = false`) or suspended channels (`status = SUSPENDED`) MUST NOT accept new `NotificationIntent` dispatches.
5. **Unique Supported Categories**: The `supportedTemplateCategories` array MUST NOT contain duplicate category enum entries.
6. **Archived Immutability**: Channels in the `ARCHIVED` status are permanently immutable and CANNOT be reactivated.

---

# 7. Lifecycle

The `NotificationChannel` aggregate root undergoes a deterministic 4-stage administrative lifecycle:

```
[ Draft ] ──► [ Active ] ──► [ Suspended ] ──► [ Archived ] (Terminal)
```

### Lifecycle Transition Rules:
- **`DRAFT`**: Initial channel configuration state. Ineligible for production notification dispatch.
- **`ACTIVE`**: Channel is fully operational, enabled, and eligible for runtime intent routing.
- **`SUSPENDED`**: Channel is temporarily suspended from routing (e.g., maintenance or tenant pause). Rejects new intents.
- **`ARCHIVED`**: Channel is permanently decommissioned. **Terminal state**. Ineligible for runtime routing. Fully immutable.

---

# 8. Commands

The `NotificationChannel` aggregate exposes the following domain commands:

| Command | Arguments | Business Description |
| :--- | :--- | :--- |
| **`CreateChannel`** | `tenantId`, `channelCode`, `channelName`, `channelType`, `supportedTemplateCategories` | Instantiates a new `NotificationChannel` in `DRAFT` status. |
| **`ActivateChannel`** | `channelId`, `activatedBy` | Transitions channel from `DRAFT` or `SUSPENDED` to `ACTIVE`. |
| **`SuspendChannel`** | `channelId`, `reason` | Transitions an `ACTIVE` channel to `SUSPENDED` status. |
| **`ArchiveChannel`** | `channelId`, `archivedBy` | Transitions a `SUSPENDED` or `ACTIVE` channel to `ARCHIVED` (terminal). |
| **`EnableChannel`** | `channelId` | Sets `isEnabled = true` for runtime intent routing. |
| **`DisableChannel`** | `channelId`, `reason` | Sets `isEnabled = false`, disabling intent routing. |
| **`SetDefault`** | `channelId` | Marks channel as default for its `channelType`, clearing existing defaults. |
| **`AddSupportedCategory`** | `channelId`, `category` | Appends a compatible template category to `supportedTemplateCategories`. |
| **`RemoveSupportedCategory`** | `channelId`, `category` | Removes a template category from `supportedTemplateCategories`. |
| **`UpdateMetadata`** | `channelId`, `channelName`, `description`, `priority`, `configurationMetadata` | Updates editable metadata parameters. |

---

# 9. Queries

The `NotificationChannel` aggregate supports the following read queries:

| Query | Parameters | Return Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`GetById`** | `channelId` | `NotificationChannelDTO` | Fetches a channel aggregate by Aggregate Identity (`id`). |
| **`GetByCode`** | `tenantId`, `channelCode` | `NotificationChannelDTO` | Fetches a channel aggregate by Business Identity (`tenantId` + `channelCode`). |
| **`GetDefaultChannel`**| `tenantId`, `channelType` | `NotificationChannelDTO` | Resolves the default active channel for a given channel type. |
| **`ListActive`** | `tenantId`, `category?` | `List<NotificationChannelDTO>` | Returns all `ACTIVE` and `isEnabled` channels for a tenant. |
| **`ListByType`** | `tenantId`, `channelType` | `List<NotificationChannelDTO>` | Returns all channels matching a specific `channelType`. |
| **`ListEnabled`** | `tenantId` | `List<NotificationChannelDTO>` | Returns all operational enabled channels. |

---

# 10. External References

To uphold strict bounded context boundaries, external entity attributes referenced by `NotificationChannel` are held **by identity reference only**:

| External Attribute | Owning Bounded Context | Relationship Type | Rules & Restrictions |
| :--- | :--- | :--- | :--- |
| `tenantId` | Tenant Engine | Identity Reference | Identifies owning tenant organization. No domain ownership transfer. |
| `workspaceId` | Tenant Engine | Identity Reference | Identifies operational workspace boundary. No domain ownership transfer. |
| `providerProfileId` | Provider Context (ADR-009-002) | Identity Reference | Reserved for future provider binding references. VS09 holds ID reference only. |
| `createdBy` / `updatedBy`| Identity Engine (CM-002) | Identity Reference | User profile surrogate key for audit trail logging. No user profile mutation. |

---

# 11. Ownership Rules

The `NotificationChannel` aggregate owns its domain metadata strictly:

### What `NotificationChannel` OWNS:
- Channel business code, display name, description, and channel type classification.
- Channel operational status (`ACTIVE`, `SUSPENDED`, `ARCHIVED`) and availability flags (`isEnabled`).
- Template category compatibility declarations (`supportedTemplateCategories`).
- Priority weighting and default channel indicators (`isDefault`).
- Non-vendor business configuration metadata.

### What `NotificationChannel` DOES NOT OWN:
- **Provider Implementations**: Owned by concrete Provider Adapter classes (ADR-009-002).
- **Provider Health & Circuit Breakers**: Owned by Provider Health Monitoring services (ADR-009-002).
- **Provider Selection & Fallback Routing**: Managed by `ChannelRoutingService` (ADR-009-002).
- **NotificationIntents**: Owned by caller business modules and intent ingestion boundaries.
- **Notification Templates**: Owned by `NotificationTemplate` aggregate (CC-001).
- **Delivery Lifecycle Records**: Owned by `NotificationDelivery` aggregate (ADR-009-004).

---

# 12. Validation Rules

The `NotificationChannel` aggregate enforces the following input validation rules:

1. **Channel Code Required**: `channelCode` MUST NOT be null, empty, or contain whitespace/special characters outside `[A-Z0-9_]`.
2. **Channel Name Required**: `channelName` MUST NOT be null or empty (max length 255 characters).
3. **Channel Type Required & Immutable**: `channelType` MUST be a valid `DeliveryChannel` enum value and CANNOT be updated after creation.
4. **Mandatory Template Category**: `supportedTemplateCategories` MUST contain at least one valid category enum.
5. **No Duplicate Category Entries**: Adding a category already present in `supportedTemplateCategories` MUST be rejected.
6. **Single Default Verification**: Setting `isDefault = true` MUST execute single-default validation across the tenant's channels for that type.

---

# 13. Domain Events

The `NotificationChannel` aggregate emits the following immutable domain events:

| Domain Event | Event Payload Attributes | Business Description |
| :--- | :--- | :--- |
| **`ChannelCreated`** | `channelId`, `tenantId`, `channelCode`, `channelType`, `createdBy`, `createdAt` | Emitted when a new channel aggregate is created. |
| **`ChannelActivated`** | `channelId`, `tenantId`, `channelCode`, `activatedBy`, `activatedAt` | Emitted when a channel transitions to `ACTIVE`. |
| **`ChannelSuspended`** | `channelId`, `tenantId`, `channelCode`, `reason`, `suspendedAt` | Emitted when a channel is suspended. |
| **`ChannelArchived`** | `channelId`, `tenantId`, `channelCode`, `archivedBy`, `archivedAt` | Emitted when a channel reaches `ARCHIVED` terminal state. |
| **`ChannelEnabled`** | `channelId`, `tenantId`, `channelCode` | Emitted when a channel is enabled for runtime routing. |
| **`ChannelDisabled`** | `channelId`, `tenantId`, `channelCode`, `reason` | Emitted when a channel is disabled. |
| **`DefaultChannelChanged`**| `channelId`, `tenantId`, `channelType`, `previousDefaultChannelId` | Emitted when the default channel for a channel type is changed. |

---

# 14. Dependencies

### Allowed Dependencies:
- **`NotificationTemplate`** (CC-001): Intersects during category compatibility checks.
- **`TemplateResolutionService`** (ADR-009-003): Queries `NotificationChannel` to evaluate channel capabilities during rendering.
- **Metadata Engine**: Supplies channel metadata schema definitions.
- **Tenant Context**: Supplies `tenantId` and `workspaceId` for multi-tenant data partitioning.

### Forbidden Dependencies:
- **Vendor Transport SDKs** (SMTP, Microsoft Graph, Twilio, Firebase): `NotificationChannel` MUST NEVER import or reference vendor driver libraries.
- **Provider Adapters**: `NotificationChannel` defines business channels; it does not contain physical adapter code.
- **Queue Workers & Brokers**: `NotificationChannel` MUST NEVER depend on background queues or message broker libraries.
- **Caller Business Modules**: `NotificationChannel` MUST NEVER import business application module logic.

---

# 15. Repository Lookup Patterns

The `NotificationChannel` repository MUST support the following standardized lookup methods:

- **`GetDefaultChannel(tenantId, channelType)`**: Resolves the single default active channel for a given channel type.
- **`ListEnabledChannels(tenantId)`**: Retrieves all `ACTIVE` and `isEnabled = true` channels for runtime routing.
- **`ListByChannelType(tenantId, channelType)`**: Returns all channels matching a specified channel type.
- **`ListActiveChannels(tenantId, category?)`**: Returns active channels compatible with an optional template category filter.
- **`ExistsChannelCode(tenantId, channelCode)`**: Evaluates whether a channel code exists within a tenant context.

---

# 16. Definition of Done

This Capability Contract (`CC-002`) is certified **COMPLETE** when all the following criteria are satisfied:

- [x] Aggregate root `NotificationChannel` defined with clear boundaries and `Small Aggregate` classification.
- [x] Aggregate Identity (`id`) vs. Business Identity (`tenantId` + `channelCode`) explicitly defined.
- [x] Business attributes mapped according to `ES-001` database conventions.
- [x] All 6 domain invariants formally documented and non-negotiable.
- [x] 4-stage aggregate lifecycle (`Draft` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`) defined.
- [x] 10 domain commands and 6 read queries specified.
- [x] 5 repository lookup patterns formally documented.
- [x] External identity references (`tenantId`, `workspaceId`, `userId`) audited for identity-only compliance.
- [x] Explicit domain ownership boundaries established (business media vs. vendor providers).
- [x] Validation rules and domain events formally defined.
- [x] Allowed vs. Forbidden dependencies audited against platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`).

**Status**: **100% READY FOR ENGINEERING WORK PACKAGE EWP-002 IMPLEMENTATION**.
