# ADR-008-024 — Billing Integration Boundary

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-024 |
| **Title** | Billing Integration Boundary |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

The CAP Commercial Engine governs subscriptions, licenses, entitlements, features, usage policies, and the Commercial Manifest.

Commercial state may be influenced by external billing providers, ERP systems, partner portals, marketplaces, or manual administrative actions.

The Commercial Engine must remain independent of these systems while allowing them to influence commercial state through well-defined integration boundaries.

---

# 2. Problem Statement

Many SaaS platforms tightly couple billing and licensing.

Examples include:

- Runtime directly checking payment status.
- License generation embedded in payment provider callbacks.
- Billing provider SDKs referenced inside licensing services.
- Commercial logic dependent upon a specific payment platform.

This creates:

- vendor lock-in,
- poor portability,
- difficult testing,
- runtime dependencies,
- inability to replace billing providers.

CAP requires complete separation between Billing and Commercial.

---

# 3. Decision

Billing is an external bounded context.

The Commercial Engine never performs billing.

The Billing Engine never performs licensing.

Billing systems communicate with the Commercial Engine only through published integration contracts and business events.

```
Billing Provider
        │
        ▼
Billing Integration
        │
        ▼
Commercial Events
        │
        ▼
Commercial Engine
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

---

# 4. Architectural Principles

## AP-1 — Billing is External

Billing is not part of the Commercial Domain.

Examples include:

- Stripe
- Razorpay
- Chargebee
- Paddle
- SAP
- Oracle
- Microsoft Dynamics
- Future billing providers

The Commercial Engine remains provider-independent.

---

## AP-2 — Billing Never Controls Runtime

Billing never enables or disables Runtime directly.

Billing modifies commercial state.

Commercial state produces a new Commercial Manifest.

Runtime consumes the latest published Commercial Manifest.

---

## AP-3 — Billing Integrates Through Events

Billing communicates through business events.

Examples:

- Subscription Purchased
- Subscription Renewed
- Subscription Cancelled
- Payment Failed
- Payment Recovered
- Trial Started
- Trial Expired
- Plan Changed

Events update commercial state.

They never bypass the Commercial Engine.

---

## AP-4 — Billing Never Creates Runtime Rights

Billing never creates:

- Licenses
- Entitlements
- Features
- Usage Policies
- Commercial Manifest

Billing only triggers commercial state changes.

The Commercial Engine owns all commercial artifacts.

---

## AP-5 — Commercial Engine Owns Licensing

Only the Commercial Engine may:

- create Subscriptions,
- issue Licenses,
- resolve Entitlements,
- resolve Features,
- resolve Usage Policies,
- publish Commercial Manifests.

---

## AP-6 — Runtime Never Communicates with Billing

Runtime never:

- checks invoices,
- checks payment status,
- calls billing APIs,
- evaluates subscriptions.

Runtime consumes only the Commercial Manifest.

---

# 5. Integration Flow

```
Billing Event
        │
        ▼
Commercial Event Handler
        │
        ▼
Subscription Update
        │
        ▼
License Update
        │
        ▼
Commercial Resolution Pipeline
        │
        ▼
Commercial Manifest
        │
        ▼
Runtime
```

---

# 6. Responsibilities

## Billing Systems

Responsible for:

- Pricing
- Invoicing
- Payments
- Refunds
- Taxation
- Currency
- Financial reporting

Not responsible for:

- Licensing
- Runtime authorization
- Commercial Manifest generation

---

## Commercial Engine

Responsible for:

- Subscription lifecycle
- License lifecycle
- Entitlement Resolution
- Feature Resolution
- Usage Policy Resolution
- Commercial Manifest publication

Not responsible for:

- Charging customers
- Payment processing
- Financial accounting
- Invoice generation

---

## Runtime

Responsible for:

- Loading Commercial Manifest
- Enforcing commercial rights
- Enforcing usage limits
- Rejecting unauthorized execution

Never responsible for:

- Billing
- Payment validation
- Subscription evaluation

---

# 7. Event-Driven Architecture

Billing integrations should be asynchronous wherever possible.

Examples:

```
Payment Received

↓

Subscription Activated

↓

Commercial Publish

↓

Commercial Manifest

↓

Runtime
```

Likewise:

```
Payment Failed

↓

Subscription Suspended

↓

Commercial Publish

↓

Commercial Manifest

↓

Runtime
```

No direct Runtime interaction occurs.

---

# 8. Failure Handling

Billing failures never corrupt Runtime.

Examples:

- Billing API unavailable
- Payment gateway offline
- ERP synchronization delayed

Commercial state remains the source of truth.

Runtime continues using the latest valid Commercial Manifest until a new one is published.

---

# 9. Future Extension Points

This architecture supports:

- Multiple billing providers
- Regional payment gateways
- ERP integration
- Marketplace billing
- Partner billing
- Consumption billing
- AI credit purchases
- Promotional campaigns
- Subscription migrations

No redesign of the Commercial Engine is required.

---

# 10. Alternatives Considered

## Alternative A — Billing Embedded in Commercial Engine

**Rejected**

Violates separation of concerns and creates provider lock-in.

---

## Alternative B — Runtime Queries Billing Provider

**Rejected**

Violates Manifest-First Runtime architecture.

---

## Alternative C — Billing Generates Licenses

**Rejected**

Licensing belongs exclusively to the Commercial Engine.

---

# 11. Consequences

## Positive

- Billing provider independence.
- Clean bounded contexts.
- Event-driven integration.
- Simplified Runtime.
- Easier provider replacement.
- Marketplace ready.
- ERP integration ready.

### Trade-offs

- Requires integration adapters.
- Requires event processing.
- Introduces eventual consistency between billing and runtime.

---

# 12. Cross-Engine Impact

This ADR influences:

- VS08 Commercial Engine
- VS06 Runtime Engine
- Future Billing Engine
- Marketplace
- ERP Integration
- Notification Engine
- Reporting Engine

---

# 13. Architectural Invariants

The following rules are permanently established:

1. Billing is an external bounded context.
2. Billing never performs licensing.
3. Billing never generates Commercial Manifests.
4. Runtime never communicates with billing systems.
5. Commercial state is the source of truth for runtime authorization.
6. Billing communicates through events.
7. Commercial Publish Pipeline generates the Commercial Manifest.
8. Runtime consumes only the Commercial Manifest.
9. Billing providers are replaceable without changing Commercial or Runtime.
10. Commercial and Billing remain permanently decoupled.

---

# 14. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-018 — Subscription Model
- ADR-008-019 — License Ownership & Scope Model
- ADR-008-020 — Entitlement Resolution Model
- ADR-008-021 — Feature Evaluation Model
- ADR-008-022 — Usage Policy Model
- ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary