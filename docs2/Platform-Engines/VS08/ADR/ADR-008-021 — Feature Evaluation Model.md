# ADR-008-021 — Feature Evaluation Model

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-021 |
| **Title** | Feature Evaluation Model |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

ADR-008-020 established that Entitlements are resolved into an effective commercial rights model.

However, runtime does not consume raw entitlements.

Instead, CAP requires a deterministic mechanism that converts resolved entitlements into executable platform capabilities.

This mechanism is the Feature Resolution Engine.

---

# 2. Problem Statement

Many licensing systems hardcode feature availability into application code.

This creates:

- duplicated feature logic
- application-specific licensing
- difficult product edition management
- poor extensibility
- inability to introduce new products without software changes

CAP requires feature availability to be metadata-driven.

---

# 3. Decision

CAP defines Features as metadata describing executable platform capabilities.

Features are not evaluated by Runtime.

They are resolved during the Commercial Publish Pipeline.

```
Resolved Entitlements
        │
        ▼
Feature Resolution Engine
        │
        ▼
Resolved Features
        │
        ▼
Usage Policy Resolution
        │
        ▼
Commercial Manifest
```

---

# 4. Architectural Principles

## AP-1 — Features are Metadata

A Feature represents a platform capability.

Examples include:

- Workflow Engine
- Dashboard Engine
- Reporting Engine
- Notification Engine
- Scheduler Engine
- AI Engine
- Import / Export
- Mobile Access
- Public API
- Audit Analytics

A Feature contains no executable business logic.

---

## AP-2 — Features are Resolved

Features are resolved from effective entitlements.

Licenses never permanently own Features.

---

## AP-3 — Runtime Never Evaluates Features

Runtime never queries:

- Subscription
- License
- Entitlements
- Feature metadata

Runtime consumes only the Commercial Manifest.

---

## AP-4 — Feature Resolution is Deterministic

Given identical entitlements, Feature Resolution shall always produce identical results.

Feature evaluation shall never depend upon runtime state.

---

## AP-5 — Features are Composable

Resolved Features may originate from multiple sources.

Examples:

- Base Edition
- Purchased Modules
- Marketplace Applications
- Promotional Features
- Trial Features
- Administrative Overrides

The Feature Resolution Engine composes them into a single effective feature set.

---

## AP-6 — Features are Application-Agnostic

The Commercial Engine never contains business application logic.

Features describe generic platform capabilities.

Business applications consume resolved features without embedding licensing rules.

---

# 5. Feature Resolution Pipeline

```
Resolved Entitlements
        │
        ▼
Base Features
        │
        ▼
Edition Features
        │
        ▼
Marketplace Features
        │
        ▼
Promotional Features
        │
        ▼
Administrative Overrides
        │
        ▼
Resolved Features
```

Resolved Features become input for Usage Policy Resolution.

---

# 6. Resolution Responsibilities

The Feature Resolution Engine is responsible for:

- Evaluating feature metadata
- Applying edition mappings
- Applying marketplace modules
- Applying promotional capabilities
- Applying administrative overrides
- Producing the effective feature set

It is not responsible for:

- Usage limits
- Runtime authorization
- Billing
- Payment processing
- User permissions

---

# 7. Resolution Order

Feature Resolution follows a fixed order.

```
1. Base Features
2. Edition Features
3. Marketplace Features
4. Promotional Features
5. Administrative Overrides
6. Validation
7. Publish
```

The order is immutable.

---

# 8. Feature Evaluation Rules

The Feature Resolution Engine shall:

- be deterministic
- be stateless
- be auditable
- be publishable
- be reproducible

It shall never depend on runtime execution context.

---

# 9. Runtime Boundary

Runtime receives:

```
Commercial Manifest
```

Runtime never evaluates feature metadata directly.

Business applications determine capability availability from the Commercial Manifest.

---

# 10. Future Extension Points

The Feature Resolution Engine supports future capabilities including:

- Marketplace applications
- AI feature packs
- Industry modules
- Regional modules
- OEM modules
- Preview features
- Beta programs
- Experimental capabilities

No redesign shall be required.

---

# 11. Alternatives Considered

## Alternative A — Features Stored on License

**Rejected**

Creates tight coupling between authorization and capabilities.

---

## Alternative B — Runtime Evaluates Features

**Rejected**

Violates Manifest-First Runtime architecture.

---

## Alternative C — Hardcoded Feature Checks

**Rejected**

Prevents modular commercial evolution.

---

# 12. Consequences

## Positive

- Fully metadata-driven feature availability.
- Marketplace ready.
- Supports modular products.
- Deterministic publish pipeline.
- Runtime remains licensing-independent.
- Simplifies future commercial expansion.

### Trade-offs

- Introduces a dedicated Feature Resolution Engine.
- Requires publish-time evaluation.
- Adds architectural complexity in exchange for flexibility.

---

# 13. Cross-Engine Impact

This ADR influences:

- VS06 Runtime Engine
- Workflow Engine
- Reporting Engine
- Dashboard Engine
- Notification Engine
- Scheduler Engine
- AI Engine
- Marketplace

---

# 14. Architectural Invariants

The following rules are permanently established:

1. Features are metadata.
2. Features are resolved, not owned.
3. Feature Resolution is deterministic.
4. Runtime never evaluates Feature metadata.
5. Feature Resolution is stateless.
6. Feature Resolution order is fixed.
7. Business applications consume resolved Features from the Commercial Manifest.
8. Published Commercial Manifests are immutable.

---

# 15. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-018 — Subscription Model
- ADR-008-019 — License Ownership & Scope Model
- ADR-008-020 — Entitlement Resolution Model
- ADR-008-022 — Usage Policy Model
- ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary
- ADR-008-024 — Billing Integration Boundary