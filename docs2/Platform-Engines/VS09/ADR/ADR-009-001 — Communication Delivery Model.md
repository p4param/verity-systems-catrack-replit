# ADR-009-001 — Communication Delivery Model

| Field | Value |
| :--- | :--- |
| **ADR** | ADR-009-001 |
| **Title** | Communication Delivery Model |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Architecture & Domain Governance |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |

---

# 1. Context

The CAP Notification Engine foundation documents have been approved and frozen:
- **VS09-P001 Communication & Notification Blueprint**: Established the vision of a generic, metadata-driven, multi-tenant communication platform where business modules publish Notification Intents and the engine owns the communication boundary.
- **VS09-P002 Communication & Notification Architecture Guide**: Defined the logical architectural components, bounded context, and the end-to-end **Notification Processing Pipeline**.
- **VS09-P003 Communication & Notification Domain Model**: Formally defined the domain aggregates (`NotificationIntent`, `NotificationTemplate`, `NotificationPolicy`, `NotificationPreference`, `NotificationDelivery`), domain services, value objects, and domain invariants.

To operationalize the communication domain, CAP requires an authoritative decision establishing the concrete **Communication Delivery Model**. This model dictates how notifications move from intent publication to final delivery execution across external providers while adhering to platform standards:
- **ES-001**: Architectural Governance and strict domain decoupling.
- **ES-008**: Asynchronous Integration and non-blocking event-driven communication.
- **ES-009**: Multi-Tenant Isolation across data, policies, and processing workloads.
- **ES-010**: System Resilience, fault isolation, and graceful degradation principles.

---

# 2. Problem Statement

Direct or synchronous communication dispatch introduces severe architectural risks into enterprise application platforms:

1. **Transaction Latency Coupling**: Performing recipient resolution, template fetching, content rendering, or provider network calls synchronously within a business module transaction adds significant delay and risks transaction timeouts.
2. **Cascading Failure Vulnerability**: External communication provider outages, rate limits, or network failures directly break originating business transactions if communications are coupled to domain execution.
3. **Spike Workload Vulnerability**: High-volume business event bursts (e.g., bulk order approvals, platform-wide alert broadcasts) can overwhelm synchronous processing channels, causing message loss or system degradation.
4. **Tenant Noise Interference**: A high-volume tenant can starve shared communication resources, impacting delivery times for other tenants.

CAP requires a communication delivery architecture that guarantees zero latency overhead for business transactions, fault-isolated multi-tenant execution, high throughput buffering, at-least-once delivery reliability, and strict adherence to recipient preferences.

---

# 3. Decision: Communication Delivery Model

CAP formally adopts a **Queue-First, Asynchronous, Policy-Gated Communication Delivery Architecture**.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           BUSINESS MODULE BOUNDARY                                │
│  (Events, Inventory, Purchasing, Kitchen, Dispatch, CRM, Workflow Engines)        │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         │ 1. Publishes Notification Intent
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      INGESTION & BUFFERING BOUNDARY                               │
│  ┌────────────────────────┐             ┌──────────────────────────────────────┐  │
│  │ Intent Ingestion       ├────────────►│ Ingestion Queue Buffer               │  │
│  │ (Validation & Context) │             │ (Non-Blocking Acknowledgment)        │  │
│  └────────────────────────┘             └──────────────────┬───────────────────┘  │
└────────────────────────────────────────────────────────────┼──────────────────────┘
                                                             │
                                                             │ 2. Asynchronous Pull
                                                             ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                 NOTIFICATION PROCESSING PIPELINE (ENGINE BOUNDARY)                │
│                                                                                   │
│  ┌────────────────────────┐             ┌──────────────────────────────────────┐  │
│  │ Recipient Resolution   ├────────────►│ Identity Engine (User Profiles & Ref)│  │
│  └───────────┬────────────┘             └──────────────────────────────────────┘  │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐             ┌──────────────────────────────────────┐  │
│  │ Policy Evaluation      ├────────────►│ Policies, Preferences & Opt-outs   │  │
│  └───────────┬────────────┘             └──────────────────────────────────────┘  │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐             ┌──────────────────────────────────────┐  │
│  │ Template Resolution    ├────────────►│ Metadata Engine (Templates & Branding)  │
│  └───────────┬────────────┘             └──────────────────────────────────────┘  │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐                                                       │
│  │ Content Composition    │                                                       │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐             ┌──────────────────────────────────────┐  │
│  │ Channel Routing        ├────────────►│ Channel Dispatch Queues              │  │
│  └────────────────────────┘             └──────────────────┬───────────────────┘  │
└────────────────────────────────────────────────────────────┼──────────────────────┘
                                                             │
                                                             │ 3. Asynchronous Dispatch
                                                             ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         DELIVERY INTEGRATION BOUNDARY                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Pluggable Channel Dispatchers / External Communication Providers            │  │
│  └──────────────────────────────────────┬──────────────────────────────────────┘  │
└─────────────────────────────────────────┼─────────────────────────────────────────┘
                                          │
                                          │ 4. Delivery Status Receipt
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      DELIVERY TRACKING & AUDIT BOUNDARY                           │
│  ┌────────────────────────┐             ┌──────────────────────────────────────┐  │
│  │ Delivery Tracking      ├────────────►│ Audit & Compliance Engine            │  │
│  │ (Status State Machine) │             │ (Lifecycle Audit Logs)               │  │
│  └────────────────────────┘             └──────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Under this decision:
1. **Business Modules Publish Notification Intents Only**: Originating applications publish an immutable `NotificationIntent` declaring what occurred, dynamic context payload, and target recipient references. Business modules NEVER specify delivery channels, formatting, or providers.
2. **Queue-First Ingestion**: Incoming Notification Intents are immediately validated for schema compliance and Tenant Context, then buffered into a non-blocking Ingestion Queue. The publishing call completes immediately upon queue buffering.
3. **Pipeline Asynchrony**: Recipient Resolution, Policy & Preference Evaluation, Template Resolution, Content Composition, Channel Routing, and Delivery Dispatch execute entirely asynchronously in background worker contexts.
4. **Policy & Preference Gating**: Channel selection, quiet hour enforcement, rate limiting, and opt-out filtering occur dynamically within the pipeline prior to content composition.
5. **Channel Dispatch Separation**: Rendered messages are placed into Channel Dispatch Queues segregated by channel and delivery priority to guarantee fair-share tenant throughput and provider isolation.

---

# 4. Communication Delivery Lifecycle

The execution lifecycle of a `NotificationDelivery` aggregate follows a strict, unidirectional state machine:

```
                  ┌──────────────────────┐
                  │   INTENT_INGESTED    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ RECIPIENTS_RESOLVED  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   POLICY_EVALUATED   │
                  └──────┬───────────┬───┘
                         │           │
      (Filtered /        │           │ (Channels Eligible)
       Opted-Out)        │           ▼
                         │    ┌───────────────┐
                         │    │CONTENT_COMPOSED│
                         │    └──────┬────────┘
                         │           │
                         │           ▼
                         │    ┌───────────────┐
                         │    │DELIVERY_DISPATCHED
                         │    └──────┬────────┘
                         │           │
                         │           ├────────────────────────┐
                         ▼           ▼                        ▼
                  ┌────────────┐┌────────────┐        ┌──────────────┐
                  │ SUPPRESSED ││ DELIVERED  │        │   FAILED     │
                  └────────────┘└────────────┘        └──────────────┘
```

### State Definitions:
1. `INTENT_INGESTED`: The `NotificationIntent` has been accepted, validated, stamped with Tenant Context, and persisted to the ingestion log.
2. `RECIPIENTS_RESOLVED`: Target recipient references (Users, Roles, Groups) have been expanded into concrete recipient profiles and active contact endpoints.
3. `POLICY_EVALUATED`: Tenant policies, quiet hours, rate thresholds, and recipient channel preferences have been evaluated. Active delivery channels are determined.
4. `CONTENT_COMPOSED`: Localized templates and layout branding have been fetched, and dynamic parameters have been rendered into channel-ready message payloads (`RenderedContent`).
5. `DELIVERY_DISPATCHED`: Rendered message payloads have been placed into Channel Dispatch Queues and submitted to external provider integration dispatchers.
6. `DELIVERY_CONFIRMED` *(Terminal)*: Delivery confirmation, webhook receipt, or provider success status received and logged.
7. `DELIVERY_SUPPRESSED` *(Terminal)*: Notification was filtered out due to recipient opt-out, active quiet hours without fallback, or tenant frequency capping rules.
8. `DELIVERY_FAILED` *(Terminal)*: Delivery attempts exhausted all retries or encountered unrecoverable provider failures; recorded for dead-letter auditing.

---

# 5. Queue-First Architecture & Asynchronous Delivery

To enforce non-blocking execution and high-throughput buffering, the delivery model establishes a **Dual-Tier Queue Architecture**:

### Tier 1: Ingestion Queue Buffer
- Ingests raw `NotificationIntent` payloads directly from business applications.
- Operates with minimal processing overhead (schema validation and Tenant Context attachment only).
- Protects originating business modules from downstream pipeline latency or processing bottlenecks.

### Tier 2: Channel Dispatch Queues
- Buffers rendered `RenderedContent` messages ready for external transmission.
- Segregated by Delivery Channel type (e.g., In-App, Mobile Push, Email, Webhook) and Priority Level (`Critical`, `High`, `Normal`, `Batch`).
- Enables independent worker scaling, rate throttling, and concurrency control per channel type.

### Processing Guarantees:
- **Publisher Non-Blocking**: Publishing an intent takes `< 10ms` overhead on the originating transaction thread.
- **Tenant Throughput Isolation**: Queue consumers apply fair-share algorithms ensuring high-volume intent publishing by one tenant cannot starve lower-volume tenants.
- **Asynchronous Execution**: Pipeline steps operate in background worker contexts, completely decoupled from caller HTTP/RPC requests.

---

# 6. Delivery Reliability Principles

Adhering to **ES-010 (Resilience & Fault Tolerance)**, the delivery model implements five core reliability mechanisms:

### 1. At-Least-Once Delivery
Every valid `NotificationIntent` accepted by the Ingestion Queue guarantees at-least-once delivery processing. Notifications are only marked terminal once a delivery receipt, suppression event, or dead-letter state is recorded.

### 2. Idempotency Safeguards
- Every `NotificationIntent` carries a unique `IntentID` and optional client-provided `IdempotencyKey`.
- If duplicate intents with the same `IdempotencyKey` are published within an idempotency window, the engine suppresses duplicate processing and returns the existing processing state.

### 3. Exponential Backoff & Randomized Jitter
- Transient delivery attempt failures (e.g., network timeout, provider rate limiting 429) trigger automatic retries.
- Retry intervals increase exponentially with randomized jitter to prevent thundering-herd scenarios on external provider endpoints.

### 4. Failure Boundaries & Dead-Letter Isolation
- Permanent errors (e.g., invalid endpoint address, unresolvable template, persistent 4xx client errors) bypass retries and transition directly to `DELIVERY_FAILED`.
- Unresolvable notifications are isolated into a Dead-Letter Audit store for administrative inspection without impacting pipeline execution.
- **Transaction Isolation**: Under no circumstances can a delivery failure, provider outage, or dead-letter event cause an upstream business application transaction to roll back.

### 5. Automated Circuit Breaking
- Channel dispatchers monitor external provider error rates.
- If a provider error rate exceeds threshold boundaries, the circuit breaker opens, automatically rerouting notifications to secondary fallback channels or holding non-critical messages in retry buffers.

---

# 7. Aggregate Responsibilities

The delivery model enforces clear domain aggregate boundaries defined in `VS09-P003`:

| Aggregate | Delivery Model Responsibility |
| :--- | :--- |
| **`NotificationIntent`** | Holds immutable intent declaration, context payload, recipient targets, and Tenant Context. Strictly immutable after ingestion; payload updates require publishing a new `NotificationIntent`. |
| **`NotificationTemplate`** | Supplies localized content blueprints and layout wrappers during Content Composition. |
| **`NotificationPolicy`** | Supplies tenant frequency rules, quiet hour windows, and channel priority rules during Policy Evaluation. |
| **`NotificationPreference`** | Supplies recipient channel matrix choices, opt-outs, and consents during Policy Evaluation. |
| **`NotificationDelivery`** | Manages the delivery lifecycle state machine, stores routing decisions, captures `RenderedContent`, and logs `DeliveryAttempt` records. |

---

# 8. External Identity Ownership Matrix

To maintain strict domain boundaries, all external identity attributes referenced by Notification Engine aggregates are owned exclusively by their originating bounded contexts. The Notification Engine holds identity references only:

| External Reference Attribute | Aggregate / Value Object Location | Owning Bounded Context | Responsibility & Ownership |
| :--- | :--- | :--- | :--- |
| `tenantId` | `TenantContext`, `NotificationIntent`, `NotificationDelivery`, `NotificationTemplate`, `NotificationPolicy` | Tenant & Foundation Context | Identifies owning tenant organization. Owned by Tenant Engine. |
| `workspaceId` | `TenantContext`, `NotificationIntent` | Workspace Context | Identifies operational workspace boundary. Owned by Tenant Engine. |
| `userId` | `RecipientTarget`, `NotificationPreference`, `DeliveryAttempt` | Identity & Access Context | Identifies individual user profile entity. Owned by Identity Engine. |
| `workflowInstanceId` | `NotificationIntent` context payload | Workflow & Rules Context | Identifies originating workflow execution. Owned by Workflow Engine. |
| `documentId` | `NotificationIntent` context payload | Document Management Context | Identifies associated business document. Owned by Document Engine. |

---

# 9. Runtime Interaction Boundaries

The delivery model defines three distinct runtime interaction boundaries:

1. **Ingest Boundary (Synchronous / Inbound)**:
   - Business modules interact via a lightweight, non-blocking ingestion contract.
   - Accepts intent payload, validates schema, attaches Tenant Context, enqueues to Tier 1 Ingestion Queue, and returns intent receipt immediately.

2. **Processing Pipeline Boundary (Asynchronous / Internal)**:
   - Background worker processes pull intents from Tier 1 Queue.
   - Executes Recipient Resolution, Policy Evaluation, Template Resolution, and Content Composition in isolated execution blocks.
   - Enqueues rendered payloads into Tier 2 Channel Dispatch Queues.

3. **Delivery Integration Boundary (Asynchronous / Outbound)**:
   - Dedicated channel worker dispatchers consume messages from Tier 2 Queues.
   - Interacts with pluggable provider integration adapters.
   - Captures delivery receipts and updates `NotificationDelivery` lifecycle states.

---

# 10. Workflow Integration Boundaries

Integration between the Notification Engine and the **CAP Workflow & Rules Engine** follows strict asynchronous rules:

- **State Event Notifications**: The Workflow Engine publishes `NotificationIntent` declarations when workflow states transition (e.g., approval requested, document signed, task assigned).
- **Asynchronous Feedback Callbacks**: For workflows requiring confirmation of notification delivery (e.g., waiting for urgent operational alert acknowledgment), the Notification Engine emits asynchronous status events back to the Workflow Engine.
- **Zero Workflow Blocking**: Workflow state execution NEVER synchronously waits for notification delivery transmission.

---

# 11. Scheduler Interaction Boundaries

Integration between the Notification Engine and the **CAP Platform Scheduler Engine** governs delayed and aggregated communications:

1. **Scheduled Notifications**: Notifications declared with a future delivery timestamp are buffered in a scheduled staging state. The Scheduler Engine triggers dispatch when the scheduled timestamp matures.
2. **Digest Aggregation Windows**: Non-urgent notifications marked for summary digests are held in aggregation buffers. The Scheduler Engine periodically triggers batch digest rendering and dispatch.
3. **Quiet Hour Release**: Non-critical notifications held due to active recipient quiet hours are released by the Scheduler Engine when the quiet hour window expires.

---

# 12. Architectural Invariants

The Communication Delivery Model is governed by the following immutable invariants:

1. **Intent-Only Business Boundary**: Business modules publish `NotificationIntent` declarations only. Business applications MUST NEVER select channels, format content, or invoke delivery providers directly.
2. **Mandatory Queue-First Ingestion**: All incoming notification intents MUST be buffered in an asynchronous ingestion queue prior to processing. Direct synchronous end-to-end dispatch is prohibited.
3. **Complete Tenant Isolation**: Every intent, queue item, template, policy check, and delivery tracking record MUST carry an immutable Tenant Context.
4. **Upstream Failure Isolation**: Failures in notification composition, policy evaluation, or provider delivery MUST NEVER cause originating business module transactions to fail or roll back.
5. **Idempotency Guarantee**: Submitting duplicate notification intents with identical idempotency keys MUST result in idempotent delivery handling without duplicate recipient alerts.
6. **Security Alert Override**: System-critical security and emergency alerts bypass non-mandatory quiet hours and recipient channel opt-outs.
7. **Complete Provider Abstraction**: Delivery dispatchers MUST interact with external providers via abstract interfaces. Engine logic MUST NEVER depend on vendor-specific SDKs or transport protocols.
8. **Business Transaction Failure Isolation**: The Communication & Notification Engine shall never cause a business transaction to fail because communication delivery failed. Notification processing is strictly eventually consistent; communication failures MUST NEVER rollback business transactions.
9. **NotificationIntent Immutability**: A `NotificationIntent` is strictly immutable after ingestion. Any modifications to context, payload, or target recipients require the creation and publication of a new `NotificationIntent`.
10. **Commercial Boundary Decoupling**: The Notification Engine shall NEVER evaluate Subscriptions, Licenses, Entitlements, Features, or Usage Policies internally. Commercial entitlement checks MUST be resolved through external commercial policy services only.

---

# 13. Cross-Engine Impacts

| Engine | Impact & Integration Boundary |
| :--- | :--- |
| **Identity & Access Engine** | Queried asynchronously during Recipient Resolution to resolve user profiles, directory roles, and contact endpoints. Results are cached to minimize lookup overhead. |
| **Commercial & Entitlement Engine** | Queried asynchronously via external policy services to verify tenant channel entitlements and active tier volume limits. The Notification Engine NEVER evaluates Subscriptions, Licenses, Entitlements, Features, or Usage Policies internally. |
| **Metadata Engine** | Queried asynchronously during Template Resolution to fetch template schemas, localization dictionaries, and layout themes. |
| **Audit & Compliance Engine** | Consumes notification lifecycle audit events asynchronously for regulatory archiving, consent tracking, and security monitoring. |
| **Workflow & Rules Engine** | Originates workflow notification intents and receives optional delivery lifecycle status callback events. |

---

# 14. Alternatives Considered

### Alternative 1: Synchronous Direct Delivery
- *Description*: Business application modules invoke communication providers directly within the business transaction thread.
- *Reason for Rejection*: Violates ES-001 and ES-008. Introduces extreme transaction latency, tight coupling to external vendor APIs, vulnerability to provider outages, and inability to enforce centralized tenant policies or recipient preferences.

### Alternative 2: Synchronous Composition with Asynchronous Dispatch
- *Description*: Recipient resolution and template rendering execute synchronously on the business module caller thread; rendered messages are then queued for dispatch.
- *Reason for Rejection*: Template resolution and multilingual rendering require metadata lookups that introduce unacceptable database read latency into caller business transactions.

---

# 15. Consequences

### Positive Consequences
- **Zero Business Transaction Overhead**: Business modules publish intents with `< 10ms` overhead, completely immune to communication downstream latency.
- **Fault-Tolerant Resilience**: External provider outages, network failures, or rate limits are isolated within background queues without impacting core platform stability.
- **Strict Multi-Tenant Governance**: Centralized enforcement of tenant branding, localized templates, frequency caps, quiet hours, and recipient opt-out consents.
- **Scalable Architecture**: Independent scaling of ingestion buffers, processing workers, and channel-specific dispatch queues based on platform demand.

### Negative Consequences / Trade-offs
- **Eventual Consistency**: Delivery status tracking is eventually consistent; business applications must consume status events asynchronously if delivery verification is needed.
- **Infrastructure Requirement**: Requires multi-tiered queueing infrastructure and background worker execution environments.

---

# 16. Non-Goals

The following responsibilities are intentionally excluded from this ADR and belong to other platform engines or implementation phases:

1. **Business Event Generation**: Defining domain logic, event trigger conditions, or business validation rules within originating application modules.
2. **Commercial Right Evaluation**: Calculating, storing, or evaluating Subscription plans, Licenses, Feature Flags, or Commercial Entitlements internally.
3. **Identity & Directory Management**: Managing user identities, authentication credentials, role hierarchies, or directory contact attributes.
4. **Concrete Provider Driver Code**: Implementing physical vendor network drivers, REST client SDKs, or transport-layer wire protocols.
5. **UI Rendering Component Design**: Designing client-side UI notification popups, inbox widgets, or toast notification presentation components.
6. **Physical Database & Queue Technology Configuration**: Specifying physical database table schemas, ORM mappings, queue broker choices, or physical deployment topology.

---

# 17. Related Documents

- **VS09-P001 — Notification Engine Blueprint**
- **VS09-P002 — Notification Engine Architecture Guide**
- **VS09-P003 — Notification Engine Domain Model**
- **ES-001 — Architectural Governance Standard**
- **ES-008 — Asynchronous Integration Standard**
- **ES-009 — Multi-Tenant Data & Processing Isolation**
- **ES-010 — System Resilience & Fault-Tolerance Principles**
- **ES-013 — Engine Architecture Governance Standard**
