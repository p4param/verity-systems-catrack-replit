# ADR-009-002 — Channel & Provider Abstraction

| Field | Value |
| :--- | :--- |
| **ADR** | ADR-009-002 |
| **Title** | Channel & Provider Abstraction |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Architecture & Domain Governance |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |

---

# 1. Context

The CAP Notification Engine architecture is governed by frozen foundational documents:
- **VS09-P001 Communication & Notification Blueprint**: Mandated complete provider and channel independence, establishing that business modules emit high-level Notification Intents while the engine owns communication orchestration.
- **VS09-P002 Communication & Notification Architecture Guide**: Established the logical components, including Channel Routing and Delivery Orchestration.
- **VS09-P003 Communication & Notification Domain Model**: Formally identified `DeliveryChannel` as a domain concept and `DeliveryProvider` as an abstract external integration context.
- **ADR-009-001 Communication Delivery Model**: Established the queue-first, asynchronous processing pipeline and guaranteed that provider delivery failures never cause business transactions to fail or roll back.

To operationalize channel routing and external message transmission across enterprise tenants, CAP requires an authoritative decision defining the architectural separation between **Communication Channels** and **Delivery Providers**.

---

# 2. Problem Statement

Direct coupling between business applications and external communication services creates severe architectural anti-patterns:

1. **Vendor Lock-in & Fragility**: Hardcoding third-party vendor SDKs or specific API calls (e.g., SendGrid, Twilio, Firebase) inside business modules makes provider migration extremely costly and fragile.
2. **Inflexible Routing**: Enterprise tenants require custom delivery vendor choices, regional routing, cost optimization, and provider redundancy (primary/fallback) which cannot be achieved with hardcoded vendor integrations.
3. **Cascading Failure Risk**: Outages or rate limits at a specific third-party provider directly disrupt communication delivery unless automatic provider failover is abstracted behind a resilient platform boundary.
4. **Leaky Business Semantics**: Provider-specific concepts (e.g., vendor payload keys, specific HTTP headers, vendor status codes) leak into domain logic instead of remaining isolated behind transport adapters.

CAP requires a provider-independent communication architecture where business applications communicate exclusively with abstract **Communication Channels**, while concrete **Delivery Providers** are completely isolated behind metadata-driven **Provider Adapters**.

---

# 3. Decision: Channel & Provider Abstraction Architecture

CAP formally adopts an architectural separation between **Communication Channels** (which own business delivery media) and **Delivery Providers** (which own delivery mechanics).

### Simplified Architectural Flow
```
[ NotificationIntent ] ──> [ Notification ] ──> [ Channel ] ──> [ Provider Adapter ] ──> [ Vendor Provider ]
```

### Complete Component Architecture
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│              BUSINESS MODULES / WORKFLOW ENGINE / RUNTIME ENGINE                  │
│       (Communicates ONLY with abstract Communication Channels via Intents)        │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         │ Publishes Notification Intent
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION ENGINE PROCESSING PIPELINE                        │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                    ABSTRACT COMMUNICATION CHANNELS                          │  │
│  │     [ Email ]  [ SMS ]  [ Mobile Push ]  [ In-App ]  [ Webhook ] ...        │  │
│  └─────────────────────────────────────┬───────────────────────────────────────┘  │
│                                        │                                          │
│                                        │ Metadata-Driven Provider Selection        │
│                                        ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                      PROVIDER ADAPTER INTERFACES                            │  │
│  │   [ Email Adapter ]   [ SMS Adapter ]   [ Push Adapter ]   [ Webhook Adapter]  │  │
│  └─────────────────────────────────────┬───────────────────────────────────────┘  │
└────────────────────────────────────────┼──────────────────────────────────────────┘
                                         │
                                         │ Dispatches via Isolated Adapters
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        CONCRETE DELIVERY PROVIDERS                                │
│                                                                                   │
│   Email Providers:     Microsoft Graph │ SendGrid │ Amazon SES │ SMTP              │
│   SMS Providers:       Twilio │ MSG91 │ TextLocal                                 │
│   Push Providers:      Firebase (FCM) │ Apple Push (APNS)                         │
│   Webhook Providers:   HTTP Webhook │ Event Grid                                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. Detailed Decision Principles

## 4.1 Channel Abstraction & Intent Separation
Communication Channels represent **business delivery media**, not implementation technologies, specific software vendors, or business workflow logic.

### Distinction between NotificationIntent and Channel:
- **`NotificationIntent`**: Owns **business intent**. It declares what domain event occurred, encapsulates context payload parameters, and references target recipients.
- **`Channel`**: Owns **delivery media only** (Email, SMS, Push, In-App, Webhook). Channels define media-specific characteristics and layout expectations.
- **Rule**: Channels SHALL NEVER contain business workflow semantics, process logic, or business state rules.

Supported channel types include:
- `EMAIL`: Electronic mail delivery.
- `SMS`: Short Message Service text alerts.
- `PUSH`: Mobile device push notifications.
- `IN_APP`: In-application user notification inbox and real-time banner alerts.
- `WEBHOOK`: Event webhooks for external system integrations.
- `INTERNAL_MESSAGE`: Platform system-to-system messages.
- `FUTURE_CHANNELS`: Abstract extensibility slots for emerging communication channels.

**Rules**:
- Business applications and runtime components communicate ONLY with Channels via `NotificationIntent` declarations.
- Business applications SHALL NEVER reference, select, or configure concrete delivery providers.

---

## 4.2 Provider Abstraction
Delivery Providers represent **concrete physical transport implementations** capable of transmitting rendered messages to recipient endpoints over a specific channel.

Examples of Provider implementations by channel:
- **Email Providers**: Microsoft Graph API, SendGrid, Amazon SES, Standard SMTP.
- **SMS Providers**: Twilio, MSG91, TextLocal.
- **Push Providers**: Firebase Cloud Messaging (FCM), Apple Push Notification service (APNS).
- **Webhook Providers**: Standard HTTP Webhook Dispatcher, Azure Event Grid.

**Rules**:
- Providers SHALL be completely interchangeable without modifying business applications or template definitions.
- Providers own transport execution mechanics, vendor API payload formatting, network protocols, and vendor-specific delivery status code translation.

---

## 4.3 Provider Adapter Model & Ownership
The Notification Engine communicates with concrete delivery providers exclusively through generic **Provider Adapter Interfaces**:

$$\text{Notification Engine} \longrightarrow \text{Channel} \longrightarrow \text{Provider Adapter Interface} \longrightarrow \text{Concrete Provider Adapter} \longrightarrow \text{External Vendor Service}$$

**Ownership & Boundary Rules**:
- **Exclusive Engine Ownership**: Provider Adapters are owned **exclusively by the Communication & Notification Engine**.
- **No External Adapter Implementation**: No other bounded context (e.g., Business Modules, Workflow Engine, Identity Engine, Commercial Engine) may implement, instantiate, or own provider adapters.
- **Vendor SDK Isolation**: Vendor SDKs, API keys, HTTP headers, and network transport details are completely isolated inside concrete Provider Adapter implementations.
- Adding a new provider requires creating a new Provider Adapter without altering core engine components or existing channel routing rules.

---

## 4.4 Metadata-Driven Provider Selection
Provider selection is governed dynamically at runtime by metadata configuration rather than hardcoded logic.

The Provider Selection Engine evaluates the following criteria to determine the active provider:
1. **Tenant Configuration**: Tenant-specific preferred providers or custom enterprise provider credentials.
2. **Workspace Configuration**: Sub-tenant or regional workspace provider overrides.
3. **Channel Configuration**: Channel-level provider bindings and priority weights.
4. **Environment Context**: Environment-specific provider routing (e.g., Mock Provider for local/test, Amazon SES for production).
5. **Priority & SLA**: High-priority alert routing rules.
6. **Provider Availability & Health Status**: Real-time provider health metrics and circuit breaker states.

---

## 4.5 Multi-Provider Support & Redundancy
A single Communication Channel MAY be bound to multiple Providers in an ordered primary/fallback hierarchy.

**Examples**:
- **Email Channel**: Primary: `Microsoft Graph API` $\longrightarrow$ Fallback: `Amazon SES` $\longrightarrow$ Emergency Fallback: `SMTP`.
- **SMS Channel**: Primary: `MSG91` $\longrightarrow$ Fallback: `Twilio`.

**Rules**:
- Primary and fallback sequences are fully configurable per tenant and per channel via metadata.
- If the primary provider experiences failures or circuit trip, the engine automatically routes the dispatch to the next available fallback provider in the sequence.

---

## 4.6 Provider Health Monitoring & Automatic Failover
The Notification Engine actively monitors delivery provider health and executes automated failover:

- **Health Metrics**: Provider Adapters report delivery success rates, network latency, and vendor error response codes (e.g., 429 Rate Exceeded, 503 Service Unavailable).
- **Circuit Breaking**: When a provider's failure rate exceeds configured health threshold boundaries, the circuit breaker opens, marking the provider as `UNHEALTHY`.
- **Automatic Failover**: Dispatches targeting an `UNHEALTHY` provider are instantly rerouted to the secondary fallback provider without dropping messages.
- **Silent Recovery**: Provider failover and circuit recovery happen entirely in background worker pipelines. Business applications remain 100% unaware of provider failures.

---

## 4.7 Provider Capability Discovery
Different providers supporting the same channel expose varying technical capabilities.

Examples:
- **Email Channel**: Attachments, HTML rendering, Inline Images, Custom Headers.
- **SMS Channel**: Unicode support, Long Message concatenations, Sender ID customization.
- **Push Channel**: Rich media notifications, Action buttons, Silent data pushes.

**Rules**:
- Provider capabilities are exposed declaratively via **Provider Capability Metadata Contracts**.
- Content Composition and Channel Routing query provider metadata to determine capability support (e.g., whether to strip inline images if a fallback provider does not support them).
- Capabilities SHALL NOT be checked using hardcoded vendor type checks (`if (provider === "SENDGRID")`).

---

## 4.8 Runtime Independence
The following platform layers SHALL NEVER reference, import, or depend on concrete delivery providers:
- Business Application Modules (Events, Inventory, Purchasing, Kitchen, Dispatch, CRM)
- Workflow & Rules Engine
- Platform Scheduler Engine
- Runtime Application UI Layer

All platform components interact exclusively with abstract **Communication Channels** through high-level `NotificationIntent` declarations.

---

## 4.9 Provider Registration Model
Integration of new delivery providers follows a metadata-driven Registration Model:

```
[ Registered ] ──> [ Capability Discovery ] ──> [ Runtime Selection ]
```

1. **Registered**: Provider configuration and Provider Adapter binding are registered in the engine metadata registry.
2. **Capability Discovery**: Engine inspects the provider's declarative capability contract (supported features, constraints, payload limits).
3. **Runtime Selection**: Provider becomes eligible for dynamic selection by the Channel Routing and Provider Selection engine.

**Extensibility Rule**:
Providers MAY be added, updated, or replaced purely through **metadata registration** without modifying or redeploying business application code. Business modules SHALL NEVER instantiate providers directly.

---

## 4.10 Provider Metadata Lifecycle
The administrative status of a provider in the metadata registry follows a strict configuration lifecycle:

```
[ Registered ] ──> [ Enabled ] ──> [ Disabled ] ──> [ Retired ]
```

- **Registered**: Provider adapter and configuration registered; awaiting capability discovery and activation.
- **Enabled**: Provider active and eligible for runtime selection and fallback routing.
- **Disabled**: Provider temporarily suspended from routing (e.g., maintenance, credential update, manual override).
- **Retired**: Provider permanently decommissioned from routing rules.

**Lifecycle Scope**:
This lifecycle governs **provider metadata configuration states only**. It does not represent physical third-party vendor server infrastructure or runtime process instance states.

---

# 5. External Identity Ownership Matrix

All external identity attributes referenced by the Channel and Provider architecture are owned by their respective bounded contexts. The Notification Engine holds identity references only:

| Identity Attribute | Aggregate / Context Location | Owning Bounded Context | Description & Ownership |
| :--- | :--- | :--- | :--- |
| `tenantId` | `TenantContext`, `NotificationPolicy` | Tenant & Foundation Context | Uniquely identifies the owning tenant organization. Owned by Tenant Engine. |
| `workspaceId` | `TenantContext`, `ProviderSelectionRules` | Workspace Context | Identifies operational workspace boundary. Owned by Tenant Engine. |
| `notificationChannelId` | `DeliveryChannel`, `ChannelRoutingRules` | Notification Engine Context | Identifies abstract communication channel (e.g., `EMAIL`, `SMS`). Owned by Notification Engine. |
| `providerId` | `DeliveryProvider`, `ProviderAdapter` | Notification Engine Context | Identifies configured delivery provider instance. Owned by Notification Engine. |
| `templateId` | `NotificationTemplate` | Notification Engine Context | Identifies localized template definition. Owned by Notification Engine. |
| `userId` | `RecipientTarget`, `DeliveryEndpoint` | Identity & Access Context | Identifies individual user profile entity. Owned by Identity Engine (CM-002). |
| `workflowInstanceId` | `NotificationIntent` payload context | Workflow & Rules Context | Identifies originating workflow process instance. Owned by Workflow Engine. |

---

# 6. Architectural Invariants

The Channel and Provider Abstraction is governed by the following immutable invariants:

1. **Strict Business Channel Isolation**: Business modules publish `NotificationIntent` declarations to abstract Channels only. Business applications MUST NEVER reference, select, or communicate directly with delivery providers.
2. **Replaceable Provider Architecture**: Delivery Providers are completely replaceable transport implementations. Swapping or updating a provider MUST NOT require changes to business logic or template definitions.
3. **Adapter Boundary Isolation**: All vendor SDKs, wire protocols, API authentication secrets, and HTTP payload formatting MUST remain strictly isolated behind Provider Adapters.
4. **Metadata-Driven Provider Selection**: Provider selection, routing sequences, and fallback rules MUST be evaluated from metadata configuration at runtime, never hardcoded.
5. **Transparent Provider Failover**: Provider network outages or delivery failures MUST be handled transparently by engine failovers. Provider failures MUST NEVER propagate to or impact business application operations.
6. **Domain Responsibility Division**: Communication Channels own business delivery media definitions. Delivery Providers own transport execution mechanics and vendor API interactions.
7. **Intent vs Channel Ownership**: `NotificationIntent` owns business intent; `Channel` owns delivery media only. Channels SHALL NEVER contain business workflow semantics.
8. **Exclusive Adapter Ownership**: Provider Adapters are owned exclusively by the Communication & Notification Engine. Business modules SHALL NEVER instantiate, implement, or own provider adapters.
9. **Metadata Provider Registration**: Delivery providers MAY be added, updated, or replaced purely through metadata registration without modifying business application code.

---

# 7. Cross-Engine Impacts

| Engine / Subsystem | Impact & Integration Boundary |
| :--- | :--- |
| **Identity Engine (CM-002)** | Provides user profile attributes and contact endpoint addresses (e.g., email address, device push token, phone number) resolved during Recipient Resolution. |
| **Workflow Engine** | Publishes notification intents referencing abstract channels on workflow state changes. Receives optional asynchronous delivery callbacks. |
| **Scheduler Engine** | Triggers scheduled dispatches and digest batches targeting abstract channels without provider awareness. |
| **Metadata Engine** | Stores channel definitions, tenant provider selection rules, capability contracts, and provider configuration schemas. |
| **Audit & Compliance Engine** | Receives provider-agnostic delivery status events and provider submission audit receipts for regulatory archiving. |
| **Commercial Engine** | Provides tenant subscription tier channel entitlements used during Policy Evaluation to restrict access to premium channels. |
| **Runtime Engine** | Exposes in-app notification endpoints and UI message streams targeting the `IN_APP` channel abstraction. |

---

# 8. Alternatives Considered

### Alternative 1: Business Modules Calling Providers Directly
- *Description*: Business modules import vendor SDKs (e.g., Twilio SDK, SendGrid SDK) and invoke delivery services directly within domain code.
- *Reason for Rejection*: Violates ES-001, ES-008, ES-009, and ES-010. Introduces extreme vendor lock-in, latency coupling, zero multi-tenant policy enforcement, and complete failure of provider redundancy.

### Alternative 2: Hardcoded Provider Selection
- *Description*: Core engine uses static conditional logic (e.g., `switch(channel) { case EMAIL: useSendGrid(); }`) to select providers.
- *Reason for Rejection*: Prevents tenant-specific provider customization, prevents dynamic failover, requires code deployment to change vendors, and violates metadata-driven platform governance standards.

### Alternative 3: Single Provider Per Channel
- *Description*: Restrict each channel to exactly one fixed provider across the entire platform.
- *Reason for Rejection*: Eliminates provider redundancy, prevents automatic failover during vendor outages, and prevents enterprise tenants from bringing their own provider accounts.

### Alternative 4: Provider-Specific Business Logic
- *Description*: Allowing business applications or template definitions to specify vendor-specific payload attributes (e.g., SendGrid custom template IDs).
- *Reason for Rejection*: Leaks implementation vendor details into business metadata, preventing seamless provider swapping.

---

# 9. Consequences

### Positive Consequences
- **Complete Vendor Independence**: Switch, upgrade, or add delivery providers without touching business application code or notification templates.
- **Enterprise Resilience**: Automated provider health monitoring and fallback routing ensure zero delivery interruptions during third-party provider outages.
- **Tenant Flexibility**: Enables multi-tenant customization where enterprise tenants can configure their own dedicated provider credentials (e.g., custom SMTP or SendGrid accounts).
- **Capability Safety**: Provider capability metadata prevents formatting errors by dynamically adapting rendered content to provider features.

### Negative Consequences / Trade-offs
- **Adapter Maintenance**: Requires building and maintaining standardized Provider Adapters for each external delivery service integrated into the platform.
- **Least-Common-Denominator Formatting**: Advanced vendor-specific proprietary features must be abstracted through capability contracts.

---

# 10. Non-Goals

The following technical implementation concerns are explicitly excluded from this ADR:

1. **Queue Broker & Transport Technology**: Defining physical queue software, message brokers, or worker process topologies (governed by runtime deployment phases).
2. **Retry & Backoff Algorithms**: Specific exponential backoff formula implementations (governed by ADR-009-001 and delivery contracts).
3. **Template Rendering Engine**: Specific template interpolation algorithms or HTML parsing libraries (governed by template contracts).
4. **Recipient Directory Lookups**: Physical database queries for user profile resolution (governed by Identity Engine CM-002 contracts).
5. **Concrete Provider SDK Driver Code**: Writing physical TypeScript/Node.js adapter classes for SendGrid, Twilio, or Firebase (governed by concrete implementation packages).

---

# 11. Related Documents

- **VS09-P001 — Communication & Notification Blueprint**
- **VS09-P002 — Communication & Notification Architecture Guide**
- **VS09-P003 — Communication & Notification Domain Model**
- **ADR-009-001 — Communication Delivery Model**
- **ES-001 — Architectural Governance Standard**
- **ES-008 — Asynchronous Integration Standard**
- **ES-009 — Multi-Tenant Data & Processing Isolation**
- **ES-010 — System Resilience & Fault-Tolerance Principles**
- **ES-013 — Engine Architecture Governance Standard**
