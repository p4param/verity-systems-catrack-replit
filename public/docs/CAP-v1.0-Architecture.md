# CAP v1.0 Architecture

**Status:** Master architectural index  
**Version:** 1.0  
**Last reviewed:** 2026-07-15  
**Scope:** CAP Platform architecture, engine boundaries, certification, freezes, and roadmap.

This is the entry point for CAP v1.0 architecture. It records the platform rules that every engine must preserve and links to the milestone-specific evidence. It is an index, not a replacement for detailed engine specifications or certification reports.

## 1. Platform Vision

CAP is a reusable, metadata-driven application platform. It turns validated configuration into immutable runtime manifests and executes those manifests through deterministic platform services. Domain applications supply metadata, data, and approved extensions; they do not embed business-specific workflow, persistence, or UI behavior in the platform core.

The target outcome is a composable platform in which a capability can be designed, published, executed, observed, and certified through stable contracts.

## 2. Core Principles

| Principle | Architectural rule |
| --- | --- |
| Metadata First | Configuration is the source of truth; publish transforms validated metadata into versioned runtime artifacts. |
| Zero Business Code | Core engines contain generic platform behavior only. Business-specific rules belong in metadata or approved providers/extensions. |
| Manifest First | Runtime paths consume published manifests/runtime models, never mutable designer metadata. |
| Deterministic Runtime | Identical inputs and manifest versions produce stable plans, ordering, hashes, and serialized artifacts. |
| Plugin Architecture | Providers, executors, controls, actions, policies, participants, and integrations are resolved through contracts and registries. |
| Explicit Boundaries | Cross-engine work happens through public contracts, adapters, or events; internal implementation details are not dependencies. |
| Tenant and Audit Safety | Tenant context, actor identity, audit data, and authorization are explicit runtime concerns. |

## 3. Engineering Standards

| Standard | Scope | Current evidence |
| --- | --- | --- |
| ES-001 | Database standards: UUID identity, audit conventions, tenancy, migrations | [ES-001 Database Standards](docs/standards/ES-001-database-standards.md) |
| ES-002 | Presentation standards | Referenced by engine certification; a standalone approved artifact is still a roadmap item. |
| ES-003 | Runtime control standards | Certified through runtime/workflow boundary and guardrail evidence. |
| ES-004 | Platform services standards | Certified through reusable platform-service composition. |
| ES-005 | Runtime manifest standards | Manifest-first architecture and deterministic generation are certified in VS07. |
| ES-006 | Database platform engine standards | Certified at repository/path level; deep database fault injection remains deferred. |
| ES-007 | Runtime execution contracts | Execution contracts, pipeline boundaries, and adapters are certified in VS07. |

All new engines must identify their applicable standards, preserve public contracts, and produce milestone-specific evidence before certification.

## 4. Platform Engines

| Engine / capability | Responsibility | Current location or evidence | Status |
| --- | --- | --- | --- |
| CM-001 Configuration Platform | Metadata design, validation, publishing inputs, and platform configuration | `src/modules/platform/configuration` | Active platform foundation |
| CM-002 Schema Platform | Logical schema, migration planning, and physical schema synchronization | `src/modules/platform/configuration/services/SchemaPlatformEngine.ts` | Active platform foundation |
| CM-003 Runtime Data Engine | Provider-routed record persistence, queries, events, and runtime records | `src/modules/platform/persistence` | Active platform foundation |
| Runtime Application Engine | Record lifecycle operation pipeline, immutable runtime context, middleware, and operation results | [VS06A Runtime Application Engine](docs/standards/VS06A-runtime-application-engine.md) | Frozen baseline |
| Workflow Engine | Metadata-to-manifest workflow planning, execution orchestration, diagnostics, and integration | `src/modules/platform/workflow` | VS07 certified |
| License & Tenant Management Engine | Licensing, entitlement, and tenant-management policy | VS08 roadmap | Planned |
| Notification Engine | Notification routing and delivery providers | `src/modules/platform/notification` | Existing capability; dedicated certification pending |
| Document Engine | Document generation, storage, and lifecycle | `src/modules/platform/document`, `file-storage` | Existing capability; dedicated certification pending |
| Supporting services | Authentication, authorization, audit, search, scheduler, reporting, import/export, number series | `src/modules/platform/*` | Platform services; certify per milestone |

## 5. Certification History

| Milestone | Scope | Certification status | Evidence |
| --- | --- | --- | --- |
| VS03 | Historical platform milestone | Historical; consolidated release evidence is not present in `docs/` | Preserve prior release records when imported. |
| VS04 | Historical platform milestone | Historical; consolidated release evidence is not present in `docs/` | Preserve prior release records when imported. |
| VS05 | Database/runtime platform evolution | Baseline referenced by current standards and certification suites | [ES-001](docs/standards/ES-001-database-standards.md) |
| VS06 | Runtime Application Engine | Frozen baseline | [VS06A architecture](docs/standards/VS06A-runtime-application-engine.md) |
| VS07 | Workflow Engine | Final certification complete; freeze tag pending | [VS07 summary](docs/releases/VS07.md), [final report](docs/releases/VS07-prompt-006e-final-certification-report.md) |

## 6. Freeze Ledger

Freeze records are immutable architecture checkpoints. A freeze requires: passing regression evidence, a reviewed certification report, an explicit tag, and a documented compatibility posture.

| Freeze stream | Latest recorded state | Source |
| --- | --- | --- |
| VS07 Workflow | Prompts 005 through 006D tagged; 006E tag pending after final review | [VS07 Freeze Ledger](docs/releases/VS07-freeze-ledger.md) |
| Platform-wide | This document is the index; milestone ledgers remain authoritative for individual tags | Milestone release documentation |

Do not infer a tag from a release recommendation. A tag is only frozen when it exists in source control and is recorded in the relevant ledger.

## 7. Release History

| Release | Outcome | Release record |
| --- | --- | --- |
| VS06A | Runtime Application Engine baseline and public lifecycle contracts | [VS06A architecture](docs/standards/VS06A-runtime-application-engine.md) |
| VS07 | Workflow Engine certified for CAP v1.0; release recommendation is GO, subject to the final freeze tag | [VS07 release notes](docs/releases/VS07-workflow-release-notes.md) |

## 8. Roadmap

1. **VS08 — License & Tenant Management Engine:** establish licensing, entitlement, and tenant-management contracts without weakening manifest-first or tenant-isolation rules.
2. **Standards completion:** publish explicit approved artifacts for ES-002 through ES-007 where evidence currently exists only in milestone documentation.
3. **Operational certification:** add live-database fault injection, long-running heap analysis, and sustained production-like load lanes.
4. **API tightening:** reduce non-runtime exports from root barrels in a compatible future major version.
5. **Engine certifications:** certify existing document, notification, and supporting services with their own architecture, evidence, and freeze ledgers.

## How to Use This Index

- Start here when proposing a new engine or cross-engine integration.
- Read the applicable standard and the target engine's architecture guide before editing code.
- Treat milestone certification reports and freeze ledgers as the evidence of record.
- Update this index only when a platform-level engine, standard, certification, freeze, release, or roadmap decision changes.
