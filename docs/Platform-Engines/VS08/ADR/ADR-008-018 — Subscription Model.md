# ADR-008-018 — Subscription Model

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-018 |
| **Title** | Subscription Model |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

The CAP Platform requires a commercial model capable of supporting multiple business applications, multiple commercial offerings, multiple licensing models, future marketplaces, OEM distribution, and external billing providers.

A Subscription represents the commercial agreement between a Tenant and the CAP Platform without introducing runtime dependencies or billing provider coupling.

The commercial model must remain application-agnostic and consistent with CAP's Manifest-First Architecture.

---

# 2. Problem Statement

Traditional SaaS platforms often combine:

- Subscription
- License
- Entitlements
- Feature Flags
- Billing
- Runtime Authorization

into a single data model.

This results in:

- Tightly coupled commercial and runtime logic
- Limited extensibility
- Vendor lock-in
- Complex billing integrations
- Difficult runtime optimization

CAP requires these responsibilities to be separated.

---

# 3. Decision

CAP defines **Subscription** as the commercial agreement between a Tenant and the CAP Platform.

A Subscription **does not grant runtime rights directly**.

Instead:

```
Subscription
        │
        ▼
License
        │
        ▼
Entitlements
        │
        ▼
Feature Flags
        │
        ▼
Usage Policies
        │
        ▼
Commercial Manifest
        │
        ▼
Runtime
```

Runtime never evaluates subscriptions directly.

---

# 4. Architectural Principles

## AP-1 — Subscription is a Commercial Agreement

A Subscription represents the commercial relationship between a Tenant and the Platform.

It represents:

- Purchased product
- Commercial terms
- Subscription lifecycle
- Renewal behavior

It is **not** a runtime authorization artifact.

---

## AP-2 — Subscription Does Not Execute

Subscriptions never:

- Authorize runtime execution
- Evaluate permissions
- Enable features
- Enforce usage limits

These responsibilities belong to downstream commercial aggregates.

---

## AP-3 — Multiple Subscriptions

A Tenant may own multiple concurrent subscriptions.

Example:

```
Tenant
    │
    ├── Core Platform
    ├── AI Services
    ├── Analytics
    ├── Mobile
    └── Industry Add-ons
```

The commercial model shall not assume a single subscription per tenant.

---

## AP-4 — Billing Independence

Subscriptions shall never depend upon a specific billing provider.

Examples:

- Stripe
- Razorpay
- Chargebee
- Paddle
- SAP
- Oracle

Billing systems interact through integration boundaries.

The Subscription stores only external commercial references where required.

---

## AP-5 — Subscription Produces Licenses

Subscriptions are commercial agreements.

Licenses are runtime authorizations.

One Subscription may generate one or more Licenses.

Example:

```
Tenant Subscription
        │
        ├── Production License
        ├── Test License
        └── Mobile License
```

The Subscription never authorizes execution directly.

---

## AP-6 — Subscription is Metadata

Subscriptions participate in the Commercial Publish Pipeline.

Commercial metadata is transformed into an immutable Commercial Manifest.

Runtime consumes only the published Commercial Manifest.

---

# 5. Subscription Responsibilities

The Subscription aggregate owns:

- Subscription Plan
- Commercial lifecycle
- Effective dates
- Renewal policy
- Trial period
- Commercial references
- Billing references (logical only)

The Subscription aggregate does **not** own:

- Licenses
- Entitlements
- Feature evaluation
- Usage enforcement
- Runtime authorization
- Billing execution
- Payment processing

---

# 6. Subscription Lifecycle

The canonical lifecycle is:

```
Draft
    │
    ▼
Trial
    │
    ▼
Active
    │
    ├────────► Suspended
    │               │
    ▼               ▼
Expired      Cancelled
    │
    ▼
Archived
```

Lifecycle transitions are independent of License lifecycle transitions.

---

# 7. Domain Relationships

```
Tenant
      │
      ▼
TenantSubscription
      │
      ▼
SubscriptionPlan
```

Rules:

- A TenantSubscription belongs to exactly one Tenant.
- A TenantSubscription references exactly one SubscriptionPlan.
- A Tenant may own multiple concurrent TenantSubscriptions.

---

# 8. Commercial Publish Pipeline

Subscriptions participate in the Commercial Publish Pipeline.

```
Subscription Metadata
        │
        ▼
Commercial Validation
        │
        ▼
Commercial Publish Pipeline
        │
        ▼
Commercial Manifest
        │
        ▼
Runtime
```

The Subscription itself is never queried during runtime execution.

---

# 9. Runtime Boundary

The Runtime Engine shall never:

- Inspect subscription plans
- Inspect billing providers
- Evaluate subscription status
- Evaluate renewal policies

Runtime receives only:

```
Commercial Manifest
```

This maintains CAP's Manifest-First Runtime architecture.

---

# 10. Future Extension Points

The Subscription model intentionally supports future capabilities including:

- Marketplace products
- Add-on modules
- Industry solution packs
- OEM licensing
- Multi-region subscriptions
- Partner-managed subscriptions
- Usage-based subscriptions
- Promotional subscriptions
- Enterprise agreements

These capabilities shall extend the Subscription model without requiring architectural redesign.

---

# 11. Alternatives Considered

## Alternative A — Subscription as License

**Rejected**

Combines commercial agreement and runtime authorization into a single aggregate, violating separation of concerns.

---

## Alternative B — One Subscription Per Tenant

**Rejected**

Prevents modular commercial offerings, add-on products, and future marketplace scenarios.

---

## Alternative C — Runtime Evaluates Subscriptions

**Rejected**

Violates the CAP Manifest-First Runtime principle and introduces unnecessary runtime complexity.

---

# 12. Consequences

## Positive

- Clear separation of commercial and runtime concerns.
- Supports multiple subscriptions per Tenant.
- Enables modular product offerings.
- Decouples billing providers.
- Aligns with the Commercial Manifest architecture.
- Scales to future marketplace and OEM scenarios.
- Consistent with CAP's publish-and-execute philosophy.

### Trade-offs

- Introduces additional commercial aggregates.
- Requires a Commercial Publish Pipeline.
- Adds architectural complexity in exchange for long-term extensibility.

---

# 13. Cross-Engine Impact

This ADR influences:

- VS08 Commercial Engine
- VS06 Runtime Engine
- CM-002 Authentication
- CM-003 Authorization
- Notification Engine
- Reporting Engine
- Scheduler Engine
- AI Engine

---

# 14. Architectural Invariants

The following rules are permanently established:

1. A Subscription is a commercial agreement.
2. A Subscription is not a runtime authorization.
3. A Tenant may own multiple active Subscriptions.
4. Runtime never evaluates Subscription metadata directly.
5. Subscription metadata participates in the Commercial Publish Pipeline.
6. Runtime consumes only the immutable Commercial Manifest.
7. Billing systems integrate through defined boundaries and never control runtime execution directly.
8. The Subscription aggregate remains application-agnostic.

---

# 15. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-019 — License Ownership & Scope Model
- ADR-008-020 — Entitlement Model
- ADR-008-021 — Feature Evaluation Model
- ADR-008-022 — Usage Policy Model
- ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary
- ADR-008-024 — Billing Integration Boundary