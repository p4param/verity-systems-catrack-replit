# ADR-008-019 — License Ownership & Scope Model

| Field | Value |
|--------|-------|
| **ADR** | ADR-008-019 |
| **Title** | License Ownership & Scope Model |
| **Engine** | VS08 – License, Subscription & Tenant Management Engine |
| **Phase** | VS08B – Commercial Foundation |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |

---

# 1. Context

Following ADR-008-018, CAP defines a Subscription as a commercial agreement between a Tenant and the Platform.

Runtime execution, however, must never depend directly on commercial agreements.

A dedicated authorization artifact is required that represents what may legally and operationally execute.

This artifact is the License.

---

# 2. Problem Statement

Many commercial systems combine:

- Subscription
- License
- Entitlements
- Runtime authorization

into a single aggregate.

This creates:

- tightly coupled runtime logic,
- inflexible licensing,
- poor support for multiple deployments,
- limited commercial extensibility.

CAP requires these concerns to remain independent.

---

# 3. Decision

CAP defines **License** as the runtime authorization artifact produced from a Subscription.

A License does not own features, permissions or usage limits.

Instead, commercial capabilities are resolved for a License during the Commercial Publish Pipeline to produce the immutable Commercial Manifest.

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
Feature Resolution
        │
        ▼
Usage Policy Resolution
        │
        ▼
Commercial Manifest
        │
        ▼
Runtime
```

---

# 4. Architectural Principles

## AP-1 — License is Runtime Authorization

A License represents the authorization that allows runtime execution.

It is not the commercial agreement.

Commercial agreements are represented by Subscriptions.

---

## AP-2 — Subscription Produces Licenses

A Subscription may generate one or more Licenses.

Example:

```
Enterprise Subscription
        │
        ├── Production License
        ├── QA License
        ├── Mobile License
        └── Training License
```

The Subscription owns the commercial relationship.

Each License represents an operational authorization.

---

## AP-3 — License Has Exactly One Scope

Each License authorizes exactly one scope.

Supported scopes may include:

- Platform
- Tenant
- Workspace
- Installation
- Module
- Feature
- User

A License shall never authorize multiple scopes simultaneously.

---

## AP-4 — Scope is Metadata

License scope is metadata-driven.

No runtime code shall hardcode licensing scope.

Future licensing models shall be introduced through metadata rather than software changes.

---

## AP-5 — License Owns Validity

A License owns:

- identity
- lifecycle
- validity period
- effective dates
- authorization scope

A License never owns:

- entitlements
- feature flags
- usage policies
- permissions

---

## AP-6 — Entitlements are Resolved

Entitlements are **resolved for a License**.

They are not permanently owned by the License.

This enables:

- plan upgrades
- promotional packages
- marketplace add-ons
- regional offerings
- future commercial extensions

without changing the License itself.

---

## AP-7 — LicenseAssignment is a Boundary Object

LicenseAssignment binds a License to an operational resource.

Example:

```
License
        │
        ▼
LicenseAssignment
        │
        ▼
WorkspaceInstallation
```

LicenseAssignment never evaluates:

- features
- permissions
- quotas
- runtime authorization

Its sole responsibility is establishing the commercial-to-operational relationship.

---

## AP-8 — Commercial Manifest Consumes Licenses

The Commercial Publish Pipeline resolves commercial rights for each License.

Runtime consumes only the published Commercial Manifest.

Runtime never evaluates License metadata directly.

---

# 5. License Responsibilities

The License aggregate owns:

- Authorization identity
- Authorization scope
- Validity
- Effective dates
- Lifecycle

The License aggregate does not own:

- Commercial agreement
- Billing
- Features
- Entitlements
- Usage limits
- Runtime permissions

---

# 6. License Lifecycle

The canonical lifecycle is:

```
Draft
    │
    ▼
Issued
    │
    ▼
Active
    │
    ├────────► Suspended
    │               │
    ▼               ▼
Expired      Revoked
    │
    ▼
Archived
```

License lifecycle is independent from Subscription lifecycle.

---

# 7. Domain Relationships

```
TenantSubscription
        │
        ▼
License
        │
        ▼
LicenseAssignment
        │
        ▼
WorkspaceInstallation
```

Rules:

- A License belongs to exactly one Subscription.
- A Subscription may own multiple Licenses.
- A LicenseAssignment references exactly one License.
- A LicenseAssignment references exactly one operational resource.

---

# 8. Commercial Resolution Pipeline

```
License
      │
      ▼
Entitlement Resolution
      │
      ▼
Feature Resolution
      │
      ▼
Usage Policy Resolution
      │
      ▼
Commercial Manifest
      │
      ▼
Runtime
```

The Commercial Manifest is the only runtime-facing artifact.

---

# 9. Runtime Boundary

Runtime shall never:

- evaluate License lifecycle,
- inspect License scope,
- inspect Subscription metadata,
- evaluate billing state.

Runtime consumes only the immutable Commercial Manifest.

---

# 10. Future Extension Points

The License model supports future capabilities including:

- Offline licensing
- Signed licenses
- Hardware-bound licenses
- OEM licensing
- Regional licenses
- Marketplace licenses
- Temporary licenses
- Emergency licenses
- Evaluation licenses

These extensions shall not require redesign of the License aggregate.

---

# 11. Alternatives Considered

## Alternative A — License Owns Entitlements

**Rejected**

Creates tight coupling between authorization and commercial capabilities.

---

## Alternative B — Subscription is Runtime Authorization

**Rejected**

Violates separation of commercial and operational responsibilities.

---

## Alternative C — Runtime Evaluates Licenses

**Rejected**

Violates CAP's Manifest-First Runtime principle.

---

# 12. Consequences

## Positive

- Clear separation between commercial agreement and runtime authorization.
- Flexible multi-license model.
- Metadata-driven licensing scopes.
- Supports future licensing strategies.
- Enables deterministic Commercial Manifest generation.
- Keeps Runtime independent of commercial complexity.

### Trade-offs

- Introduces an additional aggregate (LicenseAssignment).
- Requires entitlement resolution during Commercial Publish.
- Adds architectural complexity in exchange for long-term extensibility.

---

# 13. Cross-Engine Impact

This ADR influences:

- VS08 Commercial Engine
- VS06 Runtime Engine
- CM-003 Authorization
- Reporting Engine
- Scheduler Engine
- Notification Engine
- AI Engine

---

# 14. Architectural Invariants

The following rules are permanently established:

1. License is a runtime authorization artifact.
2. Subscription is a commercial agreement.
3. One Subscription may produce multiple Licenses.
4. Every License has exactly one authorization scope.
5. License scope is metadata-driven.
6. Entitlements are resolved for a License.
7. LicenseAssignment only binds commercial authorization to operational resources.
8. Runtime consumes only the Commercial Manifest.
9. Runtime never evaluates License metadata directly.
10. Commercial resolution is deterministic.

---

# 15. Related Documents

- VS08B-001 — Commercial Blueprint
- CAG-001 — Commercial Architecture Guide
- DM-001 — Commercial Domain Model
- ADR-008-018 — Subscription Model
- ADR-008-020 — Entitlement Model
- ADR-008-021 — Feature Evaluation Model
- ADR-008-022 — Usage Policy Model
- ADR-008-023 — Commercial Manifest & Runtime Enforcement Boundary
- ADR-008-024 — Billing Integration Boundary