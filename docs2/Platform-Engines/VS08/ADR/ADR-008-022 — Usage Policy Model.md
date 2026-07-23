# ADR-008-022 — Usage Policy Model

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-022 |
| **Title** | Usage Policy Model |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

ADR-008-020 established the Entitlement Resolution Engine.

ADR-008-021 established the Feature Resolution Engine.

Even when a Feature is enabled, CAP requires a deterministic mechanism to define the quantitative limits under which that Feature may be consumed.

This mechanism is the Usage Policy Resolution Engine.

---

# 2. Problem Statement

Many commercial systems embed usage limits directly into:

- application code,
- feature definitions,
- licenses,
- runtime logic.

This creates:

- duplicated enforcement logic,
- inflexible licensing,
- inconsistent quota behavior,
- difficult product evolution.

CAP requires usage limits to be resolved independently from Features and Runtime.

---

# 3. Decision

CAP defines Usage Policies as declarative metadata describing quantitative consumption rules.

Usage Policies are not executed directly.

They are resolved during the Commercial Publish Pipeline.

```
Resolved Features
        │
        ▼
Usage Policy Resolution Engine
        │
        ▼
Resolved Usage Policies
        │
        ▼
Commercial Manifest
        │
        ▼
Runtime
```

---

# 4. Architectural Principles

## AP-1 — Usage Policies are Metadata

Usage Policies define quantitative limits.

Examples include:

- Maximum Users
- Maximum Workspaces
- Maximum Installations
- Maximum Storage
- Maximum API Calls
- Maximum Workflow Executions
- Maximum Scheduler Jobs
- Maximum AI Tokens
- Maximum Report Executions
- Maximum Concurrent Sessions

Usage Policies contain no executable business logic.

---

## AP-2 — Usage Policies are Resolved

Usage Policies are resolved from:

- Effective Entitlements
- Effective Features
- License Scope

A License never permanently owns Usage Policies.

---

## AP-3 — Runtime Never Calculates Policies

Runtime never calculates:

- quotas,
- commercial limits,
- edition restrictions,
- promotional allowances.

Runtime consumes only resolved Usage Policies contained within the Commercial Manifest.

---

## AP-4 — Resolution is Deterministic

Given identical commercial metadata, Usage Policy Resolution shall always produce identical results.

The resolver shall never depend upon runtime state.

---

## AP-5 — Usage Policies are Layered

Effective Usage Policies may originate from multiple sources.

Examples:

- Subscription Plan
- Product Edition
- Purchased Add-ons
- Marketplace Modules
- Promotional Campaigns
- Administrative Overrides

The Usage Policy Resolution Engine combines these layers into a single effective policy set.

---

## AP-6 — Policies are Independent of Features

Feature availability answers:

> "Can this capability be used?"

Usage Policy answers:

> "To what extent may it be used?"

These concerns remain independent.

---

# 5. Usage Policy Resolution Pipeline

```
Resolved Features
        │
        ▼
Base Policies
        │
        ▼
Edition Policies
        │
        ▼
Marketplace Policies
        │
        ▼
Promotional Policies
        │
        ▼
Administrative Overrides
        │
        ▼
Resolved Usage Policies
```

Resolved Usage Policies become part of the Commercial Manifest.

---

# 6. Resolution Responsibilities

The Usage Policy Resolution Engine is responsible for:

- Evaluating policy metadata
- Applying edition limits
- Applying add-on limits
- Applying promotional adjustments
- Applying administrative overrides
- Producing the effective policy set

It is not responsible for:

- Runtime enforcement
- Billing
- Payment processing
- Permission evaluation
- Business application logic

---

# 7. Resolution Order

The Usage Policy Resolution Engine follows a fixed order.

```
1. Base Policies
2. Edition Policies
3. Marketplace Policies
4. Promotional Policies
5. Administrative Overrides
6. Validation
7. Publish
```

The order is immutable.

---

# 8. Runtime Boundary

Runtime receives:

```
Commercial Manifest
```

Runtime never evaluates policy metadata.

Business applications consume resolved Usage Policies from the Commercial Manifest.

---

# 9. Usage Enforcement

The Commercial Engine defines usage policies.

The Runtime Engine enforces usage policies.

The Commercial Engine never performs runtime enforcement.

The Runtime Engine never resolves commercial policies.

This separation is permanent.

---

# 10. Future Extension Points

The Usage Policy Resolution Engine supports future capabilities including:

- Consumption-based licensing
- Burst allowances
- Grace quotas
- AI credit pools
- Marketplace quotas
- Regional limits
- Enterprise overrides
- Seasonal campaigns
- Promotional expansions

These extensions shall not require redesign of the Usage Policy aggregate.

---

# 11. Alternatives Considered

## Alternative A — Store Usage Limits on License

**Rejected**

Creates rigid commercial structures and prevents dynamic policy composition.

---

## Alternative B — Runtime Calculates Usage Limits

**Rejected**

Violates CAP's Manifest-First Runtime architecture.

---

## Alternative C — Hardcode Limits in Applications

**Rejected**

Creates inconsistent commercial behavior across applications.

---

# 12. Consequences

## Positive

- Fully metadata-driven usage limits.
- Marketplace-ready policy composition.
- Deterministic Commercial Publish Pipeline.
- Runtime remains licensing-independent.
- Simplifies future commercial evolution.
- Supports flexible commercial offerings.

### Trade-offs

- Introduces a dedicated Usage Policy Resolution Engine.
- Requires publish-time computation.
- Adds architectural complexity in exchange for extensibility.

---

# 13. Cross-Engine Impact

This ADR influences:

- VS06 Runtime Engine
- Workflow Engine
- Scheduler Engine
- Reporting Engine
- AI Engine
- Dashboard Engine
- Notification Engine

---

# 14. Architectural Invariants

The following rules are permanently established:

1. Usage Policies are metadata.
2. Usage Policies are resolved, not owned.
3. Usage Policy Resolution is deterministic.
4. Usage Policy Resolution is stateless.
5. Runtime never evaluates Usage Policy metadata.
6. Runtime enforces resolved Usage Policies from the Commercial Manifest.
7. Commercial Resolution and Runtime Enforcement remain separate responsibilities.
8. Published Commercial Manifests are immutable.

---

# 15. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-018 — Subscription Model
- ADR-008-019 — License Ownership & Scope Model
- ADR-008-020 — Entitlement Resolution Model
- ADR-008-021 — Feature Evaluation Model
- ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary
- ADR-008-024 — Billing Integration Boundary