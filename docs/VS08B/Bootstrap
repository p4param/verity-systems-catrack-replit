# VS08B — EWP-008 Subscription Implementation

You are implementing EWP-008 of the CAP Platform.

This is NOT a design exercise.

The architecture is frozen.

You are NOT allowed to redesign the solution.

Your responsibility is to verify the governing documents, identify any inconsistencies, and implement the approved architecture exactly as specified.

────────────────────────────────────────
IMPLEMENTATION PHASE
────────────────────────────────────────

Capability Contract
CC-008 — Subscription

Engineering Work Package
EWP-008 — Subscription

Architecture Status
VS08B Commercial Foundation
ARCHITECTURE FROZEN (AFR-001 Certified)

────────────────────────────────────────
MANDATORY GOVERNING DOCUMENTS
────────────────────────────────────────

Read and verify before writing any code:

• ES-001 Database Standards
• ES-008 Architecture & Domain Modeling
• ES-009 Data Ownership & Persistence
• ES-010 Platform Naming & Namespace

• VS08B-001 Commercial Blueprint
• CAG-001 Commercial Architecture Guide
• DM-001 Commercial Domain Model

• AFR-001 VS08B Architecture Freeze Review

• ADR-008-018 Subscription Model
• ADR-008-019 License Ownership & Scope Model
• ADR-008-020 Entitlement Resolution Model
• ADR-008-021 Feature Evaluation Model
• ADR-008-022 Usage Policy Model
• ADR-008-023 Commercial Manifest & Runtime Enforcement Boundary
• ADR-008-024 Billing Integration Boundary

• CC-008 Subscription
• EWP-008 Subscription

If ANY governing document is missing:

STOP.

Report the missing document.

Do NOT invent architecture.

Do NOT substitute another document.

Wait for approval.

────────────────────────────────────────
IMPLEMENTATION RULES
────────────────────────────────────────

Implement ONLY the Subscription aggregate.

Do NOT begin implementation of:

• License
• Entitlement
• Feature
• Usage Policy
• Commercial Manifest
• Commercial Publish Pipeline

Those belong to future Capability Contracts.

────────────────────────────────────────
DEPENDENCY VERIFICATION
────────────────────────────────────────

Before implementation produce a Dependency Verification Report.

Incoming Dependencies

✓ Tenant
✓ SubscriptionPlan

Outgoing Dependencies

None

Future Dependencies

→ License (CC-009)

Forbidden Dependencies

✗ Runtime
✗ Billing
✗ Entitlement
✗ Feature
✗ Usage Policy
✗ Commercial Manifest

If any forbidden dependency exists, STOP and report it.

────────────────────────────────────────
ARCHITECTURAL INVARIANTS
────────────────────────────────────────

Verify the implementation satisfies all of the following:

✓ Subscription is a Commercial Agreement.

✓ Subscription is NOT Runtime Authorization.

✓ Subscription never evaluates Features.

✓ Subscription never evaluates Usage Policies.

✓ Subscription never evaluates Entitlements.

✓ Subscription never references Billing Providers.

✓ Subscription never generates Commercial Manifest.

✓ Subscription only publishes domain events.

✓ Runtime is never referenced.

✓ Billing is never referenced.

────────────────────────────────────────
IMPLEMENTATION REQUIREMENTS
────────────────────────────────────────

Implement only what CC-008 and EWP-008 specify.

Follow existing VS08A implementation patterns.

Use:

• Aggregate Root
• Repository
• Service
• Repository Interface
• Domain Models
• Validators
• Domain Errors
• Unit Tests
• PostgreSQL Integration Tests

Use optimistic concurrency.

Use soft delete.

No TODOs.

No placeholders.

No mock implementations.

────────────────────────────────────────
LIFECYCLE
────────────────────────────────────────

Implement only the approved lifecycle:

Draft

↓

Trial

↓

Active

↕

Suspended

↓

Expired

↓

Cancelled

↓

Archived

Archived is terminal.

────────────────────────────────────────
DOMAIN EVENTS
────────────────────────────────────────

Subscription lifecycle changes shall publish domain events only.

Do NOT implement event handlers.

Do NOT implement Commercial Publish Pipeline.

Do NOT generate Commercial Manifest.

Those belong to future work packages.

────────────────────────────────────────
REQUIRED VERIFICATION
────────────────────────────────────────

Before completion verify:

✓ Architecture compliance

✓ Repository compliance

✓ Domain compliance

✓ ES-001 compliance

✓ ES-009 compliance

✓ ADR compliance

✓ CC compliance

✓ EWP compliance

✓ Dependency verification

✓ No forbidden references

✓ Zero lint errors in new code

✓ Prisma validation passes

✓ All unit tests pass

✓ All integration tests pass

────────────────────────────────────────
DELIVERABLES
────────────────────────────────────────

Provide:

1. Files created

2. Files modified

3. Migration summary

4. Test summary

5. Dependency Verification Report

6. Architecture Compliance Report

7. Certification that EWP-008 is production-ready.

Do not begin CC-009.

Stop after EWP-008 is fully certified.