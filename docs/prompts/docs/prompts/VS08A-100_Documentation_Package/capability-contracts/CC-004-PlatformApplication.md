# ADR-008-014 — Tenant Workspace Model

**Status:** Accepted

**Engine:** VS08 – License, Subscription & Tenant Management Engine

**Milestone:** VS08A – Tenant Foundation

---

# Context

A Tenant represents the commercial and ownership boundary of the CAP Platform.

Users, applications, environments, and operational data should not be attached directly to a Tenant.

Instead, operational activity occurs within a Tenant Workspace.

A Tenant may require multiple isolated workspaces for different environments, business units, regions, or operational purposes.

---

# Decision

Introduce **TenantWorkspace** as the operational boundary of the CAP Platform.

Every TenantWorkspace belongs to exactly one Tenant.

A Tenant may own zero or more TenantWorkspaces.

---

# Responsibilities

TenantWorkspace is responsible for:

* Workspace identity
* Workspace lifecycle
* Operational defaults
* Isolation boundary

TenantWorkspace is **not** responsible for:

* Application installation
* Membership
* Licensing
* Subscription
* Billing
* Runtime execution

---

# Lifecycle

```text
Provisioning
        │
        ▼
Active
   ▲    │
   │    ▼
Suspended
        │
        ▼
Archived
```

Archived is terminal.

---

# Workspace Isolation

Each workspace is isolated from every other workspace belonging to the same Tenant.

Workspace data must never be shared implicitly.

Cross-workspace communication is always explicit.

---

# Consequences

The platform gains:

* Environment isolation
* Multi-business-unit support
* Regional separation
* Safe operational boundaries
* Independent workspace lifecycle

---

# Alternatives Considered

### Single Workspace per Tenant

Rejected.

Prevents future enterprise scenarios.

### Direct Tenant Ownership of Operational Data

Rejected.

Violates separation of concerns and limits scalability.

---

# Decision Summary

TenantWorkspace is the operational boundary of CAP.

Every operational artifact belongs to a TenantWorkspace rather than directly to a Tenant.
