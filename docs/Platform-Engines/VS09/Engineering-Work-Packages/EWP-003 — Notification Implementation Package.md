# EWP-003 — Notification Implementation Package

| Field | Value |
| :--- | :--- |
| **Work Package ID** | EWP-003 |
| **Title** | Notification Delivery Ledger Implementation Package |
| **Engine** | VS09 – Communication & Notification Engine |
| **Target Capability**| CC-003 — Notification |
| **Phase** | Engineering Work Package (Implementation Specification) |
| **Status** | Ready for Implementation |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing Reviews** | AFR-001 (Architecture Freeze), CFR-001 (Contract Freeze) |

---

# 1. Purpose

This Engineering Work Package (**EWP-003**) provides the technical implementation specification for building the **`NotificationDelivery`** aggregate root (`Large Aggregate`), `RenderedContent` Value Object, `DeliveryAttempt` internal entity, domain errors, domain events, persistence schema, repository layer, application service, and test suites in the **VS09 Communication & Notification Engine**.

The objective of EWP-003 is to deliver a production-ready, fully tested, ES-001 database-compliant, multi-tenant delivery ledger aggregate that satisfies all specifications in **Capability Contract CC-003** and governing architectural decision records (**ADR-009-001 through ADR-009-004**).

---

# 2. Inputs & Governing Artifacts

All software engineering work in EWP-003 must adhere strictly to the following governing inputs:

| Artifact ID | Title | Governed Scope |
| :--- | :--- | :--- |
| **AFR-001** | VS09 Architecture Freeze Review | Overall Engine Architecture Freeze |
| **CFR-001** | VS09 Capability Contract Freeze Review | Capability Specification Freeze |
| **CC-003** | Notification Delivery Capability Contract | Business Contract, Invariants, Commands & Queries |
| **ADR-009-001** | Communication Delivery Model | Ingestion State Machine & Business Transaction Isolation |
| **ADR-009-002** | Channel & Provider Abstraction | Abstract Channel & Provider Routing Contracts |
| **ADR-009-003** | Template Resolution & Personalization | RenderedContent Point-in-Time Snapshot Specification |
| **ADR-009-004** | Queue, Retry & Delivery Tracking | Exponential Backoff, DLQ Isolation & Tracing |
| **ES-001** | Database & Persistence Governance Standard | Table Schema, Data Types, OCC & Auditing Rules |
| **ES-008** | Asynchronous Integration & Event Messaging | Domain Event Schemas & Messaging Integration |
| **ES-009** | Multi-Tenant Data Isolation Standard | Tenant Context Partitioning & Data Filtering |
| **ES-010** | System Resilience & Fault Tolerance | Error Handling, Validation & OCC Conflict Recovery |
| **ES-013** | Engine Architecture Governance Standard | Engineering Work Package Governance |

---

# 3. Scope Boundary

### In-Scope Implementation:
- **Domain Layer**:
  - `Notification` / `NotificationDelivery` Aggregate Root (`Large Aggregate`).
  - `RenderedContent` Value Object (immutable point-in-time snapshot).
  - `DeliveryAttempt` Internal Entity (append-only attempt execution log; strictly owned by root).
  - Provider-independent 10-state lifecycle state machine (`QUEUED`, `PROCESSING`, `RENDERED`, `DISPATCHED`, `PROVIDER_ACCEPTED`, `DELIVERED`, `SUPPRESSED`, `FAILED`, `DEAD_LETTER`).
  - Domain commands, business invariants, idempotency verification, and domain event definitions (`NotificationIngested`, `NotificationRendered`, `NotificationDispatched`, `NotificationAcceptedByProvider`, `NotificationDelivered`, `NotificationDeliveryFailed`, `NotificationRetryScheduled`, `NotificationMovedToDeadLetter`, `NotificationDeadLetterReplayed`).
- **Persistence Layer**: Database schema migration (`prisma/schema.prisma`), `notification_deliveries` table definition, `delivery_attempts` child table definition, indexes, foreign keys, audit timestamps, and OCC version counter.
- **Infrastructure Layer**: `INotificationRepository` interface and `PrismaNotificationRepository` implementation with tenant isolation enforcement.
- **Application Layer**: `NotificationService` use-case command/query handlers and transaction boundaries.
- **Testing**: Unit tests for domain logic, repository integration tests, application service orchestrations, state machine tests, idempotency tests, and regression suites.

### Out-of-Scope (Handled by Other EWPs / Infrastructure):
- **Background Queue Workers & Brokers**: Physical RabbitMQ / Kafka / ServiceBus listeners (ADR-009-004).
- **Concrete Provider Transport Adapters**: SendGrid, Twilio, Firebase network code in EWP-005 (ADR-009-002).
- **Retry Worker Loop Orchestration**: Background scheduled worker threads (ADR-009-004).
- **Template Rendering Pipeline Execution**: Executed by `TemplateResolutionService` in EWP-001 (ADR-009-003).
- **Recipient Resolution Engine**: Executed by `RecipientResolutionService` in EWP-004.
- **Channel Selection Routing Logic**: Executed by `ChannelRoutingService` in EWP-002 / EWP-005.
- **Delivery Tracking Observability**: Managed by `DeliveryTracking` aggregate in EWP-006.

---

# 4. Deliverables & File Mapping

Developers implementing EWP-003 MUST create or update the following source code files:

| Layer | Target File Path | Description |
| :--- | :--- | :--- |
| **Domain Models** | `src/modules/notification/domain/notifications/Notification.ts` | Aggregate Root implementation enforcing 10-state lifecycle and commands. |
| **Domain Entities**| `src/modules/notification/domain/notifications/entities/DeliveryAttempt.ts` | Internal attempt entity owned by root (no standalone repository). |
| **Value Objects** | `src/modules/notification/domain/notifications/value-objects/RenderedContent.ts` | Point-in-time rendered subject/body snapshot VO. |
| **Domain Errors** | `src/modules/notification/domain/notifications/NotificationErrors.ts` | Strongly typed domain exceptions (`DuplicateIdempotencyException`, etc.). |
| **Domain Events** | `src/modules/notification/domain/notifications/NotificationEvents.ts` | Immutable domain event definitions. |
| **Repository Interface**| `src/modules/notification/domain/notifications/INotificationRepository.ts` | Clean repository contract. |
| **Infrastructure Repository**| `src/modules/notification/infrastructure/persistence/PrismaNotificationRepository.ts` | Prisma ORM persistence implementation. |
| **Application Service**| `src/modules/notification/application/notifications/NotificationService.ts` | Use-case orchestration service. |
| **Persistence Schema**| `prisma/schema.prisma` | Table definition and indexes. |
| **Migration** | `prisma/migrations/20260722_create_notification_deliveries/` | Database migration script. |
| **Domain Unit Tests** | `src/modules/notification/domain/notifications/__tests__/Notification.domain.test.ts` | Unit tests for state machine, invariants & VO immutability. |
| **Repository Tests** | `src/modules/notification/infrastructure/persistence/__tests__/NotificationRepository.test.ts` | Integration tests for database persistence & OCC. |
| **Service Tests** | `src/modules/notification/application/notifications/__tests__/NotificationService.test.ts` | Application service use-case tests. |

---

# 5. Database Specification (ES-001 Compliance)

The database schema for `notification_deliveries` and `delivery_attempts` must conform strictly to **ES-001**:

```prisma
model NotificationDelivery {
  id                    String   @id @default(uuid()) @db.Uuid
  tenantId               String   @map("tenant_id") @db.Uuid
  workspaceId            String?  @map("workspace_id") @db.Uuid
  notificationIntentId   String   @map("notification_intent_id") @db.Uuid
  correlationId          String   @map("correlation_id") @db.Uuid
  idempotencyKey         String   @map("idempotency_key") @db.VarChar(255)
  templateId             String   @map("template_id") @db.Uuid
  templateVersion        String   @map("template_version") @db.VarChar(50)
  channelId              String   @map("channel_id") @db.Uuid
  providerId             String?  @map("provider_id") @db.Uuid
  recipientUserId        String?  @map("recipient_user_id") @db.Uuid
  recipientEndpoint      String   @map("recipient_endpoint") @db.VarChar(500)
  deliveryStatus         String   @map("delivery_status") @db.VarChar(50)
  retryCount             Int      @default(0) @map("retry_count")
  maxRetries             Int      @default(3) @map("max_retries")
  nextAttemptAt          DateTime? @map("next_attempt_at") @db.Timestamptz
  renderedSubject        String?  @map("rendered_subject") @db.VarChar(1000)
  renderedBody           String?  @map("rendered_body") @db.Text
  failureReason          String?  @map("failure_reason") @db.VarChar(2000)
  dispatchedAt           DateTime? @map("dispatched_at") @db.Timestamptz
  acceptedAt             DateTime? @map("accepted_at") @db.Timestamptz
  deliveredAt            DateTime? @map("delivered_at") @db.Timestamptz
  
  // ES-001 Audit & Optimistic Concurrency Columns
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  createdBy              String   @map("created_by") @db.Uuid
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy              String   @map("updated_by") @db.Uuid
  deletedAt              DateTime? @map("deleted_at") @db.Timestamptz
  version                Int      @default(1) @map("version")

  // Child Relationship
  attempts               DeliveryAttemptRecord[]

  @@unique([tenantId, idempotencyKey], name: "uq_delivery_tenant_idempotency")
  @@index([tenantId], name: "idx_delivery_tenant")
  @@index([notificationIntentId], name: "idx_delivery_intent")
  @@index([correlationId], name: "idx_delivery_correlation")
  @@index([tenantId, deliveryStatus], name: "idx_delivery_tenant_status")
  @@index([nextAttemptAt], name: "idx_delivery_next_attempt")
  @@map("notification_deliveries")
}

model DeliveryAttemptRecord {
  id                   String   @id @default(uuid()) @db.Uuid
  deliveryId           String   @map("delivery_id") @db.Uuid
  attemptNumber        Int      @map("attempt_number")
  providerId           String?  @map("provider_id") @db.Uuid
  status               String   @map("status") @db.VarChar(50)
  responseCode         String?  @map("response_code") @db.VarChar(100)
  errorDetails         String?  @map("error_details") @db.VarChar(2000)
  attemptedAt          DateTime @default(now()) @map("attempted_at") @db.Timestamptz
  completedAt          DateTime? @map("completed_at") @db.Timestamptz

  delivery             NotificationDelivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)

  @@index([deliveryId], name: "idx_attempt_delivery")
  @@map("notification_delivery_attempts")
}
```

---

# 6. Domain Implementation Requirements

Developers implementing `Notification.ts` MUST satisfy all domain rules specified in **CC-003**:

### 1. Invariants & Boundary Enforcement:
- **Idempotency Rule**: Business Identity `(tenantId, idempotencyKey)` MUST be strictly unique.
- **RenderedContent Immutability**: Once state reaches `RENDERED`, the `RenderedContent` snapshot MUST become permanently immutable. Template/branding updates SHALL NEVER alter historical rendered snapshots.
- **DeliveryAttempt Ownership**: `DeliveryAttempt` is an internal entity owned 100% by the aggregate root. It MUST NOT have an independent repository. Typical collection size ranges from **1–10 attempts** (rarely exceeding 20).
- **NotificationIntent Reference**: Referenced **by identity reference only** (`notificationIntentId`). `Notification` MUST NEVER mutate `NotificationIntent`.
- **CorrelationId Immutability**: `correlationId` remains strictly constant across all retries, attempt logs, and audit entries.

### 2. 10-State Delivery Lifecycle Machine:
State transitions MUST strictly adhere to the 10-state machine:
- `QUEUED` $\rightarrow$ Ingested intent awaiting worker pickup.
- `PROCESSING` $\rightarrow$ Under worker lease lock.
- `RENDERED` $\rightarrow$ Template resolution completed; snapshot saved.
- `DISPATCHED` $\rightarrow$ Handed to Provider Adapter.
- `PROVIDER_ACCEPTED` $\rightarrow$ Vendor accepted message.
- `DELIVERED` $\rightarrow$ Terminal success receipt logged.
- `SUPPRESSED` $\rightarrow$ Opt-out or policy suppression triggered (terminal).
- `FAILED` $\rightarrow$ Transient failure; pending retry attempt.
- `DEAD_LETTER` $\rightarrow$ Permanent Poison Message isolated in DLQ (terminal).

---

# 7. Repository Specification

`INotificationRepository.ts` and `PrismaNotificationRepository.ts` MUST implement the following methods:

```typescript
export interface INotificationRepository {
  findById(id: string, tenantId: string): Promise<NotificationDelivery | null>;
  findByIntentId(notificationIntentId: string, tenantId: string): Promise<NotificationDelivery | null>;
  findByCorrelationId(correlationId: string, tenantId: string): Promise<NotificationDelivery[]>;
  findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<NotificationDelivery | null>;
  listPendingRetries(nowTimestamp: Date, limit: number): Promise<NotificationDelivery[]>;
  listDeadLetters(tenantId: string, limit: number): Promise<NotificationDelivery[]>;
  existsIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<boolean>;
  save(delivery: NotificationDelivery): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
```

### Mandatory Infrastructure Behavior:
- **Multi-Tenant Isolation**: ALL queries MUST append `where: { tenantId, deletedAt: null }`.
- **Atomic Aggregate Persistence**: `save()` MUST persist the root aggregate and its child `attempts` array atomically within a single database transaction.
- **Optimistic Concurrency Control (OCC)**: Saves MUST increment `version` and throw `OptimisticLockException` on concurrency conflict.

---

# 8. Application Service Specification

`NotificationService.ts` acts as the use-case orchestrator:

### Handled Operations:
- `IngestNotificationIntent`: Validates idempotency key and initializes delivery in `QUEUED`.
- `MarkProcessing`: Claims worker lease lock.
- `RecordRenderedContent`: Stores `RenderedContent` VO snapshot.
- `DispatchToProvider`: Binds `providerId` and transitions to `DISPATCHED`.
- `RecordProviderAcceptance`: Updates provider receipt status.
- `RecordDeliverySuccess`: Marks terminal `DELIVERED` status.
- `RecordDeliveryFailure`: Evaluates transient vs. permanent error; appends `DeliveryAttempt`.
- `ScheduleRetry`: Calculates exponential backoff timestamp (`nextAttemptAt`).
- `MoveToDeadLetter`: Isolates Poison Messages in `DEAD_LETTER`.
- `ReplayDeadLetter`: Resets `DEAD_LETTER` record back to `QUEUED` for manual replay.

---

# 9. Testing Specification

Developers MUST achieve **>95% code coverage** across EWP-003 test suites:

### 1. Domain & State Machine Tests (`Notification.domain.test.ts`):
- Test initialization in `QUEUED` with constant `correlationId`.
- Test 10-state machine transition rules.
- Test `RenderedContent` point-in-time snapshot immutability.
- Test monotonic retry counter increments and exponential backoff calculations.
- Test terminal state immutability (`DELIVERED`, `SUPPRESSED`, `DEAD_LETTER`).

### 2. Repository Integration Tests (`NotificationRepository.test.ts`):
- Test composite unique constraint `[tenantId, idempotencyKey]`.
- Test atomic aggregate + `DeliveryAttempt` cascade persistence.
- Test `listPendingRetries()` index query.
- Test `listDeadLetters()` query.
- Test OCC `OptimisticLockException` handling.

### 3. Application Service Tests (`NotificationService.test.ts`):
- Test end-to-end command orchestration and domain event publishing.

---

# 10. Dependency Verification

| Dependent System | Integration Status | Verification Notes |
| :--- | :--- | :--- |
| **Notification Template (CC-001)**| **Required** | Referenced by `templateId` and `templateVersion`. |
| **Notification Channel (CC-002)** | **Required** | Referenced by `channelId`. |
| **Tenant Context** | **Required** | Multi-tenant isolation boundary (`tenantId`). |
| **Workspace Boundary** | **Required** | Operational workspace sub-partitioning (`workspaceId`). |
| **Metadata Engine** | **Required** | Operational configuration parameters. |
| **Notification Recipient (CC-004)**| *Deferred* | Decoupled; resolved recipients managed in EWP-004. |
| **Provider Profile (CC-005)** | *Deferred* | Decoupled; bound `providerId` set during selection in EWP-005. |
| **Delivery Tracking (CC-006)** | *Deferred* | Decoupled; tracking observes telemetry events in EWP-006. |
| **Queue Worker Infrastructure** | *Deferred* | Background worker queue loops isolated in infrastructure. |

---

# 11. Definition of Done Checklist

Developers MAY NOT mark EWP-003 complete until every item below is verified:

- [ ] Prisma schema updated for `notification_deliveries` and `notification_delivery_attempts`; migration script `20260722_create_notification_deliveries` executed cleanly.
- [ ] `Notification` aggregate root implemented with complete 10-state lifecycle.
- [ ] `RenderedContent` Value Object implemented with point-in-time immutability.
- [ ] `DeliveryAttempt` internal entity implemented with root ownership (no standalone repository).
- [ ] 9 domain events defined and emitted on state transitions.
- [ ] `PrismaNotificationRepository` implemented with atomic aggregate persistence, tenant isolation, and OCC.
- [ ] `NotificationService` application service implemented with transaction boundaries.
- [ ] All unit, state machine, repository, idempotency, and service tests passing with >95% coverage.
- [ ] Zero TypeScript compiler errors, zero ESLint warnings, zero TODO comments.
- [ ] Boundary audit passed: No vendor transport SDKs, queue brokers, or rendering code imported in domain.

---

# 12. Compliance Matrix

| Standard / Contract | Compliance Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **CC-003** | All 6 Invariants, 10-state machine, VO & entity rules | Domain & State Machine Tests | Certified |
| **ES-001** | UUID primary key, snake_case, OCC, audit & attempts tables | Schema Audit & Migration | Certified |
| **ES-008** | Immutable Domain Events | Event Schema Test | Certified |
| **ES-009** | Tenant Context Isolation (`tenantId`) | Repository Integration Test | Certified |
| **ES-010** | Strongly typed exceptions & OCC recovery | Repository Test | Certified |
| **ES-013** | EWP File structure & boundaries | Review Audit | Certified |

---

# 13. Expected Runtime Characteristics

| Metric / Aspect | Characteristic | Engineering Guidance |
| :--- | :--- | :--- |
| **Aggregate Size** | **`Large Aggregate`** | Encapsulates root, `RenderedContent` VO, and `DeliveryAttempt` collection. |
| **Expected Reads** | **Very High** | High-volume lookup throughput by `idempotencyKey` and `correlationId`. |
| **Expected Writes** | **Very High** | High-volume write throughput during dispatch worker cycles and retry updates. |
| **Caching Policy** | **Not Allowed** | Domain ledger state MUST be read directly from persistence; zero entity caching. |
| **Partition Candidate** | **Yes** | Schema designed for database table partitioning by `(tenantId, createdAt)`. |
| **Archive Candidate** | **Yes** | Terminal dispatches (`DELIVERED`, `SUPPRESSED`) eligible for cold storage archival. |

---

# 14. Expected Outputs

Upon completion of EWP-003 execution, the workspace will contain:
1. `src/modules/notification/domain/notifications/Notification.ts`
2. `src/modules/notification/domain/notifications/entities/DeliveryAttempt.ts`
3. `src/modules/notification/domain/notifications/value-objects/RenderedContent.ts`
4. `src/modules/notification/domain/notifications/NotificationErrors.ts`
5. `src/modules/notification/domain/notifications/NotificationEvents.ts`
6. `src/modules/notification/domain/notifications/INotificationRepository.ts`
7. `src/modules/notification/infrastructure/persistence/PrismaNotificationRepository.ts`
8. `src/modules/notification/application/notifications/NotificationService.ts`
9. `prisma/schema.prisma` and migration files.
10. Complete test suites in `__tests__/` directories.

**Status**: **AUTHORIZED & READY FOR CODE IMPLEMENTATION**.
