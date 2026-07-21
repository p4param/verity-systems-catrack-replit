# CC-007 — WorkspaceMembership

**Status:** Approved

**Engine:** VS08 – License, Subscription & Tenant Management Engine

**Milestone:** VS08A – Tenant Foundation

**Aggregate Root:** WorkspaceMembership

**Bounded Context:** Tenant Management

---

# 1. Objective

Implement the **WorkspaceMembership** aggregate.

A WorkspaceMembership represents the operational participation of a Tenant member within a specific TenantWorkspace.

---

# 2. Responsibilities

The aggregate manages:

* Workspace association
* TenantMembership association
* Workspace role
* Membership lifecycle

It does **not** manage:

* Authentication
* Tenant membership
* Licensing
* Billing
* Runtime authorization
* Permission evaluation

---

# 3. Capability Matrix

| Capability                  | Included |
| --------------------------- | -------- |
| Invite to Workspace         | ✅        |
| Activate Membership         | ✅        |
| Suspend Membership          | ✅        |
| Remove Membership           | ✅        |
| Update Workspace Role       | ✅        |
| Get Membership by Id        | ✅        |
| Get Membership by Workspace | ✅        |
| List Workspace Members      | ✅        |
| Validate Membership         | ✅        |

---

# 4. Business Attributes

## Identity

* WorkspaceMembershipId
* WorkspaceId
* TenantMembershipId

## Role

* WorkspaceRole

## Lifecycle

* Invited
* Active
* Suspended
* Removed

## Audit

Standard ES-001 audit fields.

---

# 5. Relationships

```text
TenantMembership
        │
        ▼
WorkspaceMembership
        │
        ▼
TenantWorkspace
```

---

# 6. Business Rules

* Workspace must exist.
* TenantMembership must exist.
* TenantMembership and Workspace must belong to the same Tenant.
* Only one membership per `(WorkspaceId, TenantMembershipId)`.
* Workspace association is immutable.
* TenantMembership association is immutable.
* Removed memberships cannot be reactivated.
* WorkspaceMemberships cannot be hard deleted.

---

# 7. Non-Functional Requirements

* Soft delete.
* Full audit support.
* Optimistic concurrency.
* Repository pattern.
* PostgreSQL integration tests.

---

# 8. Acceptance Criteria

Complete only when:

* Aggregate implemented.
* Lifecycle enforced.
* Repository implemented.
* Service implemented.
* Migration succeeds.
* Unit tests pass.
* Integration tests pass.
* Architecture compliance verified.
* No TODOs or placeholder implementations.

---

# 9. Deliverables

* Prisma model
* Migration
* Aggregate
* Repository
* Repository interface
* Service
* Validation
* Unit tests
* Integration tests
* Technical documentation
