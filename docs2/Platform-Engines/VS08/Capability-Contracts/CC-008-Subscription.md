# CC-008 — Subscription

**Status:** Approved

**Engine:** VS08 – License, Subscription & Tenant Management Engine

**Milestone:** VS08B – Commercial Foundation

**Aggregate Root:** Subscription

**Bounded Context:** Commercial Agreements

---

# 1. Objective

Implement the **Subscription** aggregate exactly as defined by the approved CAP architecture (VS08B Commercial Foundation).

A Subscription represents the commercial agreement between a Tenant and the CAP Platform. It manages contractual metadata, subscription plans, renewal policies, and commercial lifecycles without introducing runtime authorization dependencies or billing provider coupling.

---

# 2. Responsibilities

The aggregate manages:

* Subscription identity
* Tenant association
* Subscription plan association
* Commercial lifecycle (Draft, Trial, Active, Suspended, Expired, Cancelled, Archived)
* Subscription dates (Start Date, End Date, Trial End Date, Renewed At, Cancelled At)
* Renewal policy configuration (AUTO_RENEW, MANUAL, NON_RENEWING)
* Provider-neutral external reference metadata (`externalReferenceId`)

It does **not** manage:

* Runtime authorization (managed by future `License` aggregate — CC-009)
* Feature flags or entitlement evaluation
* Usage policy enforcement
* Billing execution or payment processing (managed by external Billing Providers via integration events — ADR-008-024)
* User or workspace permissions

---

# 3. Capability Matrix

| Capability | Included |
| ---------- | -------- |
| Create Subscription | ✅ |
| Start Trial | ✅ |
| Activate Subscription | ✅ |
| Suspend Subscription | ✅ |
| Resume Subscription | ✅ |
| Cancel Subscription | ✅ |
| Expire Subscription | ✅ |
| Renew Subscription | ✅ |
| Archive Subscription | ✅ |
| Get Subscription by Id | ✅ |
| Get Subscriptions by Tenant | ✅ |
| List Active Subscriptions | ✅ |
| List Expiring Subscriptions | ✅ |
| Validate Subscription State | ✅ |

---

# 4. Business Attributes

## Identity
* SubscriptionId (UUID)
* TenantId (UUID)
* SubscriptionPlanId (UUID)
* Code (String, Unique per Tenant)
* Name (String)

## Configuration & Terms
* RenewalPolicy (AUTO_RENEW | MANUAL | NON_RENEWING)
* ExternalReferenceId (String, Optional — provider-neutral reference)

## Lifecycle
* Status (DRAFT | TRIAL | ACTIVE | SUSPENDED | EXPIRED | CANCELLED | ARCHIVED)

## Timestamps
* StartDate (DateTime)
* EndDate (DateTime, Optional)
* TrialEndDate (DateTime, Optional)
* RenewedAt (DateTime, Optional)
* CancelledAt (DateTime, Optional)

## Audit
Standard ES-001 audit fields (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`, `isDeleted`).

---

# 5. Relationships & Future Pipeline

```text
Tenant
  │
  ▼
Subscription (1..N)
  │
  ▼
SubscriptionPlan (1..1)
  │
  ▼ (Future CC-009)
License (1..N)
```

* A Tenant may own multiple concurrent Subscriptions.
* A Subscription belongs to exactly one Tenant.
* A Subscription references exactly one SubscriptionPlan.
* **Future Relationship:** A Subscription will generate one or more `License` aggregates (CC-009). The `SubscriptionService` lifecycle events (e.g. activation, renewal, suspension) will trigger the future Commercial Publish Pipeline (CC-014) to regenerate the runtime `CommercialManifest`.

---

# 6. Business Rules

* Tenant must exist and be Active.
* SubscriptionPlan must exist and be Active.
* Code must be unique per Tenant (`tenant_id, code`).
* StartDate must precede EndDate if EndDate is provided.
* Active status requires valid StartDate and not past EndDate.
* Trial status requires TrialEndDate in the future.
* Lifecycle transitions must follow the frozen state machine:
  * `Draft` → `Trial` | `Active`
  * `Trial` → `Active` | `Expired` | `Cancelled`
  * `Active` → `Suspended` | `Expired` | `Cancelled`
  * `Suspended` → `Active` | `Cancelled` | `Expired`
  * `Expired` → `Archived` | `Active` (on Renewal)
  * `Cancelled` → `Archived`
  * `Archived` is immutable (terminal state).
* Cancelled or Archived subscriptions cannot be reactivated directly without renewal or new creation.
* Subscriptions cannot be hard deleted.

---

# 7. Non-Functional Requirements

* Soft delete enforcement.
* Full audit support (ES-001).
* Optimistic concurrency control (`version`).
* Repository pattern separation (ES-009).
* PostgreSQL integration tests.

---

# 8. Acceptance Criteria

Complete only when:

* Subscription aggregate implemented.
* Lifecycle state machine strictly enforced (including edge cases).
* Repository and service implemented with active/expiring query methods.
* Database migration succeeds cleanly.
* Unit tests pass (100% lifecycle & edge case coverage).
* Integration tests pass (PostgreSQL).
* Architecture compliance verified.
* Future Commercial Publish trigger noted in service documentation.
* No TODOs or placeholder implementations.

---

# 9. Deliverables

* Prisma model (`tenant_subscriptions`)
* Migration script
* Domain Aggregate (`Subscription`)
* Repository Interface & Implementation (`SubscriptionRepository`)
* Application Service (`SubscriptionService`)
* Validation Schemas & DTOs
* Unit Tests & Integration Tests
* Technical Documentation & Review Package
