# CC-005 — Provider Profile

| Field | Value |
| :--- | :--- |
| **Contract ID** | CC-005 |
| **Title** | Provider Profile Capability Contract |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Capability Contract |
| **Status** | Approved |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing ADRs** | ADR-009-001, ADR-009-002, ADR-009-003, ADR-009-004 |

---

# 1. Architecture Compliance Statement

This Capability Contract (`CC-005`) formally defines the provider registration and operational metadata boundary established by frozen architecture governance artifacts:
- **AFR-001 — VS09 Architecture Freeze Review**
- **ADR-009-001 — Communication Delivery Model**
- **ADR-009-002 — Channel & Provider Abstraction**
- **ADR-009-003 — Template Resolution & Personalization**
- **ADR-009-004 — Queue, Retry & Delivery Tracking**

This document conforms strictly to CAP platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`). **No architectural changes or concrete provider adapter implementations are introduced.**

---

# 2. Purpose

The **`ProviderProfile`** aggregate root represents the **business registration and operational metadata** for a communication delivery provider within the VS09 Communication & Notification Engine.

Supported provider classifications include:
- `EMAIL_PROVIDER`: SMTP, Microsoft Graph API, SendGrid, Amazon SES, Mailgun.
- `SMS_PROVIDER`: Twilio, MSG91, AWS SNS, Infobip.
- `PUSH_PROVIDER`: Firebase Cloud Messaging (FCM), Apple Push Notification Service (APNS).
- `IN_APP_PROVIDER`: Internal WebSocket / SignalR push stream.
- `WEBHOOK_PROVIDER`: Generic HTTP webhook dispatcher.

### Core Principles:
- `ProviderProfile` encapsulates **metadata, capabilities, priority, health state, and routing eligibility**.
- `ProviderProfile` **SHALL NOT represent concrete Provider Adapters**. Provider Adapters remain isolated infrastructure transport components defined in ADR-009-002.
- `ProviderProfile` **does NOT manage API keys, raw OAuth credentials, HTTP client instances, or SDK drivers**.

---

# 3. Aggregate Definition & Identity Model

| Element | Specification |
| :--- | :--- |
| **Aggregate Name** | `ProviderProfile` |
| **Aggregate Root** | `ProviderProfile` |
| **Bounded Context** | `Communication & Notification Engine` |
| **Aggregate Classification**| **`Medium Aggregate`** (~15–20 attributes, encapsulates capability matrix and health telemetry metadata). |
| **Aggregate Identity** | **`ProviderProfileId` (`id`)** — Surrogate UUID Primary Key used by repositories for persistence and ORM identity tracking. |
| **Business Identity** | **`tenantId` + `providerCode`** — Unique natural business key enforcing provider registration uniqueness per tenant. |
| **Identity Persistence Rule** | Repositories persist and query by Aggregate Identity (`id`), while business lookup rules and routing decisions are enforced through Business Identity (`tenantId` + `providerCode`). |
| **Multi-Tenancy Mode** | Explicit `TenantContext` isolation (`tenantId`, `workspaceId`). |

---

# 4. Business Responsibilities

The `ProviderProfile` aggregate root is responsible for enforcing the following business capabilities:

### What `ProviderProfile` OWNS:
1. **Provider Business Registration**: Maintain unique provider codes, display names, and provider type classifications.
2. **Supported Channels & Capabilities**: Declare compatible delivery channel types (`EMAIL`, `SMS`, `PUSH`, `IN_APP`, `WEBHOOK`) and feature capabilities (e.g., attachments, batching, template rendering, tracking receipts).
3. **Routing Priority & Weighting**: Maintain numerical priority weighting (`priority`) used by `ChannelRoutingService` during runtime selection.
4. **Health & Circuit Status**: Maintain health status indicators (`HEALTHY`, `DEGRADED`, `UNHEALTHY`, `CIRCUIT_TRIPPED`) and last health check timestamps.
5. **Provider Metadata & Settings**: Store non-credential operational metadata (rate limits, batch limits, timeout thresholds).

### What `ProviderProfile` DOES NOT OWN:
- **Provider Adapters & Drivers**: Owned exclusively by VS09 Provider Adapter implementations (ADR-009-002).
- **Authentication Credentials & API Keys**: Secrets managed securely in Vault/KeyVault; never stored in domain aggregates.
- **SDK & Network Transports**: Physical HTTP/REST/gRPC network calls managed by Provider Adapters.
- **Channel Routing Service Logic**: Selection and failover execution logic executed by `ChannelRoutingService`.
- **Delivery Queue Execution**: Managed by background workers (ADR-009-004).

---

# 5. Business Attributes

All attributes follow CAP platform database naming conventions specified in **ES-001**:

| Attribute Name | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Required | Aggregate Identity (`ProviderProfileId`). |
| `tenantId` | `UUID` | Foreign Key, Required | Part of Business Identity. Identifies owning tenant. (Owned by Tenant Engine). |
| `workspaceId` | `UUID` | Foreign Key, Optional | Identifies operational workspace boundary. (Owned by Tenant Engine). |
| `providerCode` | `String(100)` | Required, Part of Business ID | Unique business code identifying provider (e.g., `SENDGRID_PRIMARY`). |
| `providerName` | `String(255)` | Required | Human-readable title of provider instance. |
| `providerType` | `Enum` | Required, Immutable | Classification (`EMAIL_PROVIDER`, `SMS_PROVIDER`, `PUSH_PROVIDER`, `IN_APP_PROVIDER`, `WEBHOOK_PROVIDER`). |
| `supportedChannels` | `Array<Enum>` | Required, Non-Empty | Compatible abstract channels (e.g., `[EMAIL]`, `[SMS]`). |
| `capabilityProfile` | `JSONMap` | Required | Capability descriptor matrix (supports attachments, batch size, tracking). |
| `priority` | `Integer` | Required, Default `100` | Priority weighting for channel selection (lower number = higher priority). |
| `status` | `Enum` | Required | Lifecycle state (`REGISTERED`, `ENABLED`, `DISABLED`, `RETIRED`). |
| `healthStatus` | `Enum` | Required, Default `HEALTHY` | Operational health state (`HEALTHY`, `DEGRADED`, `UNHEALTHY`, `CIRCUIT_TRIPPED`). |
| `isDefault` | `Boolean` | Required, Default `false` | Indicates whether this is default provider for its supported channel. |
| `isEnabled` | `Boolean` | Required, Default `true` | Operational toggle switch for runtime routing eligibility. |
| `configurationMetadata` | `JSONMap` | Optional | Non-credential operational parameters (timeout ms, retry limits). |
| `lastHealthCheck` | `Timestamp` | Optional | UTC timestamp of last completed automated health check probe. |
| `createdAt` | `Timestamp` | Required, System Managed | UTC timestamp when provider was registered. |
| `createdBy` | `UUID` | Required, System Managed | User ID or administrator ID of registrant (owned by Identity Engine CM-002). |
| `updatedAt` | `Timestamp` | Required, System Managed | UTC timestamp when provider profile was last updated. |
| `updatedBy` | `UUID` | Required, System Managed | User ID or system process of last updater. |
| `version` | `Integer` | Required, Optimistic Lock | OCC aggregate version counter for concurrent modification protection. |

---

# 6. Business Invariants

The `ProviderProfile` aggregate guarantees the following domain invariants:

1. **Unique Provider Code**: The Business Identity combination of `(tenantId, providerCode)` MUST be unique across the platform.
2. **Immutable Provider Type**: `providerType` is strictly **immutable** once registered and CANNOT be modified.
3. **Single Default Per Channel**: Only ONE active `ProviderProfile` per `(tenantId, channelType)` can have `isDefault = true`. Setting a provider as default unsets `isDefault` on previous default providers for that channel.
4. **Disabled Routing Boundary**: Disabled providers (`isEnabled = false` or `status = DISABLED`) or un-routable providers (`status = RETIRED`, `healthStatus = CIRCUIT_TRIPPED`) MUST NOT participate in channel routing selection.
5. **Retired Immutability**: Providers in `RETIRED` status (terminal state) are permanently immutable and CANNOT be reactivated.
6. **No Secret Storage**: `ProviderProfile` attributes MUST NEVER store plain-text API keys, SMTP passwords, or OAuth tokens.

---

# 7. Lifecycle

The `ProviderProfile` aggregate root undergoes a deterministic 4-stage administrative lifecycle:

```
[ Registered ] ──► [ Enabled ] ──► [ Disabled ] ──► [ Retired ] (Terminal)
```

### Lifecycle Transition Rules:
- **`REGISTERED`**: Provider profile registered with metadata and capabilities. Awaiting verification/activation.
- **`ENABLED`**: Provider is fully operational, healthy, and eligible for runtime channel routing dispatches.
- **`DISABLED`**: Provider is administratively disabled or circuit-tripped due to outage. Routing bypasses this provider.
- **`RETIRED`**: Provider is permanently decommissioned. **Terminal state**. Immutable configuration ledger.

---

# 8. Commands

The `ProviderProfile` aggregate exposes the following domain commands:

| Command | Arguments | Business Description |
| :--- | :--- | :--- |
| **`RegisterProvider`** | `tenantId`, `providerCode`, `providerName`, `providerType`, `supportedChannels`, `capabilityProfile` | Instantiates a new `ProviderProfile` in `REGISTERED` status. |
| **`EnableProvider`** | `providerId`, `enabledBy` | Transitions provider from `REGISTERED` or `DISABLED` to `ENABLED`. |
| **`DisableProvider`** | `providerId`, `reason` | Transitions an `ENABLED` provider to `DISABLED` status. |
| **`RetireProvider`** | `providerId`, `retiredBy` | Transitions a provider to `RETIRED` (terminal state). |
| **`UpdateMetadata`** | `providerId`, `providerName`, `configurationMetadata` | Updates editable operational metadata parameters. |
| **`SetPriority`** | `providerId`, `priority` | Updates routing priority weighting. |
| **`SetDefault`** | `providerId`, `channelType` | Marks provider as default for a channel, unsetting previous defaults. |
| **`UpdateHealthStatus`** | `providerId`, `healthStatus`, `lastHealthCheck` | Updates automated health status telemetry and circuit state. |

---

# 9. Queries

The `ProviderProfile` aggregate supports the following read queries:

| Query | Parameters | Return Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`GetById`** | `providerId` | `ProviderProfileDTO` | Fetches provider aggregate by Aggregate Identity (`id`). |
| **`GetByCode`** | `tenantId`, `providerCode` | `ProviderProfileDTO` | Fetches provider aggregate by Business Identity (`tenantId` + `providerCode`). |
| **`GetDefaultProvider`**| `tenantId`, `channelType` | `ProviderProfileDTO` | Resolves current default active provider for a channel type. |
| **`ListEnabled`** | `tenantId` | `List<ProviderProfileDTO>` | Returns all `ENABLED` providers for a tenant. |
| **`ListByChannel`** | `tenantId`, `channelType` | `List<ProviderProfileDTO>` | Returns all providers supporting a specific channel type. |
| **`ListHealthyProviders`**| `tenantId`, `channelType` | `List<ProviderProfileDTO>` | Returns enabled, healthy providers eligible for runtime routing. |

---

# 10. External References

External entity attributes referenced by `ProviderProfile` are held **by identity reference only**:

| External Attribute | Owning Bounded Context | Relationship Type | Rules & Restrictions |
| :--- | :--- | :--- | :--- |
| `tenantId` | Tenant Engine | Identity Reference | Identifies owning tenant organization. No domain ownership transfer. |
| `workspaceId` | Tenant Engine | Identity Reference | Identifies operational workspace boundary. No domain ownership transfer. |
| `channelId` | VS09 Channel Context | Identity Reference | Foreign identity reference to supported `NotificationChannel` (CC-002). |
| `providerAdapterId` | Infrastructure Context | Identity Reference | Reserved for binding to physical Provider Adapter instance (ADR-009-002). |

---

# 11. Ownership Rules

The `ProviderProfile` aggregate owns its domain metadata strictly:

### What `ProviderProfile` OWNS:
- Provider registration metadata, display name, and type classification.
- Capability matrix descriptor (`capabilityProfile`).
- Priority weighting and default provider flags (`isDefault`).
- Lifecycle status (`REGISTERED`, `ENABLED`, `DISABLED`, `RETIRED`) and health status (`HEALTHY`, `CIRCUIT_TRIPPED`).
- Non-secret operational configuration parameters.

### What `ProviderProfile` DOES NOT OWN:
- **Provider Adapters**: Owned exclusively by Provider Adapter classes (ADR-009-002).
- **Authentication Secrets & API Keys**: Managed securely outside domain models in secret vaults.
- **HTTP / Transports**: Physical network calls executed by infrastructure transport clients.
- **Retry Logic & Workers**: Executed by worker queues (ADR-009-004).
- **Channel Routing Logic**: Evaluated dynamically by `ChannelRoutingService`.

---

# 12. Validation Rules

The `ProviderProfile` aggregate enforces the following input validation rules:

1. **Provider Code Required**: `providerCode` MUST NOT be null, empty, or contain whitespace/special characters outside `[A-Z0-9_]`.
2. **Provider Name Required**: `providerName` MUST NOT be null or empty (max length 255 characters).
3. **Supported Channels Required**: `supportedChannels` MUST contain at least one valid channel enum.
4. **Capability Profile Required**: `capabilityProfile` MUST be a valid JSON Schema descriptor map.
5. **Provider Type Immutable**: `providerType` CANNOT be updated after creation.
6. **Single Default Verification**: Setting `isDefault = true` MUST enforce single-default validation across tenant providers for that channel type.

---

# 13. Domain Events

The `ProviderProfile` aggregate emits the following immutable domain events:

| Domain Event | Event Payload Attributes | Business Description |
| :--- | :--- | :--- |
| **`ProviderRegistered`** | `providerId`, `tenantId`, `providerCode`, `providerType`, `createdAt` | Emitted when a new provider is registered. |
| **`ProviderEnabled`** | `providerId`, `tenantId`, `providerCode`, `enabledBy`, `enabledAt` | Emitted when a provider is enabled for routing. |
| **`ProviderDisabled`** | `providerId`, `tenantId`, `providerCode`, `reason`, `disabledAt` | Emitted when a provider is disabled or circuit-tripped. |
| **`ProviderRetired`** | `providerId`, `tenantId`, `providerCode`, `retiredBy`, `retiredAt` | Emitted when a provider reaches `RETIRED` terminal state. |
| **`ProviderHealthChanged`**| `providerId`, `tenantId`, `previousStatus`, `newStatus`, `timestamp` | Emitted when automated health probes update health status. |
| **`ProviderPriorityChanged`**| `providerId`, `tenantId`, `previousPriority`, `newPriority` | Emitted when priority weighting is updated. |

---

# 14. Dependencies

### Allowed Dependencies:
- **`NotificationChannel`** (CC-002): Intersects during capability and channel compatibility checks.
- **Metadata Engine**: Supplies provider configuration schema definitions.
- **`ChannelRoutingService`**: Queries `ProviderProfile` to evaluate healthy routing targets.

### Forbidden Dependencies:
- **Vendor SDKs** (SMTP, Twilio SDK, Microsoft Graph SDK, Firebase SDK): `ProviderProfile` MUST NEVER import vendor driver libraries.
- **HTTP Transport Clients**: `ProviderProfile` does not contain network code.
- **Queue Workers**: `ProviderProfile` MUST NEVER depend on background queues or worker loops.
- **Caller Business Modules**: `ProviderProfile` MUST NEVER import business application module logic.

---

# 15. Repository Lookup Patterns

The `ProviderProfile` repository MUST support the following standardized lookup methods:

- **`GetDefaultProvider(tenantId, channelType)`**: Resolves the default active provider for a channel type.
- **`ListHealthyProviders(tenantId, channelType)`**: Retrieves all `ENABLED` and `HEALTHY` providers eligible for runtime routing.
- **`ListByChannel(tenantId, channelType)`**: Returns all registered providers supporting a specific channel.
- **`ListEnabledProviders(tenantId)`**: Returns all operational enabled providers.
- **`ExistsProviderCode(tenantId, providerCode)`**: Evaluates whether a provider code exists within a tenant context.

---

# 16. Capability Dependency Matrix

The `ProviderProfile` aggregate interacts with other VS09 capability contracts as follows:

| Capability Contract | Inter-Aggregate Relationship | Description |
| :--- | :--- | :--- |
| **CC-001 Notification Template** | Independent | No direct dependency. Templates are channel-neutral and provider-agnostic. |
| **CC-002 Notification Channel** | References (`supportedChannels`) | `ProviderProfile` declares compatibility with abstract `NotificationChannel` types. |
| **CC-003 Notification** | Referenced During Delivery | `NotificationDelivery` binds to a specific `providerId` during provider selection. |
| **CC-004 Notification Recipient**| Indirect | Recipient endpoint format influences provider selection compatibility. |
| **CC-006 Delivery Tracking** | Future Integration | Future tracking logs map delivery receipts back to `providerId`. |

---

# 17. Definition of Done

This Capability Contract (`CC-005`) is certified **COMPLETE** when all the following criteria are satisfied:

- [x] Aggregate root `ProviderProfile` defined with clear boundaries and `Medium Aggregate` classification.
- [x] Aggregate Identity (`id`) vs. Business Identity (`tenantId` + `providerCode`) explicitly defined.
- [x] Business attributes mapped according to `ES-001` database conventions.
- [x] All 6 domain invariants formally documented and non-negotiable.
- [x] 4-stage provider lifecycle (`Registered` $\rightarrow$ `Enabled` $\rightarrow$ `Disabled` $\rightarrow$ `Retired`) defined.
- [x] 8 domain commands and 6 read queries specified.
- [x] 5 repository lookup patterns formally documented.
- [x] Complete Capability Dependency Matrix documented.
- [x] Explicit domain ownership boundaries established (business metadata vs. vendor Provider Adapters).
- [x] Validation rules and domain events formally defined.
- [x] Allowed vs. Forbidden dependencies audited against platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`).

**Status**: **100% READY FOR ENGINEERING WORK PACKAGE EWP-005 IMPLEMENTATION**.
