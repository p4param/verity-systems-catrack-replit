# VS09 – Notification Engine Domain Model

**Engine:** VS09 – Notification Engine  
**Prompt ID:** VS09-P003  
**Phase:** Domain Model  
**Engineering Standard:** ES-013  
**Status:** Domain Model  

---

## 1. Domain Overview

The Notification Domain defines the business concepts, aggregates, entities, value objects, domain services, and invariants required to govern, compose, route, schedule, dispatch, and audit multi-tenant communications emitted across the CAP platform.

The domain establishes a strict boundary between business applications (which declare notification intents) and the communication infrastructure (which manages template resolution, recipient preferences, policy enforcement, channel selection, and delivery tracking). It guarantees that all communication logic remains 100% metadata-driven, multi-tenant isolated, provider-independent, and application-agnostic.

---

## 2. Ubiquitous Language

- **Notification Intent**: A business declaration published by an application module expressing the request for a notification to be delivered based on a domain event, context payload, and target recipient references.
- **Notification**: A concrete, composed communication unit generated within a tenant context targeting specific recipients across defined delivery channels.
- **Notification Template**: A metadata-defined blueprint specifying localized text, dynamic placeholders, structural wrappers, and layout styling for a specific intent type.
- **Notification Policy**: A set of tenant or system rules governing delivery rules, quiet hours, rate thresholds, and channel eligibility.
- **Notification Preference**: Recipient-specific rules defining individual channel matrix choices, opt-outs, and communication consents.
- **Recipient**: A target entity (user profile, role distribution, directory group) resolved to receive communications.
- **Delivery Channel**: A logical communication pathway (in-app, mobile push, email, instant message, webhook) over which notifications are transmitted.
- **Delivery Provider**: An abstract external service integration capable of transmitting rendered channel messages to destination endpoints.
- **Notification Delivery**: The domain aggregate representing the lifecycle state, routing decisions, dispatch attempts, and status tracking of a notification.
- **Delivery Attempt**: An individual recorded occurrence of transmitting a rendered notification payload to a specific delivery channel.
- **Notification Event**: A domain audit event capturing status transitions, delivery receipts, or failure states during the notification lifecycle.

---

## 3. Aggregate Identification

### 1. NotificationIntent Aggregate

- **Purpose**: Captures and validates the immutable declaration of a communication request emitted by a business application.
- **Aggregate Root**: `NotificationIntent`
- **Responsibilities**:
  - Validates intent structure against registered intent metadata schemas.
  - Encapsulates dynamic business context payloads and event parameters.
  - Holds target recipient references (User IDs, Role IDs, Group Keys).
  - Preserves mandatory Tenant Context metadata.
- **Business Invariants**:
  - Must be associated with a valid Tenant Context.
  - Payload parameters are immutable after intent publication.
  - Must conform to a recognized intent type schema.
- **Lifecycle**: Declared ──> Validated ──> Ingested ──> Resolved ──> Archived

---

### 2. NotificationTemplate Aggregate

- **Purpose**: Governs metadata-driven content blueprints, localizations, and branding layouts for notification types.
- **Aggregate Root**: `NotificationTemplate`
- **Responsibilities**:
  - Defines localized content templates across target languages.
  - Manages structural layout wrappers (headers, footers, visual themes).
  - Enforces placeholder variable contracts required by the template.
  - Maintains version history and fallback template selection rules.
- **Business Invariants**:
  - Templates belong to either platform default scope or a specific Tenant Context.
  - Published template versions are immutable.
  - Localized variations must conform to the parent intent payload schema.
- **Lifecycle**: Draft ──> Published ──> Active ──> Deprecated ──> Archived

---

### 3. NotificationPolicy Aggregate

- **Purpose**: Encapsulates governance rules controlling notification delivery behavior, frequency limits, quiet hours, and channel priority.
- **Aggregate Root**: `NotificationPolicy`
- **Responsibilities**:
  - Defines tenant-level frequency caps and rate thresholds.
  - Specifies quiet hour windows and timezone restrictions.
  - Establishes default channel priority rankings and fallback sequences.
- **Business Invariants**:
  - Policy scope must align with Tenant Context.
  - Quiet hour windows must not contain overlapping contradictory rules.
  - System-critical notifications override non-mandatory policy restrictions.
- **Lifecycle**: Drafted ──> Activated ──> Modified ──> Suspended

---

### 4. NotificationPreference Aggregate

- **Purpose**: Manages individual recipient communication consents, channel matrix selections, and opt-out rules.
- **Aggregate Root**: `NotificationPreference`
- **Responsibilities**:
  - Captures recipient channel preferences per notification category.
  - Maintains explicit opt-out registries for non-essential communications.
  - Enforces communication consent compliance across channels.
- **Business Invariants**:
  - Must reference a valid Recipient identity within Tenant Context.
  - Explicit recipient opt-outs for non-mandatory communications cannot be overridden by tenant policy.
  - System security and critical alerts bypass user-level channel opt-outs.
- **Lifecycle**: Initialized ──> Customised ──> Updated ──> Suspended

---

### 5. NotificationDelivery Aggregate

- **Purpose**: Represents the execution lifecycle, state transitions, channel routing decisions, content composition results, and audit history of a specific notification dispatch.
- **Aggregate Root**: `NotificationDelivery`
- **Responsibilities**:
  - Tracks delivery lifecycle state transitions.
  - Holds references to generated rendered content payloads.
  - Records channel routing outcomes and delivery attempt logs.
  - Captures delivery receipts and failure statuses.
- **Business Invariants**:
  - Must reference a valid `NotificationIntent` and `Tenant Context`.
  - Lifecycle state transitions must follow a strict unidirectional state flow.
  - Failure in delivery execution must never mutate the original `NotificationIntent`.
- **Lifecycle**: Ingested ──> Evaluated ──> Rendered ──> Dispatched ──> Delivered (or Failed / Suppressed)

---

## 4. Supporting Entities

Entities exist within the boundaries of an Aggregate Root and possess distinct local identity:

- **TemplateVariation** (within `NotificationTemplate` Aggregate): Represents a specific language/locale content variation of a template.
- **LayoutWrapper** (within `NotificationTemplate` Aggregate): Defines visual header, footer, and branding structures for a tenant or channel.
- **PolicyRule** (within `NotificationPolicy` Aggregate): Represents an individual operational rule (e.g., rate cap rule, quiet hour rule) inside a policy.
- **ChannelPreference** (within `NotificationPreference` Aggregate): Represents an opted preference choice for a specific channel and category combination.
- **DeliveryAttempt** (within `NotificationDelivery` Aggregate): Represents an individual recorded attempt to transmit a message on a channel, capturing attempt timestamp, result status, and diagnostic error details.
- **RenderedContent** (within `NotificationDelivery` Aggregate): Captures the final rendered output message for a specific channel prior to dispatch.

---

## 5. Value Objects

Value objects are immutable domain concepts defined by their attributes rather than identity:

- **TenantContext**: Immutable combination of Tenant ID and Environment context.
- **IntentCategory**: Classification of notification urgency and purpose (e.g., Transactional, Operational, Security, Marketing).
- **PriorityLevel**: Delivery urgency ranking (e.g., Critical, High, Normal, Batch).
- **RecipientTarget**: Abstract target reference specifying recipient identifier type (User, Role, Group) and target key.
- **DeliveryEndpoint**: Channel-specific contact destination (e.g., email address, device token, phone number, webhook URL) resolved at runtime.
- **QuietHourWindow**: Immutable time window specifying start time, end time, and timezone during which non-critical communications are restricted.
- **DeliveryStatus**: Immutable representation of delivery state (Ingested, Filtered, Rendered, Dispatched, Delivered, Failed, Suppressed).
- **LocalizationKey**: Standard language and locale identifier string (e.g., `en-US`, `ar-SA`).

---

## 6. Domain Services

Domain services encapsulate business logic that naturally spans multiple aggregates:

- **RecipientResolutionService**: Coordinates between `NotificationIntent` recipient targets and Identity Engine directory information to resolve concrete recipient entity contexts and contact endpoints.
- **PolicyEvaluationService**: Evaluates `NotificationPolicy` and `NotificationPreference` aggregates against a `NotificationIntent` to determine eligible delivery channels, quiet hour restrictions, and dispatch timing.
- **TemplateResolutionService**: Coordinates between a `NotificationIntent`, `TenantContext`, locale requirements, and `NotificationTemplateRepository` to locate and load matching localized template metadata and visual layout wrappers.
- **ContentCompositionService**: Binds a `NotificationIntent` context payload with resolved `NotificationTemplate` variations to generate `RenderedContent` value objects tailored for active channels.
- **ChannelRoutingService**: Determines final target `DeliveryChannel` sequences and fallback routes for a `NotificationDelivery` aggregate based on policy evaluation results and channel reachability.

---

## 7. Repository Boundaries

Repository boundaries define domain persistence interfaces without specifying underlying database technology:

- **NotificationIntentRepository**: Boundary for storing and retrieving `NotificationIntent` aggregates.
- **NotificationTemplateRepository**: Boundary for managing and querying `NotificationTemplate` aggregates by intent type, locale, and tenant context.
- **NotificationPolicyRepository**: Boundary for loading system-default and tenant-specific `NotificationPolicy` aggregates.
- **NotificationPreferenceRepository**: Boundary for retrieving and updating recipient `NotificationPreference` aggregates.
- **NotificationDeliveryRepository**: Boundary for recording and querying `NotificationDelivery` aggregate lifecycles and delivery attempt logs.

---

## 8. Ownership Matrix

| Concept | Notification Engine Owns? | Reference Only? | Responsible Engine / Context |
| :--- | :---: | :---: | :--- |
| **Notification Intent** | ✅ Yes | ❌ No | Notification Engine |
| **Notification Template** | ✅ Yes | ❌ No | Notification Engine |
| **Notification Policy** | ✅ Yes | ❌ No | Notification Engine |
| **Notification Preference** | ✅ Yes | ❌ No | Notification Engine |
| **Notification Delivery** | ✅ Yes | ❌ No | Notification Engine |
| **Delivery Attempt** | ✅ Yes | ❌ No | Notification Engine |
| **Recipient Identity** | ❌ No | ✅ Yes | Identity & Access Engine |
| **Platform User** | ❌ No | ✅ Yes | Identity & Access Engine |
| **Tenant** | ❌ No | ✅ Yes | Tenant Engine / Foundation |
| **Workspace** | ❌ No | ✅ Yes | Tenant Engine / Foundation |
| **Subscription & Entitlements** | ❌ No | ✅ Yes | Commercial & Entitlement Engine |
| **Workflow State** | ❌ No | ✅ Yes | Workflow & Rules Engine |
| **Business Event** | ❌ No | ✅ Yes | Originating Business Application Modules |
| **Audit Record** | ❌ No | ✅ Yes | Audit & Compliance Engine (Consumes events) |

---

## 9. Context Map

The Notification Engine interacts with external bounded contexts through clearly defined ownership boundaries:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      ORIGINATING BUSINESS MODULES                        │
│        (Events, Inventory, Purchasing, Kitchen, Dispatch, CRM)           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     │ Emits Notification Intents
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION ENGINE BOUNDED CONTEXT                    │
│                                                                          │
│  ┌────────────────────┐   Queries    ┌────────────────────────────────┐  │
│  │ Recipient           ├────────────►│ Identity & Access Context      │  │
│  │ Resolution Service  │             │ (Users, Roles, Groups)         │  │
│  └────────────────────┘             └────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────┐   Queries    ┌────────────────────────────────┐  │
│  │ Policy             ├────────────►│ Commercial & Entitlements      │  │
│  │ Evaluation Service  │             │ (Channel Entitlements, Limits) │  │
│  └────────────────────┘             └────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────┐   Emits      ┌────────────────────────────────┐  │
│  │ Delivery Tracking   ├────────────►│ Audit & Compliance Context     │  │
│  │ Service            │             │ (Compliance Audit Logs)        │  │
│  └────────────────────┘             └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Identity & Access Context**: Source of truth for user profiles, directory roles, group memberships, and contact endpoints. The Notification Engine holds references to Recipient IDs only.
- **Commercial & Entitlement Context**: Source of truth for tenant subscription tier rights, channel availability, and usage quotas. The Notification Engine queries entitlements to validate channel routing.
- **Workflow & Rules Context**: Originator of workflow-driven notification triggers.
- **Audit & Compliance Context**: Consumer of notification lifecycle events and delivery status audit records.
- **Originating Business Modules**: Originators of business domain events that publish `NotificationIntent` declarations.

---

## 10. Aggregate Interaction Model

The logical interaction between Notification Engine aggregates follows a structured domain flow:

```
[ Originating Business Module ]
              │
              │ Publishes
              ▼
    [ NotificationIntent ]
              │
              ├─────────────────────────────┐
              ▼                             ▼
  [ RecipientResolutionService ]   [ PolicyEvaluationService ]
              │                             │
              │ (Resolves Recipient)        ├──────────────────────────────┐
              ▼                             ▼                              ▼
  [ Identity Context (Ref) ]      [ NotificationPolicy ]      [ NotificationPreference ]
                                            │                              │
                                            └──────────────┬───────────────┘
                                                           │ (Determines Eligible Channels)
                                                           ▼
                                             [ TemplateResolutionService ]
                                                           │
                                                           ▼
                                                [ NotificationTemplate ]
                                                           │
                                                           ▼
                                            [ContentCompositionService ]
                                                           │
                                                           ▼
                                               [ NotificationDelivery ]
                                                           │
                                                           ├────────────────────────┐
                                                           ▼                        ▼
                                                  (RenderedContent)        (DeliveryAttempt)
```

1. An originating business module publishes a `NotificationIntent` aggregate.
2. `RecipientResolutionService` resolves targeted recipient references against Identity Context references.
3. `PolicyEvaluationService` checks `NotificationPolicy` and `NotificationPreference` aggregates to select active delivery channels and check constraints.
4. `TemplateResolutionService` retrieves matching `NotificationTemplate` metadata for the selected channels and tenant context.
5. `ContentCompositionService` binds the intent payload into templates to construct `RenderedContent` value objects.
6. `NotificationDelivery` aggregate encapsulates routing choices, `RenderedContent`, and logs `DeliveryAttempt` entities throughout the delivery lifecycle.

---

## 11. Domain Invariants

The Notification Domain is governed by the following immutable business rules:

1. **Communication Domain Boundary**: The Notification Engine owns 100% of communication orchestration, template composition, policy evaluation, channel routing, and delivery tracking.
2. **Intent Publication Contract**: Business modules publish `NotificationIntent` aggregates only; they never create, select, format, or dispatch notifications directly.
3. **Mandatory Tenant Context**: Every domain aggregate (`NotificationIntent`, `NotificationTemplate`, `NotificationPolicy`, `NotificationPreference`, `NotificationDelivery`) MUST be scoped to an explicit, immutable Tenant Context.
4. **External Recipient Ownership**: Recipient identity attributes, user profiles, and directory memberships belong to the Identity & Access Engine; the Notification Engine holds references only.
5. **Metadata-Driven Templates**: Notification templates, localizations, and layouts remain 100% metadata-driven and tenant-customizable without code modifications.
6. **Policy & Preference Precedence**: Recipient opt-out preferences and tenant policy guardrails MUST be evaluated prior to content composition and dispatch, except for system-critical notifications.
7. **Immutable Intent History**: Once ingested, a `NotificationIntent` aggregate payload is immutable and cannot be altered during processing or delivery retries.
8. **Fault Isolation Guarantee**: Failures occurring during policy evaluation, template composition, or delivery attempt MUST NEVER cause originating business module events to fail or roll back.
9. **Identity-Based External References**: Aggregates reference external aggregates and bounded contexts by identity only; ownership remains with the originating aggregate or engine.
