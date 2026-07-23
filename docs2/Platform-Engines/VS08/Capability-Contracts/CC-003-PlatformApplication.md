# CC-003 — Tenant

**Status:** Approved

**Engine:** VS08 – License, Subscription & Tenant Management Engine

**Milestone:** VS08A – Tenant Foundation

**Aggregate Root:** Tenant

**Bounded Context:** Tenant Management

---

# 1. Objective

Implement the **Tenant** aggregate.

A Tenant represents the primary commercial, ownership, and security boundary of the CAP Platform.

---

# 2. Responsibilities

The Tenant aggregate is responsible for:

* Tenant identity
* Tenant lifecycle
* Platform defaults
* Ownership boundary

The Tenant aggregate is **not** responsible for workspaces, licensing, subscriptions, memberships, installations, billing, or runtime execution.

---

# 3. Capability Matrix

| Capability             | Included |
| ---------------------- | -------- |
| Register Tenant        | ✅        |
| Activate Tenant        | ✅        |
| Suspend Tenant         | ✅        |
| Archive Tenant         | ✅        |
| Update Tenant Metadata | ✅        |
| Get Tenant by Id       | ✅        |
| Get Tenant by Code     | ✅        |
| List Tenants           | ✅        |
| Validate Tenant Code   | ✅        |
| Validate Tenant Name   | ✅        |

---

# 4. Out of Scope

* TenantWorkspace
* WorkspaceInstallation
* Subscription
* Licensing
* Billing
* Membership
* Feature Flags
* Runtime

---

# 5. Dependencies

Requires:

* ES-001
* ES-008
* ES-009
* ES-010
* ADR-008-001 through ADR-008-013
* DDS-101A

---

# 6. Domain Ownership

Platform Domain.

Tenant administrators operate within an existing Tenant but cannot create or archive Tenants.

Only Platform Administrators may perform lifecycle operations.

---

# 7. Aggregate

```text
Tenant
```

Aggregate Root.

---

# 8. Business Attributes

## Identity

* TenantId
* TenantCode
* TenantName

## Presentation

* DisplayName
* Description
* LogoUrl

## Platform Defaults

* DefaultTimeZone
* DefaultCulture
* DefaultCurrency

## Lifecycle

* Provisioning
* Active
* Suspended
* Archived

## Audit

Standard ES-001 audit fields.

---

# 9. Relationships

```text
Tenant
   │
   ├── TenantWorkspace (future)
   ├── Subscription (future)
   ├── TenantMembership (future)
   └── WorkspaceInstallation (future)
```

---

# 10. Business Rules

* TenantCode is immutable.
* TenantCode is globally unique.
* TenantName is globally unique.
* Tenant cannot be hard deleted.
* Archived Tenants cannot be reactivated.
* Provisioning Tenants cannot access runtime.

---

# 11. Non-Functional Requirements

* Soft delete.
* Full audit support.
* Optimistic concurrency.
* Repository pattern.
* PostgreSQL integration tests.
* No business logic in repositories.

---

# 12. Acceptance Criteria

Complete only when:

* Aggregate implemented.
* Lifecycle enforced.
* Repository implemented.
* Service implemented.
* Migration succeeds.
* Unit tests pass.
* Integration tests pass.
* Architecture compliance verified.
* No TODOs or placeholders.

---

# 13. Deliverables

* Prisma model
* Migration
* Aggregate
* Repository
* Repository interface
* Service
* Validation
* Unit tests
* Integration tests
* Documentation
