CAG-001 — Commercial Architecture Guide

Engine: VS08 – License, Subscription & Tenant Management Engine

Phase: VS08B – Commercial Foundation

Document Type: Commercial Architecture Guide

Status: Architecture Draft

1. Purpose

The Commercial Architecture Guide defines the internal architecture of the CAP Commercial Domain.

It explains how subscriptions, licenses, entitlements, feature flags, and usage policies interact while remaining isolated from runtime execution and business applications.

This guide is the authoritative reference for every commercial capability implemented within CAP.

2. Commercial Philosophy

The commercial domain exists to answer one question:

What is this tenant entitled to use?

It does not answer:

What is deployed?
What is currently running?
What workflow executes?
What business rules apply?

Those belong to other engines.

3. Separation of Domains

CAP intentionally separates Commercial from Operational.

Operational Domain
Tenant
        │
        ▼
Workspace
        │
        ▼
Installation
        │
        ▼
Runtime
Commercial Domain
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

The two domains intersect only through LicenseAssignment and the resulting ResolvedCommercialRights.

4. Aggregate Responsibilities
SubscriptionPlan

Defines the commercial products offered by the platform.

Examples:

Community
Professional
Enterprise
OEM
Custom

Characteristics:

Platform-owned
Versioned
Immutable once published
Metadata-driven
TenantSubscription

Represents the contractual relationship between a Tenant and a SubscriptionPlan.

Owns:

subscription lifecycle,
renewal,
effective dates,
trial periods,
billing reference.

Does not own:

runtime access,
feature evaluation,
payment processing.
License

Represents the legal authorization granted under a subscription.

The license is the commercial artifact that runtime ultimately trusts.

Future scopes may include:

Tenant
Workspace
Installation
LicenseAssignment

Bridges commercial and operational domains.

License
        │
        ▼
WorkspaceInstallation

No other aggregate should directly connect these domains.

Entitlement

Defines rights.

Examples:

Maximum users
Maximum workspaces
Storage quota
API quota
Scheduler quota
Workflow quota

Entitlements are declarative metadata.

FeatureFlag

Defines capabilities.

Examples:

Workflow
Reporting
Dashboards
Notifications
AI
Mobile
Scheduler

FeatureFlags answer whether a capability is available.

UsagePolicy

Defines consumption limits.

Examples:

API calls/day
Storage
AI tokens
Report executions
Scheduler jobs
Concurrent users

UsagePolicy answers how much may be consumed.

5. Commercial Resolution Pipeline

The commercial engine resolves rights in a deterministic pipeline.

SubscriptionPlan
        │
        ▼
TenantSubscription
        │
        ▼
License
        │
        ▼
Entitlements
        │
        ▼
Feature Flags
        │
        ▼
Usage Policies
        │
        ▼
ResolvedCommercialRights

This pipeline must always produce the same output for the same commercial state.

6. Runtime Boundary

The Runtime Engine must never evaluate:

Subscription plans
Billing status
Pricing
Invoices
Payment providers

Runtime consumes only:

ResolvedCommercialRights

This keeps the Runtime Engine independent of commercial complexity.

7. Billing Boundary

Billing is an external integration.

Billing systems may:

create subscriptions,
renew subscriptions,
cancel subscriptions,
upgrade plans,
downgrade plans.

Billing never grants runtime access directly.

Instead:

Billing Event
        │
        ▼
TenantSubscription
        │
        ▼
License
        │
        ▼
ResolvedCommercialRights
8. Commercial State Transitions

A simplified lifecycle:

Draft
        │
        ▼
Active
        │
        ├────────► Suspended
        │               │
        ▼               ▼
Expired         Cancelled
        │
        ▼
Archived

Individual aggregates may have more specific state machines, but they should align with this overarching commercial lifecycle.

9. Security Principles

The Commercial Domain must guarantee:

Tenant isolation
Deterministic entitlement resolution
Immutable published plans
Immutable published feature catalogs
Auditability of commercial changes
Separation of commercial and runtime concerns
10. Extensibility

The architecture must support future capabilities without redesign:

Marketplace applications
Add-on products
AI consumption packs
OEM licensing
Regional pricing
Promotional plans
Usage-based subscriptions
Partner-managed licenses
Multi-currency billing
11. Cross-Engine Integration

The Commercial Domain integrates with:

Engine	Integration
CM-002 Authentication	Session context for tenant/workspace selection
CM-003 Authorization	Permission evaluation consumes resolved rights
VS06 Runtime	Receives ResolvedCommercialRights
VS07 Workflow	Feature availability and quotas
Notification Engine	Subscription and license events
Reporting Engine	Commercial analytics and license reporting
Scheduler Engine	Usage policy enforcement
AI Engine	Token and feature entitlements

Notice that every engine consumes resolved rights, not subscriptions.

12. Architectural Invariants

The following rules are permanent:

Commercial state and operational state remain independent.
Runtime never queries billing systems.
Runtime never evaluates subscription plans.
Published commercial artifacts are immutable.
Entitlements are metadata, not code.
Feature availability derives from resolved rights.
Usage limits are enforced through policies, not hard-coded logic.
Billing integrations modify commercial state; they do not modify runtime state directly.
The commercial resolution pipeline must be deterministic.
Business applications must never contain licensing logic.
13. Future Evolution

This guide is expected to evolve as CAP grows, but its core philosophy should remain stable:

Commercial concerns define rights.
Operational concerns execute work.
Runtime enforces resolved rights.
Business applications remain unaware of licensing mechanics.
Relationship to Other Documents

Once this guide is frozen, the document hierarchy for VS08B becomes:

VS08B-001 Commercial Blueprint
        │
        ▼
CAG-001 Commercial Architecture Guide
        │
        ▼
ADR-008-018 Subscription Model
        ▼
ADR-008-019 License Ownership
        ▼
ADR-008-020 Entitlement Model
        ▼
ADR-008-021 Feature Evaluation
        ▼
ADR-008-022 Usage Policy
        ▼
ADR-008-023 License Enforcement Boundary
        ▼
ADR-008-024 Billing Integration Boundary
        ▼
Capability Contracts
        ▼
Engineering Work Packages