# ADR-008-020 — Entitlement Resolution Model

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-020 |
| **Title** | Entitlement Resolution Model |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

ADR-008-018 established that a Subscription represents the commercial agreement.

ADR-008-019 established that a License represents runtime authorization.

Neither Subscription nor License directly owns runtime capabilities.

Commercial rights must instead be resolved through a deterministic process before runtime execution.

CAP therefore introduces the **Entitlement Resolution Model**.

---

# 2. Problem Statement

Many commercial systems permanently attach features and limits directly to a license.

This causes:

- rigid licensing structures,
- duplicated feature definitions,
- complex upgrades,
- difficult add-on management,
- hard-coded commercial logic.

CAP requires commercial rights to be dynamically resolved instead of statically owned.

---

# 3. Decision

CAP defines Entitlements as declarative metadata that describe commercial rights.

Entitlements are **not executed**.

They are resolved by the Commercial Resolution Engine.

```
Subscription
        │
        ▼
License
        │
        ▼
Entitlement Resolution
        │
        ▼
Resolved Entitlements
        │
        ▼
Feature Resolution
        │
        ▼
Usage Policy Resolution
        │
        ▼
Commercial Manifest
```

---

# 4. Architectural Principles

## AP-1 — Entitlements are Metadata

Entitlements define commercial rights.

Examples include:

- Maximum Users
- Maximum Workspaces
- Maximum Installations
- Storage Capacity
- API Capacity
- AI Credits
- Workflow Capacity

Entitlements contain no executable logic.

---

## AP-2 — Entitlements are Resolved

Licenses do not permanently own entitlements.

The Commercial Resolution Engine computes the effective entitlement set for each License.

This allows rights to evolve without changing the License itself.

---

## AP-3 — Resolution is Deterministic

Given identical commercial metadata, the resolution process shall always produce the same result.

The resolution engine shall not rely on runtime state.

---

## AP-4 — Resolution is Stateless

The Commercial Resolution Engine does not persist intermediate calculations.

It produces a deterministic output from commercial metadata.

---

## AP-5 — Entitlements are Layered

Effective entitlements may be composed from multiple sources.

Examples include:

- Subscription Plan
- Product Edition
- Purchased Add-ons
- Promotional Packs
- Regional Overrides
- Temporary Grants
- Administrative Overrides

Resolution combines these layers into a single effective entitlement set.

---

## AP-6 — Runtime Never Resolves Entitlements

Runtime never evaluates entitlement metadata.

Runtime consumes only the published Commercial Manifest.

---

# 5. Resolution Pipeline

The entitlement pipeline is:

```
License
      │
      ▼
Base Entitlements
      │
      ▼
Edition Rules
      │
      ▼
Add-on Resolution
      │
      ▼
Promotional Resolution
      │
      ▼
Administrative Overrides
      │
      ▼
Resolved Entitlements
```

The result becomes input to Feature Resolution.

---

# 6. Resolution Responsibilities

The Entitlement Resolution Engine is responsible for:

- Loading commercial metadata
- Applying edition rules
- Applying add-ons
- Applying overrides
- Resolving conflicts
- Producing a deterministic entitlement set

It is not responsible for:

- Runtime authorization
- Permission evaluation
- Billing
- Payment processing

---

# 7. Resolution Order

The resolution order is fixed.

```
1. Subscription Plan
2. Product Edition
3. License Scope
4. Purchased Add-ons
5. Promotional Packs
6. Administrative Overrides
7. Final Validation
8. Publish
```

The order is immutable to guarantee deterministic output.

---

# 8. Resolution Rules

The following rules apply:

- Resolution must be repeatable.
- Resolution must be deterministic.
- Resolution must be auditable.
- Resolution must be versioned.
- Resolution must be publishable.

---

# 9. Runtime Boundary

Runtime receives:

```
Commercial Manifest
```

Runtime never:

- calculates entitlements,
- evaluates plans,
- evaluates licenses,
- resolves overrides.

---

# 10. Future Extension Points

The resolution engine supports future capabilities including:

- Marketplace extensions
- Partner products
- AI credit packs
- Regional licensing
- OEM editions
- Promotional campaigns
- Seasonal bundles
- Enterprise agreements

No redesign of the resolution engine shall be required.

---

# 11. Alternatives Considered

## Alternative A — Entitlements Stored on License

**Rejected**

Creates rigid commercial structures and prevents dynamic composition.

---

## Alternative B — Runtime Resolves Entitlements

**Rejected**

Violates the Manifest-First Runtime architecture.

---

## Alternative C — One Static Entitlement Set

**Rejected**

Prevents add-ons, promotional packs and future commercial extensions.

---

# 12. Consequences

## Positive

- Dynamic commercial composition.
- Modular commercial offerings.
- Marketplace ready.
- Deterministic publish process.
- Supports future commercial models.
- Keeps Runtime independent of commercial calculations.

### Trade-offs

- Introduces a Commercial Resolution Engine.
- Requires publish-time computation.
- Adds architectural complexity in exchange for flexibility.

---

# 13. Cross-Engine Impact

This ADR influences:

- VS08 Commercial Engine
- VS06 Runtime Engine
- Reporting Engine
- Scheduler Engine
- Notification Engine
- AI Engine

---

# 14. Architectural Invariants

The following rules are permanently established:

1. Entitlements are metadata.
2. Entitlements are resolved, not owned.
3. Resolution is deterministic.
4. Resolution is stateless.
5. Resolution order is fixed.
6. Runtime never resolves entitlements.
7. Runtime consumes only the Commercial Manifest.
8. Published Commercial Manifests are immutable.

---

# 15. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-018 — Subscription Model
- ADR-008-019 — License Ownership & Scope Model
- ADR-008-021 — Feature Evaluation Model
- ADR-008-022 — Usage Policy Model
- ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary
- ADR-008-024 — Billing Integration Boundary