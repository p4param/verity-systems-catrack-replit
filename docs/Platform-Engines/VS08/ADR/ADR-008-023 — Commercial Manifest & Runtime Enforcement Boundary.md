# ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-023 |
| **Title** | Commercial Manifest & Runtime Enforcement Boundary |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

ADR-008-018 through ADR-008-022 established the Commercial Resolution Pipeline:

- Subscription
- License
- Entitlement Resolution
- Feature Resolution
- Usage Policy Resolution

These stages resolve commercial metadata into effective runtime rights.

A boundary is required between commercial resolution and runtime execution.

CAP establishes this boundary through the Commercial Manifest.

---

# 2. Problem Statement

Many SaaS platforms perform licensing decisions during runtime.

Typical runtime requests repeatedly evaluate:

- Subscription
- License
- Features
- Quotas
- Billing

This creates:

- unnecessary runtime overhead
- inconsistent authorization
- duplicated evaluation logic
- poor cacheability
- strong coupling between commercial systems and runtime

CAP requires runtime execution to remain independent from commercial evaluation.

---

# 3. Decision

The Commercial Publish Pipeline produces an immutable Commercial Manifest.

The Commercial Manifest is the only commercial artifact consumed by Runtime.

```
Commercial Metadata
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

Runtime never evaluates commercial metadata directly.

---

# 4. Architectural Principles

## AP-1 — Commercial Manifest is the Published Artifact

The Commercial Manifest is the immutable output of the Commercial Publish Pipeline.

It represents the effective commercial rights available to Runtime.

It is the commercial equivalent of:

- Runtime Manifest
- Workflow Manifest

---

## AP-2 — Runtime Consumes Only the Manifest

Runtime never queries:

- Subscription
- License
- Entitlements
- Feature metadata
- Usage Policies
- Billing providers

Runtime consumes only the Commercial Manifest.

---

## AP-3 — Commercial Resolution Ends at Publish Time

Commercial evaluation occurs only during the Commercial Publish Pipeline.

No commercial resolution occurs during runtime execution.

---

## AP-4 — Runtime Performs Enforcement

The Commercial Engine defines commercial rights.

The Runtime Engine enforces commercial rights.

Responsibilities remain separate.

```
Commercial Engine

↓

Commercial Manifest

↓

Runtime Enforcement
```

---

## AP-5 — Manifest is Immutable

Once published, a Commercial Manifest is immutable.

Changes to commercial metadata require generation of a new Commercial Manifest.

Existing manifests are never modified.

---

## AP-6 — Manifest is Versioned

Every Commercial Manifest shall include:

- Manifest Version
- Publish Timestamp
- Source Metadata Version
- Generator Version

This guarantees reproducibility and auditing.

---

## AP-7 — Manifest Generation is Deterministic

Given identical commercial metadata, the Commercial Publish Pipeline shall always generate identical manifests.

No runtime state shall influence manifest generation.

---

## AP-8 — Runtime is Stateless with Respect to Commercial Evaluation

Runtime never recalculates:

- entitlements
- features
- usage policies
- subscription state

Runtime simply evaluates the Commercial Manifest.

---

# 5. Commercial Publish Pipeline

```
Subscription
        │
        ▼
License
        │
        ▼
Entitlement Resolver
        │
        ▼
Feature Resolver
        │
        ▼
Usage Policy Resolver
        │
        ▼
Commercial Manifest Generator
        │
        ▼
Commercial Manifest
```

The generated manifest is published for runtime consumption.

---

# 6. Runtime Enforcement Model

Runtime enforcement operates exclusively against the Commercial Manifest.

Examples include:

- Feature enabled?
- Usage limit exceeded?
- Installation authorized?
- Workspace licensed?
- Module available?

Runtime never determines these by inspecting commercial metadata.

---

# 7. Manifest Responsibilities

The Commercial Manifest contains:

- Effective License
- Effective Scope
- Resolved Entitlements
- Resolved Features
- Resolved Usage Policies
- Manifest Metadata
- Manifest Version

The Commercial Manifest does not contain:

- Billing information
- Payment provider details
- Subscription history
- Pricing
- Invoices

---

# 8. Manifest Lifecycle

```
Generated
        │
        ▼
Validated
        │
        ▼
Published
        │
        ▼
Consumed
        │
        ▼
Superseded
        │
        ▼
Archived
```

Published manifests are immutable.

Superseded manifests remain available for auditing.

---

# 9. Runtime Boundary

The Runtime Engine is responsible for:

- Reading the Commercial Manifest
- Enforcing feature availability
- Enforcing usage policies
- Rejecting unauthorized execution

The Runtime Engine is not responsible for:

- Resolving commercial metadata
- Generating manifests
- Processing subscriptions
- Evaluating licenses
- Interacting with billing systems

---

# 10. Performance Considerations

The Commercial Manifest enables:

- Runtime caching
- Edge deployments
- Offline licensing
- Air-gapped installations
- Reduced database queries
- Deterministic startup
- High-performance authorization

---

# 11. Future Extension Points

The Commercial Manifest supports future capabilities including:

- Signed manifests
- Manifest verification
- Offline deployments
- Edge synchronization
- Multi-region publishing
- Incremental manifest updates
- Manifest replication
- OEM deployments

No architectural redesign shall be required.

---

# 12. Alternatives Considered

## Alternative A — Runtime Evaluates Commercial Metadata

**Rejected**

Violates CAP's Manifest-First architecture and increases runtime complexity.

---

## Alternative B — Mutable Commercial Manifest

**Rejected**

Breaks determinism, auditing, and reproducibility.

---

## Alternative C — Runtime Queries Licensing Services

**Rejected**

Creates tight coupling and prevents offline execution.

---

# 13. Consequences

## Positive

- Runtime is independent of commercial complexity.
- Deterministic commercial evaluation.
- Immutable published artifacts.
- Improved performance.
- Supports caching and offline scenarios.
- Consistent with CAP's Manifest-First architecture.

### Trade-offs

- Requires a Commercial Publish Pipeline.
- Introduces manifest version management.
- Requires regeneration after commercial changes.

---

# 14. Cross-Engine Impact

This ADR influences:

- VS06 Runtime Engine
- CM-003 Authorization
- Workflow Engine
- Reporting Engine
- Scheduler Engine
- AI Engine
- Dashboard Engine
- Marketplace

---

# 15. Architectural Invariants

The following rules are permanently established:

1. Commercial Manifest is the only commercial artifact consumed by Runtime.
2. Runtime never evaluates commercial metadata directly.
3. Commercial resolution ends before runtime execution.
4. Runtime performs enforcement, not resolution.
5. Commercial Manifests are immutable.
6. Commercial Manifests are versioned.
7. Commercial Publish is deterministic.
8. Superseded manifests remain auditable.
9. Runtime remains independent of billing systems.
10. Commercial and Runtime responsibilities remain permanently separated.

---

# 16. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-018 — Subscription Model
- ADR-008-019 — License Ownership & Scope Model
- ADR-008-020 — Entitlement Resolution Model
- ADR-008-021 — Feature Evaluation Model
- ADR-008-022 — Usage Policy Model
- ADR-008-024 — Billing Integration Boundary