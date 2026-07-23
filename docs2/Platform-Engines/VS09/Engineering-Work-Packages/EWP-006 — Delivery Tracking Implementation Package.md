# EWP-006 — Delivery Tracking Implementation Package

| Field | Value |
| :--- | :--- |
| **Work Package ID** | EWP-006 |
| **Title** | Delivery Tracking Implementation Package |
| **Engine** | VS09 – Communication & Notification Engine |
| **Target Capability**| CC-006 — Delivery Tracking |
| **Phase** | Engineering Work Package (Implementation Specification) |
| **Status** | Ready for Implementation |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing Reviews** | AFR-001 (Architecture Freeze), CFR-001 (Contract Freeze) |

---

# 1. Purpose

This Engineering Work Package (**EWP-006**) provides the technical implementation specification for building the **`DeliveryTracking`** aggregate root (`Medium Aggregate`), `TrackingTimeline` Value Object, domain errors, domain events, persistence schema, repository layer, application service, and test suites in the **VS09 Communication & Notification Engine**.

The objective of EWP-006 is to deliver a production-ready, fully tested, ES-001 database-compliant, multi-tenant operational observability aggregate that satisfies all specifications in **Capability Contract CC-006** and governing architectural decision records (**ADR-009-001 through ADR-009-004**).

---

# 2. Inputs & Governing Artifacts

All software engineering work in EWP-006 must adhere strictly to the following governing inputs:

| Artifact ID | Title | Governed Scope |
| :--- | :--- | :--- |
| **AFR-001** | VS09 Architecture Freeze Review | Overall Engine Architecture Freeze |
| **CFR-001** | VS09 Capability Contract Freeze Review | Capability Specification Freeze |
| **CC-006** | Delivery Tracking Capability Contract | Business Contract, Invariants, Commands & Queries |
| **ADR-009-001** | Communication Delivery Model | Operational Telemetry & Distributed Tracing |
| **ADR-009-002** | Channel & Provider Abstraction | Vendor Receipts & Acknowledgement Data Models |
| **ADR-009-003** | Template Resolution & Personalization | Rendering Performance & Latency Telemetry |
| **ADR-009-004** | Queue, Retry & Delivery Tracking | Technology-Agnostic Tracking Ledger |
| **ES-001** | Database & Persistence Governance Standard | Table Schema, Data Types, OCC & Auditing Rules |
| **ES-008** | Asynchronous Integration & Event Messaging | Domain Event Schemas & Messaging Integration |
| **ES-009** | Multi-Tenant Data Isolation Standard | Tenant Context Partitioning & Data Filtering |
| **ES-010** | System Resilience & Fault Tolerance | Error Handling, Validation & OCC Conflict Recovery |
| **ES-013** | Engine Architecture Governance Standard | Engineering Work Package Governance |

---

# 3. Scope Boundary

### In-Scope Implementation:
- **Domain Layer**: `DeliveryTracking` aggregate root (`Medium Aggregate`), `TrackingTimeline` Value Object (append-only immutable event array VO), domain invariants, domain commands, aggregate lifecycle state machine (`TrackingStarted` $\rightarrow$ `TrackingActive` $\rightarrow$ `TrackingCompleted` $\rightarrow$ `Archived`), domain validation rules, and domain event definitions (`TrackingStarted`, `AcknowledgementReceived`, `DeliveryConfirmed`, `TrackingArchived`).
- **Persistence Layer**: Database schema migration (`prisma/schema.prisma`), `delivery_tracking` table definition, indexes, foreign keys, audit timestamps, and OCC version counter.
- **Infrastructure Layer**: `IDeliveryTrackingRepository` interface and `PrismaDeliveryTrackingRepository` implementation with tenant isolation enforcement.
- **Application Layer**: `DeliveryTrackingService` command/query handlers and transaction boundaries.
- **Testing**: Unit tests for domain logic, integration tests for Prisma repositories, application service orchestrations, timeline append tests, correlation tracing tests, and regression suites.

### Out-of-Scope (Handled by Other Infrastructure / Services):
- **Notification Delivery Execution**: Managed by `NotificationDelivery` aggregate in EWP-003.
- **Retry Schedule Processing**: Executed by worker queue loops in EWP-003 / ADR-009-004.
- **Queue Workers & Dispatch Executions**: Executed by background worker threads.
- **Provider Adapters**: Concrete vendor drivers in EWP-005.
- **Template Rendering Pipeline**: Executed by `TemplateResolutionService` in EWP-001.
- **Recipient Resolution Engine**: Executed by `RecipientResolutionService` in EWP-004.
- **Background Health Monitoring Services**: Managed by external monitoring services.

---

# 4. Deliverables & File Mapping

Developers implementing EWP-006 MUST create or update the following source code files:

| Layer | Target File Path | Description |
| :--- | :--- | :--- |
| **Domain Models** | `src/modules/notification/domain/tracking/DeliveryTracking.ts` | Aggregate Root implementation enforcing tracking invariants & commands. |
| **Value Objects** | `src/modules/notification/domain/tracking/value-objects/TrackingTimeline.ts` | Append-only chronological timeline event collection VO. |
| **Domain Errors** | `src/modules/notification/domain/tracking/DeliveryTrackingErrors.ts` | Strongly typed domain exceptions (`ImmutableTimelineException`, etc.). |
| **Domain Events** | `src/modules/notification/domain/tracking/DeliveryTrackingEvents.ts` | Immutable domain event definitions. |
| **Repository Interface**| `src/modules/notification/domain/tracking/IDeliveryTrackingRepository.ts` | Clean repository contract. |
| **Infrastructure Repository**| `src/modules/notification/infrastructure/persistence/PrismaDeliveryTrackingRepository.ts` | Prisma ORM persistence implementation. |
| **Application Service**| `src/modules/notification/application/tracking/DeliveryTrackingService.ts` | Use-case orchestration service. |
| **Persistence Schema**| `prisma/schema.prisma` | Table definition and indexes. |
| **Migration** | `prisma/migrations/20260722_create_delivery_tracking/` | Database migration script. |
| **Domain Unit Tests** | `src/modules/notification/domain/tracking/__tests__/DeliveryTracking.domain.test.ts` | Unit tests for aggregate invariants & commands. |
| **Repository Tests** | `src/modules/notification/infrastructure/persistence/__tests__/DeliveryTrackingRepository.test.ts` | Integration tests for database persistence & OCC. |
| **Service Tests** | `src/modules/notification/application/tracking/__tests__/DeliveryTrackingService.test.ts` | Application service use-case tests. |

---

# 5. Database Specification (ES-001 Compliance)

The database schema for `delivery_tracking` must conform strictly to **ES-001**:

```prisma
model DeliveryTracking {
  id                         String   @id @default(uuid()) @db.Uuid
  notificationId             String   @map("notification_id") @db.Uuid
  tenantId                   String   @map("tenant_id") @db.Uuid
  workspaceId                String?  @map("workspace_id") @db.Uuid
  correlationId              String   @map("correlation_id") @db.Uuid
  providerProfileId          String?  @map("provider_profile_id") @db.Uuid
  trackingStatus             String   @map("tracking_status") @db.VarChar(50)
  providerAcknowledgementId  String?  @map("provider_acknowledgement_id") @db.VarChar(255)
  providerStatus             String?  @map("provider_status") @db.VarChar(100)
  providerTimestamp          DateTime? @map("provider_timestamp") @db.Timestamptz
  deliveryTimestamp          DateTime? @map("delivery_timestamp") @db.Timestamptz
  readTimestamp              DateTime? @map("read_timestamp") @db.Timestamptz
  trackingTimeline           Json     @map("tracking_timeline")
  telemetryMetadata          Json?    @map("telemetry_metadata")
  auditMetadata              Json?    @map("audit_metadata")
  
  // ES-001 Audit & Optimistic Concurrency Columns
  createdAt                  DateTime @default(now()) @map("created_at") @db.Timestamptz
  createdBy                  String   @map("created_by") @db.Uuid
  updatedAt                  DateTime @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy                  String   @map("updated_by") @db.Uuid
  deletedAt                  DateTime? @map("deleted_at") @db.Timestamptz
  version                    Int      @default(1) @map("version")

  @@unique([notificationId], name: "uq_tracking_notification")
  @@index([tenantId], name: "idx_tracking_tenant")
  @@index([correlationId], name: "idx_tracking_correlation")
  @@index([trackingStatus], name: "idx_tracking_status")
  @@index([providerStatus], name: "idx_tracking_provider_status")
  @@map("delivery_tracking")
}
```

### ES-001 Governance Rules:
- Primary key `id` is a UUID.
- Snake_case mapping for database columns (`@map("...")`).
- Unique index `[notificationId]` enforces Business Identity 1-to-1 tracking relationship.
- OCC enforced via `@map("version")` integer column.
- Soft-delete supported via `deletedAt` timestamp column.

---

# 6. Domain Implementation Requirements

Developers implementing `DeliveryTracking.ts` MUST satisfy all domain rules specified in **CC-006**:

### 1. Invariants & Boundary Enforcement:
- **Append-Only Timeline**: Entries in `trackingTimeline` MUST be append-only. Historical timeline entries CANNOT be edited, reordered, or deleted.
- **Unique 1-to-1 Notification Tracking**: Business Identity `notificationId` MUST be unique across all `DeliveryTracking` records. Exactly ONE tracking aggregate exists per `Notification`.
- **Immutable CorrelationId**: `correlationId` is set at tracking initialization and MUST remain strictly **immutable**.
- **Immutable Provider Receipts**: Once recorded, `providerAcknowledgementId` and `providerTimestamp` become strictly **immutable**.
- **Terminal Archival Immutability**: Tracking records in `ARCHIVED` status (terminal state) are permanently immutable.
- **Execution Independence**: Errors during tracking write operations MUST NEVER cause active delivery execution to fail.

### 2. State Machine Implementation:
State transitions MUST follow the 4-stage lifecycle:
- `StartTracking()` $\rightarrow$ State: `TRACKING_STARTED`. Emits `TrackingStarted`.
- `RecordAcknowledgement()` $\rightarrow$ Transition `TRACKING_STARTED` $\rightarrow$ `TRACKING_ACTIVE`. Emits `AcknowledgementReceived`.
- `RecordDeliveryConfirmation()` $\rightarrow$ Transition `TRACKING_ACTIVE` $\rightarrow$ `TRACKING_COMPLETED`. Emits `DeliveryConfirmed`.
- `ArchiveTracking()` $\rightarrow$ Transition `TRACKING_COMPLETED` $\rightarrow$ `ARCHIVED` (terminal). Emits `TrackingArchived`.

---

# 7. Repository Specification

`IDeliveryTrackingRepository.ts` and `PrismaDeliveryTrackingRepository.ts` MUST implement the following methods:

```typescript
export interface IDeliveryTrackingRepository {
  findById(id: string, tenantId: string): Promise<DeliveryTracking | null>;
  findByNotification(notificationId: string, tenantId: string): Promise<DeliveryTracking | null>;
  findByCorrelationId(correlationId: string, tenantId: string): Promise<DeliveryTracking | null>;
  listPendingAcknowledgements(tenantId: string, limit: number): Promise<DeliveryTracking[]>;
  listCompletedTracking(tenantId: string, limit: number): Promise<DeliveryTracking[]>;
  existsTracking(notificationId: string): Promise<boolean>;
  save(tracking: DeliveryTracking): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
```

### Mandatory Infrastructure Behavior:
- **Multi-Tenant Isolation**: ALL queries MUST append `where: { tenantId, deletedAt: null }`.
- **Optimistic Concurrency Control (OCC)**: Saves MUST increment `version` and throw `OptimisticLockException` on concurrency conflict.

---

# 8. Application Service Specification

`DeliveryTrackingService.ts` acts as the use-case orchestrator:

### Handled Commands:
- `StartTracking`: Instantiates `DeliveryTracking` aggregate in `TRACKING_STARTED`.
- `RecordAcknowledgement`: Records vendor receipt and transitions to `TRACKING_ACTIVE`.
- `RecordDeliveryConfirmation`: Records final delivery receipt and transitions to `TRACKING_COMPLETED`.
- `AppendTrackingEvent`: Appends a new chronological event entry to `trackingTimeline`.
- `ArchiveTracking`: Transitions completed record to `ARCHIVED` terminal state.

---

# 9. Testing Specification

Developers MUST achieve **>95% code coverage** across EWP-006 test suites:

### 1. Domain Unit Tests (`DeliveryTracking.domain.test.ts`):
- Test aggregate initialization in `TRACKING_STARTED`.
- Test 4-stage lifecycle state machine transitions.
- Test `TrackingTimeline` append-only immutability rules.
- Test `correlationId` immutability.
- Test terminal `ARCHIVED` state immutability.

### 2. Repository Integration Tests (`DeliveryTrackingRepository.test.ts`):
- Test CRUD operations against real PostgreSQL/Prisma database.
- Test tenant data isolation filtering (`tenantId`).
- Test unique constraint `[notificationId]`.
- Test `listPendingAcknowledgements()` query.
- Test OCC `OptimisticLockException` handling.

### 3. Application Service Tests (`DeliveryTrackingService.test.ts`):
- Test end-to-end command orchestration, event appends, and domain event publishing.

---

# 10. Dependency Verification

| Dependent System | Integration Status | Verification Notes |
| :--- | :--- | :--- |
| **Notification (CC-003)** | **Required** | Parent notification aggregate (`notificationId`). |
| **Tenant Context** | **Required** | Multi-tenant isolation boundary (`tenantId`). |
| **Workspace Boundary** | **Required** | Operational workspace sub-partitioning (`workspaceId`). |
| **CorrelationId Tracing** | **Required** | Platform distributed trace identifier. |
| **Provider Adapters** | *Deferred* | Decoupled; adapters emit telemetry logs consumed by tracking service. |
| **Notification Workers** | *Deferred* | Decoupled; workers emit tracking events upon queue milestones. |
| **Retry Engine** | *Deferred* | Decoupled; retry events appended to tracking timeline. |

---

# 11. Implementation Sequence

Implementation MUST execute in the following 8-step sequence:

```
1. Database Schema Migration ──► 2. Domain Aggregate ──► 3. Value Object ──► 4. Infrastructure Repository
                                                                                      │
8. Final Certification ◄── 7. Verification Audit ◄── 6. Test Suite ◄── 5. Application Service
```

---

# 12. Definition of Done Checklist

Developers MAY NOT mark EWP-006 complete until every item below is verified:

- [ ] Prisma schema updated for `delivery_tracking`; migration script `20260722_create_delivery_tracking` executed cleanly.
- [ ] `DeliveryTracking` aggregate root implemented with complete invariant checks.
- [ ] `TrackingTimeline` Value Object implemented with append-only immutability.
- [ ] 4 domain events (`TrackingStarted`, `AcknowledgementReceived`, `DeliveryConfirmed`, `TrackingArchived`) defined.
- [ ] `PrismaDeliveryTrackingRepository` implemented with `tenantId` isolation and OCC.
- [ ] `DeliveryTrackingService` application service implemented with transaction management.
- [ ] All unit, repository integration, timeline append, and service tests passing with >95% coverage.
- [ ] Zero TypeScript compiler errors, zero ESLint warnings, zero TODO comments.
- [ ] Boundary audit passed: No delivery execution code, worker loop logic, or transport SDKs imported.

---

# 13. Compliance Matrix

| Standard / Contract | Compliance Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **CC-006** | All 6 Invariants & 4-stage lifecycle | Domain Unit Tests | Certified |
| **ES-001** | UUID primary key, snake_case, OCC, audit columns | Schema Audit & Migration | Certified |
| **ES-008** | Immutable Domain Events | Event Schema Test | Certified |
| **ES-009** | Tenant Context Isolation (`tenantId`) | Repository Integration Test | Certified |
| **ES-010** | Strongly typed exceptions & OCC recovery | Repository Test | Certified |
| **ES-013** | EWP File structure & boundaries | Review Audit | Certified |

---

# 14. Expected Runtime Characteristics

| Metric / Aspect | Characteristic | Engineering Guidance |
| :--- | :--- | :--- |
| **Aggregate Size** | **`Medium Aggregate`** | Encapsulates append-only timeline event array and telemetry metadata map. |
| **Expected Reads** | **High** | High-volume lookup throughput by `notificationId` and `correlationId`. |
| **Expected Writes** | **Medium** | Append-only event writes occur at key delivery milestone transitions. |
| **Caching Policy** | **Allowed (Read-Only)**| Read-only caching permitted for administrative query dashboards and reporting. |
| **Partition Candidate** | **Yes** | Schema designed for database table partitioning by `(tenantId, createdAt)`. |
| **Archive Candidate** | **Yes** | Completed tracking records (`ARCHIVED`) eligible for cold storage archival. |

---

# 15. Expected Outputs

Upon completion of EWP-006 execution, the workspace will contain:
1. `src/modules/notification/domain/tracking/DeliveryTracking.ts`
2. `src/modules/notification/domain/tracking/value-objects/TrackingTimeline.ts`
3. `src/modules/notification/domain/tracking/DeliveryTrackingErrors.ts`
4. `src/modules/notification/domain/tracking/DeliveryTrackingEvents.ts`
5. `src/modules/notification/domain/tracking/IDeliveryTrackingRepository.ts`
6. `src/modules/notification/infrastructure/persistence/PrismaDeliveryTrackingRepository.ts`
7. `src/modules/notification/application/tracking/DeliveryTrackingService.ts`
8. `prisma/schema.prisma` and migration files.
9. Complete test suites in `__tests__/` directories.

**Status**: **AUTHORIZED & READY FOR CODE IMPLEMENTATION**.
