ES-014 — Engineering Work Package Implementation Standard
Status
Proposed Mandatory Engineering Standard for all future CAP Engineering Work Packages (EWPs).
Purpose
Define the mandatory implementation lifecycle from preflight through production certification.
Mandatory Adoption
ES-014 is mandatory for every future EWP. Implementation shall not begin until ES-014 has been reviewed. Compliance with ES-014 is required before certification.
Engineering Workflow
Engineering Preflight → Dependency Verification → Architecture Drift Review → Reference Pattern Review → Database Layer → Domain Layer → Infrastructure Layer → Application Layer → Public Exports → Test Suites → Verification Gates → Compliance Review → Production Certification
Engineering Preflight
Review ES-001, ES-008, ES-009, ES-010, ES-013, ES-014, ADRs, DDS (or explicit authorization), Capability Contract and EWP. Stop if any governing document is missing.
Dependency Verification
Verify module paths, barrel exports, tsconfig aliases, Jest discovery, Prisma client, repository registrations and dependencies.
Architecture Drift Review
Do not introduce new entities, ownership changes, aggregate changes, relationship redesigns or responsibility shifts.
Reference Pattern Review
Reuse certified implementation patterns from previous EWPs; do not invent new implementation styles.
Implementation Order
Schema → Migration → Models → Errors → Domain Events → Value Objects → Child Entities → Aggregate Root → Repository Interface → Repository → Application Service → Public Exports → Tests
Aggregate Rules
Aggregates own invariants, lifecycle, OCC and events. No repository or infrastructure access.
Repository Rules
Repositories provide persistence only with tenant isolation, soft delete filtering, OCC and ORM/domain mapping.
Application Service Rules
Coordinate repositories, transactions and event publication without duplicating domain logic.
Verification Gates
1. tsc --noEmit
2. Tests
3. prisma generate
4. npm run build
5. Lint (if enabled)
6. Architecture Review
7. Production Readiness
Mandatory Deliverables
Implementation Walkthrough, Compliance Report, Review Package, Production Certification.
Completion Criteria
Implementation, tests, build, verification, certification artifacts and clean workspace must all be complete.
Mandatory Integration
AG-001: Add ES-014 to mandatory standards and preflight.
ES-013: Certification requires ES-014 compliance.
Every EWP: Include Governing Standards section listing ES-001, ES-008, ES-009, ES-010, ES-013 and ES-014.
Recommended Repository Location
Canonical source: docs/standards/ES-014 — Engineering Work Package Implementation Standard.md
Cross-reference from AG-001, ES-013, Engineering Library index and every EWP.
