# CC-006 — TenantMembership

**Status:** Approved

**Engine:** VS08 – License, Subscription & Tenant Management Engine

**Milestone:** VS08A – Tenant Foundation

**Aggregate Root:** TenantMembership

**Bounded Context:** Tenant Management

---

# 1. Objective

Implement the **TenantMembership** aggregate.

A TenantMembership represents the association between a Platform User and a Tenant.

---

# 2. Responsibilities

The aggregate manages:

* Membership identity
* Tenant association
* User association
* Membership lifecycle
* Tenant-level roles

It does **not** manage:

* Authentication
* Workspace membership
* Workspace permissions
* Licensing
* Billing
* Runtime authorization

---

# 3. Capability Matrix

| Capability                 | Included |
| -------------------------- | -------- |
| Invite User                | ✅        |
| Activate Membership        | ✅        |
| Suspend Membership         | ✅        |
| Remove Membership          | ✅        |
| Update Tenant Role         | ✅        |
| Get Membership by Id       | ✅        |
| Get Membership by User     | ✅        |
| List Memberships by Tenant | ✅        |
| Validate Membership        | ✅        |

---

# 4. Business Attributes

## Identity

* MembershipId
* TenantId
* UserId

## Role

* TenantRole

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
PlatformUser
        │
        ▼
TenantMembership
        │
        ▼
Tenant
```

A User may belong to many Tenants.

A Tenant may contain many Users.

---

# 6. Business Rules

* Tenant must exist.
* User must exist.
* Only one active membership per `(TenantId, UserId)`.
* Membership cannot change Tenant.
* Membership cannot change User.
* Removed memberships cannot be reactivated.
* Memberships cannot be hard deleted.

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
