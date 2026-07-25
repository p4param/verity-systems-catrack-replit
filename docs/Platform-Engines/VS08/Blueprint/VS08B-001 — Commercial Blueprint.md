VS08B-001 — Commercial Blueprint

Engine: VS08 – License, Subscription & Tenant Management Engine

Phase: VS08B – Commercial Foundation

Document Type: Engine Blueprint

Status: Architecture Draft

1. Purpose

The Commercial Foundation provides the business model that governs how the CAP Platform is sold, licensed, entitled, and consumed.

It separates commercial ownership from operational execution, ensuring that pricing, subscriptions, licensing, and billing never become embedded in business applications or the runtime engine.

This blueprint defines the commercial architecture that all future CAP applications will share.

2. Core Commercial Philosophy

The commercial domain follows five principles:

Principle 1 — Separation of Commercial and Operational State

Commercial entities describe what a customer is entitled to use.

Operational entities describe what is actually deployed and running.

These two domains are related but remain independent.

Principle 2 — Runtime Never Understands Billing

The Runtime Engine never evaluates:

subscription plans,
invoices,
payment providers,
pricing,
commercial contracts.

Runtime consumes only Resolved Commercial Rights.

Principle 3 — Commercial Rights are Deterministic

At runtime there must be a deterministic object representing everything the tenant is allowed to do.

Example:

ResolvedCommercialRights

Runtime never traverses subscriptions or licenses.

Principle 4 — Commercial Model is Application-Agnostic

Nothing in the commercial domain may reference:

Catering ERP
HSE
HRMS
CRM
Manufacturing

The model must remain generic.

Principle 5 — Commercial Domain is Metadata-Driven

Plans, entitlements, feature bundles, and limits are configurable metadata rather than hard-coded rules.

3. Commercial Domains

The commercial foundation is divided into seven bounded contexts.

Commercial Catalog
────────────────────────

SubscriptionPlan

ProductEdition

FeatureCatalog


Commercial Agreements
────────────────────────

TenantSubscription

License


Commercial Rights
────────────────────────

Entitlement

FeatureFlag

UsagePolicy


Commercial Runtime
────────────────────────

ResolvedCommercialRights


Commercial Billing Boundary
────────────────────────

Billing Integration
4. Aggregate Responsibilities
SubscriptionPlan

Defines what products are offered.

Platform-owned.

Never tenant-owned.

TenantSubscription

Represents the commercial agreement between the platform and a tenant.

Contains:

plan,
start,
expiry,
renewal,
status,
billing reference.
License

Represents the legal/commercial authorization granted under a subscription.

Licenses may later support:

tenant scope,
workspace scope,
installation scope.
LicenseAssignment

Connects commercial rights to operational resources.

For example:

License

↓

WorkspaceInstallation

This is the only intentional bridge between the commercial and operational domains.

Entitlement

Defines what is allowed.

Examples:

maximum users,
maximum workspaces,
storage,
workflow executions,
API limits.
FeatureFlag

Defines which capabilities are available.

Examples:

Workflow
Dashboard
Reporting
Scheduler
AI
Audit
Mobile
UsagePolicy

Defines how much may be consumed.

Examples:

document storage,
API calls,
report executions,
scheduler jobs,
AI tokens.
5. Commercial Hierarchy

The ownership model is:

SubscriptionPlan
        │
        ▼
TenantSubscription
        │
        ▼
License
        │
        ▼
Entitlement
        │
        ▼
FeatureFlag
        │
        ▼
UsagePolicy

Each aggregate has exactly one responsibility.

6. Relationship to Operational Domain

Operational model:

Tenant
        │
        ▼
TenantWorkspace
        │
        ▼
WorkspaceInstallation

Commercial model:

Subscription
        │
        ▼
License
        │
        ▼
Entitlement

Bridge:

LicenseAssignment

↓

WorkspaceInstallation

This keeps the domains cleanly separated.

7. Runtime Resolution

Before any application executes, the Commercial Engine resolves:

Subscription

↓

License

↓

Entitlements

↓

Feature Flags

↓

Usage Policies

↓

ResolvedCommercialRights

Only this resolved object is passed into the Runtime Engine.

8. Billing Boundary

Billing is an external concern.

Billing systems may:

create subscriptions,
renew subscriptions,
cancel subscriptions,
change plans.

Billing never directly controls runtime execution.

The commercial engine translates billing events into licensing state.

9. Marketplace Readiness

The commercial architecture must support future:

Marketplace applications
Add-on modules
Premium feature packs
AI service bundles
Usage-based products
OEM licensing
Partner licensing

without changing the core model.

10. Future Integration Points

The commercial foundation will integrate with:

CM-002 Authentication
CM-003 Authorization
VS06 Runtime
VS07 Workflow
Notification Engine
Reporting Engine
Scheduler Engine
AI Engine
Marketplace

through resolved commercial rights rather than direct subscription queries.

11. Out of Scope

This blueprint does not define:

payment gateways,
invoice generation,
taxation,
accounting,
ERP finance,
payment provider APIs.

Those are integration concerns.

12. Success Criteria

The Commercial Foundation is considered successful when:

Commercial and operational domains remain independent.
Runtime consumes only resolved commercial rights.
Licensing is metadata-driven.
Plans and entitlements are reusable across all CAP applications.
Future billing providers can be integrated without changing runtime behavior.