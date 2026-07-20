# CC-002 — PlatformApplicationPackage

**Status:** Approved

**Engine:** VS08 – License, Subscription & Tenant Management Engine

**Milestone:** VS08A – Tenant Foundation

**Aggregate Root:** PlatformApplicationPackage

**Bounded Context:** Platform Catalog

---

# 1. Objective

Implement the **PlatformApplicationPackage** aggregate.

A PlatformApplicationPackage is the immutable, versioned deployment artifact for a PlatformApplication.

It is the unit installed into a Tenant Workspace and executed by the CAP Runtime.

---

# 2. Responsibilities

The aggregate is responsible for:

* Package identity
* Version management
* Package lifecycle
* Publication
* Immutability
* Association with a PlatformApplication

The aggregate is **not** responsible for installation, licensing, runtime execution, or marketplace distribution.

---

# 3. Capability Matrix

| Capability                   | Included |
| ---------------------------- | -------- |
| Create Package               | ✅        |
| Publish Package              | ✅        |
| Deprecate Package            | ✅        |
| Archive Package              | ✅        |
| Get Package by Id            | ✅        |
| Get Package by Version       | ✅        |
| List Packages                | ✅        |
| List Packages by Application | ✅        |
| Get Latest Published Package | ✅        |
| Validate Semantic Version    | ✅        |

---

# 4. Out of Scope

The following capabilities are explicitly excluded:

* WorkspaceInstallation
* Tenant
* TenantWorkspace
* Licensing
* Subscription
* Billing
* Marketplace
* Runtime execution
* Manifest generation

These capabilities belong to later work packages.

---

# 5. Dependencies

Requires:

* ES-001 Database Standards
* ES-008 Architecture & Domain Modeling
* ES-009 Data Ownership & Persistence
* ES-010 Platform Naming & Namespace
* ADR-008-001 through ADR-008-012
* DDS-101A

---

# 6. Domain Ownership

**Platform Domain**

Only Platform Administrators may create, publish, deprecate, or archive application packages.

Tenant administrators have read-only access to published packages available for installation.

---

# 7. Aggregate

```text
PlatformApplicationPackage
```

Aggregate Root.

---

# 8. Business Attributes

## Identity

* Package Id
* PlatformApplication Id
* Version

## Metadata

* Display Name
* Description
* Release Notes

## Lifecycle

* Draft
* Published
* Deprecated
* Archived

## Audit

* Created By
* Created On
* Modified By
* Modified On
* Deleted By
* Deleted On
* Is Deleted

---

# 9. Relationships

```text
PlatformApplication
        │
        │ 1
        ▼
PlatformApplicationPackage
```

A PlatformApplication owns many PlatformApplicationPackages.

A package belongs to exactly one PlatformApplication.

Packages cannot be reassigned.

---

# 10. Business Rules

* PlatformApplication must exist before a package can be created.
* Version must be unique within the owning PlatformApplication.
* Version must follow Semantic Versioning 2.0.0.
* Version is immutable.
* Published packages are immutable.
* Archived packages cannot be republished.
* Packages are never hard deleted.

---

# 11. Runtime Responsibilities

The Runtime executes PlatformApplicationPackages.

The Runtime never executes PlatformApplications.

Only Published packages are eligible for installation and execution.

---

# 12. Non-Functional Requirements

* Soft delete required.
* Full CAP audit support.
* Optimistic concurrency.
* Repository pattern.
* Domain validation.
* Integration tests against PostgreSQL/Prisma.
* No business logic inside repositories.

---

# 13. Acceptance Criteria

The capability is complete only when:

* Aggregate implemented.
* Semantic version validation enforced.
* Package immutability enforced.
* Repository tests pass.
* Integration tests pass.
* Audit fields implemented.
* Soft delete implemented.
* Architecture compliance verified.
* No TODOs or placeholder implementations.

---

# 14. Deliverables

AG shall produce:

* Prisma model
* Migration
* Aggregate
* Repository interface
* Repository implementation
* Domain service
* Validation
* Unit tests
* Integration tests
* Technical documentation

---

# 15. Explicit Exclusions

Do not implement:

* WorkspaceInstallation
* Licensing
* Marketplace
* Runtime execution
* Billing
* Subscription
* Manifest generation
* Tenant functionality

These capabilities are outside the scope of CC-002.
