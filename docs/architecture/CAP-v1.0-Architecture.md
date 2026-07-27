# CAP Platform — v1.0 Architecture Index

**Document:** CAP-v1.0-Architecture.md  
**Version:** 1.0  
**Status:** Authoritative  
**Date:** 2026-07-15  
**Maintainer:** Platform Architecture (Verity Systems)

> This document is the **single entry point** into the CAP Platform architecture.  
> Every contributor, reviewer, and future milestone should start here.

---

## Table of Contents

1. [Platform Vision](#1-platform-vision)
2. [Core Principles](#2-core-principles)
3. [Technology Stack](#3-technology-stack)
4. [Engineering Standards](#4-engineering-standards)
5. [Platform Engines](#5-platform-engines)
6. [Certification History](#6-certification-history)
7. [Freeze Ledger](#7-freeze-ledger)
8. [Release History](#8-release-history)
9. [Roadmap](#9-roadmap)

---

## 1. Platform Vision

**CAP (Catrack Application Platform)** is a metadata-driven, zero-business-code SaaS platform for enterprise operations management.

CAP enables operators to define entities, views, workflows, documents, notifications, and reports entirely through configuration — without writing business-specific code in the runtime engine.

The platform targets:

- **Multi-tenant SaaS deployment** — full tenant isolation at every layer
- **Domain agnosticism** — the same runtime serves HSE, Catering ERP, HR, Finance, and any future domain
- **Operational extensibility** — new entities, modules, and workflows added through metadata, not code
- **Production determinism** — identical inputs produce identical outputs at every engine layer

---

## 2. Core Principles

These principles govern every engine, every standard, and every milestone decision in CAP.

### 2.1 Metadata First

All business configuration — entities, fields, views, workflows, documents, notifications — is defined as metadata. The runtime reads and executes from metadata. No code changes are required to extend platform behavior.

### 2.2 Zero Business Code

The platform engines contain no business-specific logic. Engines are generic. Business rules, validations, workflow steps, and operations are configured, not coded.

### 2.3 Manifest First

Execution consumes **runtime manifests** only. Designer metadata is published into an immutable runtime manifest before the engine touches it. The engine never reads designer metadata directly at runtime. This guarantees:

- Snapshot consistency during execution
- Version-pinned execution
- Safe designer changes that don't affect running instances

### 2.4 Deterministic Runtime

For identical inputs, the platform produces identical outputs. This applies to:

- Workflow planning and manifest generation
- State graph resolution
- Participant assignment planning
- Action and policy planning
- Execution plan hashing
- Diagnostics serialization

Determinism is a certification requirement, not a quality goal.

### 2.5 Plugin Architecture

Every extensible surface is a registered plugin:

- Participant providers (user, role, group, hierarchy, expression, lookup, custom)
- Action providers (platform, API, document, report, event, notification, custom)
- Policy providers (retry, timeout, compensation, escalation, concurrency, audit, custom)
- Workflow executors (runtime application, deferred, future async)
- Middleware (authorization, validation, business rules, workflow, persistence, notification, audit)

Plugins are composed at a single **composition root** per engine. No static mutable registries.

### 2.6 Layered Architecture

Every engine follows a strict layered model. Dependencies flow in one direction only:

```
UI / API Layer
      ↓
Runtime Application Layer
      ↓
Engine Layer (Workflow, License, Document, Notification, …)
      ↓
Runtime Data Layer
      ↓
Database / Storage
```

No layer accesses layers above it. No circular dependencies.

### 2.7 Immutable Contracts

Public contracts are frozen at milestone boundaries. No breaking changes are permitted after freeze without a new milestone scope. This is enforced through:

- Architecture freeze git tags
- Certification reports that verify no breaking changes
- Contract export audits at every certification prompt

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5 |
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 5 |
| Test runner | Jest 30 |
| Auth | JWT + bcrypt + TOTP (MFA) |
| UI Components | Radix UI + Tailwind CSS |
| Data Grid | AG Grid 36 Enterprise |
| Logging | Pino 10 |
| Deployment | Docker / Replit |

---

## 4. Engineering Standards

Engineering Standards are platform-wide rules that all milestones must comply with before certification.

### ES-001 — Database Standards

**Status:** Approved  
**Effective:** VS05Z  
**Document:** [ES-001-database-standards.md](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/docs/standards/ES-001-database-standards.md)

Rules enforced:

| Rule | Requirement |
|---|---|
| Primary keys | UUID (`gen_random_uuid()`), never integer sequences |
| Foreign keys | UUID references only |
| Tenant isolation | `tenantId UUID` on all tenant-scoped tables |
| Audit columns | `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isDeleted`, `deletedAt`, `deletedBy`, `version` (BigInt) |
| Soft delete | `isDeleted: false` filter on all reads; physical DELETE never used |
| Optimistic concurrency | `version BigInt` incremented on every write |
| Timestamps | UTC only; never local time |
| Naming | `snake_case` tables and columns; no quoted identifiers |
| Record numbers | Separate `recordNumber String` column; never the PK |

### ES-002 — Presentation Standards

**Status:** Pending formal document  
**Scope:** UI component conventions, layout system, form architecture, error display

### ES-003 — Runtime Control Standards

**Status:** Certified through VS07 (behavioral evidence)  
**Scope:** Guardrails, deterministic execution control, runtime boundary enforcement, execution pipeline mediation

### ES-004 — Platform Services

**Status:** Certified through VS07 (behavioral evidence)  
**Scope:** Engine registration, `PlatformRuntime` service registry, engine discovery contracts

### ES-005 — Runtime Manifest

**Status:** Certified through VS07 (behavioral evidence)  
**Scope:** Manifest-first architecture, deterministic manifest generation, runtime manifest consumption contracts

### ES-006 — Database Platform Engine

**Status:** Certified through VS07 (path-level; fault-injection deferred)  
**Scope:** Repository contracts, data engine layering, soft-delete enforcement, query scoping

### ES-007 — Runtime Execution Contracts

**Status:** Certified through VS07 (behavioral evidence)  
**Scope:** `RuntimeOperationResult`, execution pipeline contracts, middleware contracts, frozen operation set

> **Note:** ES-002 through ES-007 are currently certified through behavioral evidence and milestone constraints. Formal standard documents will be published in future milestones. ES-001 is the only fully published standard document at CAP v1.0.

---

## 5. Platform Engines

### CM-001 — Schema Platform Engine

**Milestone:** Pre-VS03 (Foundation)  
**Status:** Implemented  
**Responsibility:** Dynamic schema generation for runtime entity tables from metadata configuration.

- Generates PostgreSQL table DDL from entity/field metadata
- Enforces ES-001 conventions (UUID PKs, audit columns, soft delete) on all generated tables
- Runtime tables follow the same standards as platform tables

### CM-002 — (Reserved)

**Status:** Reserved

### CM-003 — Runtime Data Engine

**Milestone:** VS05 Foundation  
**Status:** Implemented  
**Responsibility:** Low-level record operations against runtime entity tables.

- ProviderFactory / database provider abstraction
- Generic CRUD operations for any runtime entity
- Enforces `isDeleted: false` filtering
- Foundation for RuntimeApplicationEngine

---

### Runtime Application Engine

**Milestone:** VS06 / VS06A  
**Status:** Implemented and frozen  
**Standard:** [VS06A-runtime-application-engine.md](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/docs/standards/VS06A-runtime-application-engine.md)

**Responsibility:** Orchestration layer above CM-003 for all record lifecycle operations.

**Key components:**

| Component | Role |
|---|---|
| `IRuntimeApplicationEngine` | Top-level runtime entry point |
| `RuntimeOperationPipeline` | Middleware execution chain |
| `RuntimeContext` | Immutable per-request context |
| `RuntimeOperationResult` | Standard result model for all operations |
| `IRuntimeEventPublisher` | Synchronous/async event publishing |
| `PlatformRuntime` | Engine service registry |

**Frozen operation set:** Create, Load, Save, Delete, Restore, Duplicate, Archive, Submit, Approve, Reject, Cancel, Close, Print, Export, Import

**Middleware chain:** Load Metadata → Authorization → Validation → Business Rules → Workflow → Load Record → Before Event → Persistence → Notification → Audit → After Event

**RuntimeContext fields (27):** requestId, tenantId, tenant, organizationId, organization, moduleId, module, entityId, entity, entityDefinition, viewDefinition, layoutDefinition, userId, currentUser, roles, permissions, operation, recordId, correlationId, transaction, transactionId, executionMode, triggerSource, workflowState, currentRecord, currentValues, originalValues, culture, timezone, timestamp

---

### Workflow Engine

**Milestone:** VS07  
**Status:** Implemented and certified  
**Freeze tag:** `cap-vs07-p006e-freeze`  
**Architecture guide:** [VS07-workflow-architecture-guide.md](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/docs/standards/VS07-workflow-architecture-guide.md)  
**Milestone index:** [VS07.md](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/docs/releases/VS07.md)

**Responsibility:** Deterministic, metadata-driven workflow execution for any runtime entity.

**Layered architecture:**

```
Workflow Metadata (designer)
        ↓
Publish Pipeline (validate → normalize → optimize → manifest)
        ↓
Runtime Manifest (immutable, version-pinned)
        ↓
Runtime Graph (state machine, transition graph)
        ↓
Planning Layer (participants, assignments, actions, policies)
        ↓
Execution Runtime (orchestrator, pipeline, dispatch, adapter)
        ↓
Diagnostics & Observability
```

**Composition root:** `createWorkflowFoundation()` in `src/modules/platform/workflow/runtime/WorkflowFoundation.ts`

**Key engine components:**

| Component | Role |
|---|---|
| `WorkflowEngine` | Top-level workflow engine entry point |
| `WorkflowPublisher` | Publish pipeline — validate, normalize, optimize, persist |
| `WorkflowManifestGenerator` | Generates deterministic runtime manifests |
| `StateMachineEngine` | State resolution and graph management |
| `TransitionEngine` | Transition eligibility and resolution |
| `ParticipantRegistry` | Plugin-based participant provider registry |
| `ParticipantResolutionEngine` | Deterministic participant resolution |
| `AssignmentPlanner` | Assignment strategy evaluation |
| `WorkflowActionEngine` | Action planning (planning-only, no execution) |
| `WorkflowPolicyEngine` | Policy planning (retry, timeout, compensation, …) |
| `RuntimeEffectPlanner` | Effect graph and ordered execution plan |
| `WorkflowExecutionOrchestrator` | Execution coordination |
| `ExecutionPipeline` | Stage-mediated execution |
| `RuntimeApplicationExecutor` | Runtime boundary adapter |
| `ExecutionDiagnosticsCollector` | Observability collection (passive) |

**Certified public contracts:** 89 named exports in `src/modules/platform/workflow/contracts/index.ts`

**Certification result:** PASS — 5 suites, 28 tests (combined run, 2026-07-15)

---

### License Engine

**Milestone:** VS08 (planned)  
**Status:** Not started  
**Responsibility:** License validation, tenant entitlement enforcement, feature flag gating.

---

### Notification Engine

**Milestone:** VS09 (planned)  
**Status:** Not started  
**Responsibility:** Email, SMS, in-app, and webhook notification delivery with template rendering and delivery tracking.

---

### Document Engine

**Milestone:** VS10 (planned)  
**Status:** Not started  
**Responsibility:** Document generation (PDF, Word, Excel) from templates and runtime data.

---

### Reporting Engine

**Milestone:** Future  
**Status:** Not started  
**Responsibility:** Parameterized report generation, scheduled reports, and report delivery.

---

### Import / Export Engine

**Milestone:** Future  
**Status:** Not started  
**Responsibility:** Bulk data import and export for runtime entity data.

---

### AI / Intelligence Engine

**Milestone:** Future  
**Status:** Not started  
**Responsibility:** AI-assisted field completion, anomaly detection, and decision support.

---

## 6. Certification History

### VS03 — Entity and Field Configuration

**Status:** Certified (bundled in CAP Foundation 1.0)  
**Commit:** `b4bba64` — "VS03, VS04, and VS05A are now part of CAP Foundation 1.0"

Delivered:
- Entity metadata model
- Field type system
- Field-level configuration

### VS04 — Views and Layouts

**Status:** Certified (bundled in CAP Foundation 1.0)  
**Commit:** `b4bba64`

Delivered:
- View metadata model
- Layout configuration
- Navigation integration

### VS05 — Runtime Data Engine

**Status:** Certified (CAP Foundation 1.0)  
**Includes:** VS05Z — database standards effective date (ES-001)

Delivered:
- CM-003 Runtime Data Engine
- ProviderFactory abstraction
- Generic CRUD operations
- ES-001 UUID and audit column enforcement
- `2497e46` — "CAP Platform v1.0 release milestone"
- `3b17de3` — "UUID type standard for all Id fields"

### VS06 — Runtime Application Engine

**Status:** Certified  
**Freeze commit:** `1656ff4` — `cap-vs06a-freeze`

Key certifications:
- `RuntimeApplicationEngine` lifecycle pipeline
- Middleware-based execution model (VS06A-R refinement)
- `RuntimeContext` (27-field immutable context)
- `RuntimeOperationResult` standard result model
- `IRuntimeEventPublisher` contract freeze
- Frozen operation set (15 operations)
- `PlatformRuntime` service registry

### VS07 — Workflow Engine

**Status:** Certified — Final (Prompt 006E)  
**Freeze tag:** `cap-vs07-p006e-freeze` (commit `9d3ab5c`)  
**Certification report:** [VS07-prompt-006e-final-certification-report.md](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/docs/releases/VS07-prompt-006e-final-certification-report.md)  
**Capability matrix:** [VS07-workflow-capability-matrix.md](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/docs/releases/VS07-workflow-capability-matrix.md)

Prompts certified:

| Prompt | Scope | Status |
|---|---|---|
| 001 | Workflow Foundation — metadata, publish, manifest | Certified |
| 002 | State Machine and Transition Engine | Certified |
| 003 | Participant Resolution and Assignment | Certified |
| 004 | Action Framework, Policy Framework, Effect Planning | Certified |
| 005A | Execution Foundation | Certified |
| 005B | Runtime Adapter and Mapping | Certified |
| 005C | Diagnostics and Observability | Certified |
| 005D | Execution Certification and Production Readiness | Certified |
| 006A | Metadata and Publish Pipeline Certification | Certified |
| 006B | State Machine and Runtime Graph Certification | Certified |
| 006C | Participant, Assignment, and Action Certification | Certified |
| 006D | End-to-End Integration Certification | Certified |
| 006E | Workflow Engine Final Certification | **Certified — GO** |

Final regression: **5 suites · 28 tests · 0 failures**

---

## 7. Freeze Ledger

This section is the master record of all architecture freeze tags across the platform.

### VS06 Freeze Tags

| Tag | Commit | Description |
|---|---|---|
| `cap-vs06a-freeze` | `1656ff4` | Runtime Application Engine — middleware, pipeline, context, event system |

### VS07 Freeze Tags

| Tag | Commit | Description |
|---|---|---|
| `cap-vs07-p004-freeze` | (pre-005) | Action, policy, and effect planning contracts frozen |
| `cap-vs07-p005-freeze` | `d959f4c` | Execution runtime certification |
| `cap-vs07-p006a-freeze` | `6fe4ebe` | Metadata and publish pipeline certification |
| `cap-vs07-p006b-freeze` | `aeb55ae` | State machine and runtime graph certification |
| `cap-vs07-p006c-freeze` | `41f2787` | Planning layer certification |
| `cap-vs07-p006d-freeze` | `2a21f92` | End-to-end integration certification |
| `cap-vs07-p006e-freeze` | `9d3ab5c` | **Final certification — VS07 milestone closed** |

### Verification Commands

```powershell
# Verify a freeze tag
git show --no-patch --oneline cap-vs07-p006e-freeze

# Count commits in a range
git rev-list --count 'cap-vs07-p006d-freeze^{}..cap-vs07-p006e-freeze^{}'

# List all platform freeze tags
git tag --list "cap-*" | Sort-Object
```

---

## 8. Release History

| Release | Date | Milestone | Summary |
|---|---|---|---|
| CAP Foundation 1.0 | 2026-07 | VS03 + VS04 + VS05 | Entity config, views, layouts, runtime data engine |
| CAP Foundation 1.1 | 2026-07 | VS06 | Runtime Application Engine — lifecycle pipeline, middleware, operations |
| CAP Platform v1.0 (pre-release) | 2026-07 | VS07 | Workflow Engine — deterministic metadata-driven workflow execution |

### CAP v1.0 Platform Service Inventory (current)

| Engine | Status |
|---|---|
| Schema Platform Engine (CM-001) | ✅ Implemented |
| Runtime Data Engine (CM-003) | ✅ Implemented |
| Runtime Application Engine | ✅ Certified (VS06) |
| Workflow Engine | ✅ Certified (VS07) |
| License Engine | 🔜 VS08 |
| Notification Engine | 🔜 VS09 |
| Document Engine | 🔜 VS10 |
| Reporting Engine | 📋 Future |
| Import/Export Engine | 📋 Future |
| AI Engine | 📋 Future |

---

## 9. Roadmap

### Immediate — VS08: License and Tenant Management Engine

**Priority:** High  
**Prerequisites:** VS07 complete ✅

Planned scope:

- License model and entitlement definition
- Tenant license assignment and validation
- Feature flag and module gating
- License expiry enforcement
- Multi-tier license support (free, professional, enterprise)
- Integration with `RuntimeContext` (license enforcement in middleware)

### Near-term — VS09: Notification Engine

**Priority:** High

Planned scope:

- Email delivery (SMTP / SendGrid)
- In-app notification center
- SMS delivery
- Webhook delivery
- Notification template engine (metadata-driven)
- Delivery tracking and retry
- Notification history

### Near-term — VS10: Document Engine

**Priority:** High

Planned scope:

- PDF generation from metadata templates
- Word / Excel generation
- Template designer (metadata)
- Record-data merge at generation time
- Document storage integration
- Audit-stamped document artifacts

### Standards Backlog

| Standard | Scope | Target Milestone |
|---|---|---|
| ES-002 Presentation Standards | UI conventions, forms, layout | VS08 |
| ES-003 Runtime Control Standards | Formal document | VS08 |
| ES-004 Platform Services | Formal document | VS08 |
| ES-005 Runtime Manifest | Formal document | VS08 |
| ES-006 Database Platform Engine | Formal document | VS08 |
| ES-007 Runtime Execution Contracts | Formal document | VS08 |
| ES-010 | TBD (deferred from VS07) | Before VS08 start |

### Technical Debt (Deferred from VS07)

| Item | Priority |
|---|---|
| Remove `tests` from root workflow barrel export | Low — future major version |
| Live-database fault-injection certification lanes | Medium — before GA |
| Long-run heap-forensics certification | Low — operational |
| Expand explicit ES-002–ES-007 standard documents | Medium — VS08 |

---

## Document Conventions

- All milestone documents live under `docs/releases/` (reports) and `docs/standards/` (architecture references)
- Certification reports follow the naming pattern: `VS{milestone}-prompt-{prompt}-certification-report.md`
- Freeze tags follow the pattern: `cap-vs{milestone}-p{prompt}-freeze`
- This document (`CAP-v1.0-Architecture.md`) is the root; every other document is subordinate to it

---

*Last updated: 2026-07-15 after VS07 final certification (Prompt 006E).*  
*Next update: After VS08 milestone opens.*
