DM-001 — VS08B Commercial Domain Model

Document Type: Domain Model

Engine: VS08 – License, Subscription & Tenant Management Engine

Phase: VS08B – Commercial Foundation

Status: Architecture Draft

1. Purpose

The Commercial Domain Model defines the aggregate structure, ownership hierarchy, bounded contexts, and relationships for the commercial subsystem of the CAP Platform.

Unlike the Blueprint, which explains the vision, or the Commercial Architecture Guide, which explains behavior, this document defines what the commercial domain is composed of.

It is the canonical reference for all commercial aggregates.

2. Commercial Domain Philosophy

The Commercial Domain answers one question:

"What commercial rights does this customer own?"

It never answers:

How applications execute
How workflows run
How data is stored
How permissions are evaluated

Those belong to other platform engines.

3. Commercial Bounded Context
Commercial Foundation
────────────────────────────────────────────

Catalog

Commercial Agreements

Commercial Rights

Commercial Runtime

Commercial Billing Boundary

Each bounded context owns its own aggregates.

4. Aggregate Ownership
4.1 Commercial Catalog

Platform-owned.

Contains immutable commercial definitions.

SubscriptionPlan
        │
        ▼
ProductEdition
        │
        ▼
FeatureCatalog

Characteristics

Platform only
Versioned
Immutable after publication
Shared across every tenant
4.2 Commercial Agreements

Tenant-owned.

Represents contractual relationships.

TenantSubscription
        │
        ▼
License

Characteristics

Tenant specific
Time based
Renewable
Auditable
4.3 Commercial Rights

Derived from licenses.

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

Characteristics

Deterministic
Metadata-driven
Runtime independent
4.4 Runtime Resolution

Produces:

ResolvedCommercialRights

This is not persisted.

It is a calculated runtime object.

5. Aggregate Relationship Diagram
                    SubscriptionPlan
                           │
                           │ 1
                           │
                           ▼
                  TenantSubscription
                           │
                           │ 1
                           ▼
                       License
                           │
                           │ 1..N
                           ▼
                  LicenseAssignment
                           │
                           ▼
              WorkspaceInstallation

Rights hierarchy

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
6. Operational Relationship

Commercial never owns operational entities.

Instead

Tenant

↓

Workspace

↓

Installation

is linked through

LicenseAssignment

No other aggregate crosses the boundary.

7. Aggregate Responsibilities
SubscriptionPlan

Owns

commercial product definition
editions
pricing metadata
plan lifecycle

Never owns tenants.

TenantSubscription

Owns

contract
trial
renewal
expiry

Never owns runtime.

License

Owns

authorization
commercial validity

Never owns deployment.

LicenseAssignment

Owns

operational linkage

Never owns commercial rules.

Entitlement

Owns

commercial rights

Examples

Users
Storage
API
Workflows
AI
FeatureFlag

Owns

enabled capabilities

Examples

Workflow

Reporting

Scheduler

Dashboard

AI

Audit

Notifications
UsagePolicy

Owns

quantitative limits

Examples

Concurrent Users

Storage

API Calls

Scheduler Jobs

Reports

AI Tokens
ResolvedCommercialRights

Owns

Runtime view of commercial rights.

Contains

Enabled Features

Usage Limits

Effective License

Effective Plan

Effective Policies

Generated dynamically.

Never stored.

8. Aggregate Cardinality
SubscriptionPlan

1

↓

N

TenantSubscription
TenantSubscription

1

↓

N

License
License

1

↓

N

LicenseAssignment
License

1

↓

N

Entitlement
Entitlement

1

↓

N

FeatureFlag
Entitlement

1

↓

N

UsagePolicy
9. Domain Invariants

The following are permanent.

SubscriptionPlan
Immutable after publication
Platform-owned
TenantSubscription
References exactly one Tenant
References exactly one SubscriptionPlan
License
Cannot exist without Subscription
Time bounded
Independently suspended
LicenseAssignment
References exactly one Installation
References exactly one License
Entitlement
Derived from License
FeatureFlag
Derived from Entitlements
UsagePolicy
Derived from Entitlements
Runtime

Consumes only

ResolvedCommercialRights

Never subscriptions.

Never licenses.

Never billing.

10. Cross-Engine Boundaries
Engine	Relationship
VS06 Runtime	Consumes ResolvedCommercialRights only
VS07 Workflow	Feature and quota evaluation
CM-002 Authentication	Supplies tenant/workspace session context
CM-003 Authorization	Combines permissions with commercial rights
Notification Engine	Reacts to subscription/license events
Reporting Engine	Commercial reporting and analytics
Scheduler Engine	Enforces scheduled quotas
AI Engine	Applies AI feature and token entitlements
11. Future Extension Points

The model intentionally supports future expansion without changing existing aggregates.

Examples:

Marketplace

↓

Add-on Packs

↓

Regional Editions

↓

Partner Licensing

↓

OEM Licensing

↓

Consumption Billing

↓

AI Credit Packs

↓

Feature Bundles

↓

Module Packs

These become additional commercial metadata rather than structural changes.

12. Canonical Commercial Domain Diagram
                    PLATFORM
                        │
                        ▼
                SubscriptionPlan
                        │
                        ▼
              TenantSubscription
                        │
                        ▼
                    License
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
 LicenseAssignment              Entitlement
          │                           │
          ▼                           ▼
WorkspaceInstallation          FeatureFlag
                                      │
                                      ▼
                                UsagePolicy
                                      │
                                      ▼
                         ResolvedCommercialRights
                                      │
                                      ▼
                               Runtime Engine
13. Commercial Resolution Flow
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
        │
        ▼
Runtime

This flow is deterministic. Given the same commercial state, it must always produce the same ResolvedCommercialRights.

Recommendation Before ADR-008-018

At this point, I believe the commercial architecture is sufficiently defined to begin the ADR sequence.

The documentation stack for VS08B is now:

VS08B-001 Commercial Blueprint
        │
        ▼
CAG-001 Commercial Architecture Guide
        │
        ▼
DM-001 Commercial Domain Model
        │
        ▼
ADR-008-018 Subscription Model
        │
        ▼
ADR-008-019 License Ownership Model
        │
        ▼
ADR-008-020 Entitlement Model
        │
        ▼
ADR-008-021 Feature Flag Evaluation
        │
        ▼
ADR-008-022 Usage Policy Model
        │
        ▼
ADR-008-023 License Enforcement Boundary
        │
        ▼
ADR-008-024 Billing Integration Boundary