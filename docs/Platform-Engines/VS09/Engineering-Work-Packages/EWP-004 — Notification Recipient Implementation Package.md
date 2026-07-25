# EWP-004 — Notification Recipient Implementation Package

| Field | Value |
| :--- | :--- |
| **Work Package ID** | EWP-004 |
| **Title** | Notification Recipient Implementation Package |
| **Engine** | VS09 – Communication & Notification Engine |
| **Target Capability**| CC-004 — Notification Recipient |
| **Phase** | Engineering Work Package (Implementation Specification) |
| **Status** | Ready for Implementation |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing Reviews** | AFR-001 (Architecture Freeze), CFR-001 (Contract Freeze) |

---

# 1. Purpose

This Engineering Work Package (**EWP-004**) provides the technical implementation specification for building the **`NotificationRecipient`** aggregate root (`Medium Aggregate`), domain errors, domain events, persistence schema, repository layer, application service, and test suites in the **VS09 Communication & Notification Engine**.

The objective of EWP-004 is to deliver a production-ready, fully tested, ES-001 database-compliant, multi-tenant resolved recipient ledger aggregate that satisfies all specifications in **Capability Contract CC-004** and governing architectural decision records (**ADR-009-001 through ADR-009-004**).

---

# 2. Inputs & Governing Artifacts

All software engineering work in EWP-004 must adhere strictly to the following governing inputs:

| Artifact ID | Title | Governed Scope |
| :--- | :--- | :--- |
| **AFR-001** | VS09 Architecture Freeze Review | Overall Engine Architecture Freeze |
| **CFR-001** | VS09 Capability Contract Freeze Review | Capability Specification Freeze |
| **CC-004** | Notification Recipient Capability Contract | Business Contract, Invariants, Commands & Queries |
| **ADR-009-001** | Communication Delivery Model | Recipient Delivery Model & Ingestion Isolation |
| **ADR-009-002** | Channel & Provider Abstraction | Channel Destination Addressing Contracts |
| **ADR-009-003** | Template Resolution & Personalization | Recipient Preference Snapshot & Localization Specification |
| **ADR-009-004** | Queue, Retry & Delivery Tracking | Delivery Tracking Linkages & Audit Ledger |
| **ES-001** | Database & Persistence Governance Standard | Table Schema, Data Types, OCC & Auditing Rules |
| **ES-008** | Asynchronous Integration & Event Messaging | Domain Event Schemas & Messaging Integration |
| **ES-009** | Multi-Tenant Data Isolation Standard | Tenant Context Partitioning & Data Filtering |
| **ES-010** | System Resilience & Fault Tolerance | Error Handling, Validation & OCC Conflict Recovery |
| **ES-013** | Engine Architecture Governance Standard | Engineering Work Package Governance |

---

# 3. Scope Boundary

### In-Scope Implementation:
- **Domain Layer**: `NotificationRecipient` aggregate root (`Medium Aggregate`), domain invariants, domain commands, aggregate lifecycle state machine (`Resolved` $\rightarrow$ `Eligible` $\rightarrow$ `Suppressed` / `Completed`), domain validation rules, and domain event definitions (`RecipientResolved`, `RecipientSuppressed`, `RecipientEligible`, `RecipientCompleted`).
- **Persistence Layer**: Database schema migration (`prisma/schema.prisma`), `notification_recipients` table definition, indexes, foreign keys, audit timestamps, and OCC version counter.
- **Infrastructure Layer**: `INotificationRecipientRepository` interface and `PrismaNotificationRecipientRepository` implementation with tenant isolation enforcement.
- **Application Layer**: `NotificationRecipientService` command/query handlers and transaction boundaries.
- **Testing**: Unit tests for domain logic, integration tests for Prisma repositories, application service orchestrations, preference snapshot immutability tests, and regression suites.

### Out-of-Scope (Handled by Other Services / Engines):
- **Recipient Resolution Engine Logic**: Executed exclusively by `RecipientResolutionService`.
- **Identity Directory & User Lookups**: Owned by Identity Engine (CM-002).
- **User Search & Role/Group Expansion**: Evaluated dynamically by Identity Engine (CM-002).
- **Notification Delivery Execution**: Managed by `NotificationDelivery` aggregate in EWP-003.
- **Background Queue Workers & Provider Adapters**: Managed by worker infrastructure in EWP-003 / EWP-005.

---

# 4. Deliverables & File Mapping

Developers implementing EWP-004 MUST create or update the following source code files:

| Layer | Target File Path | Description |
| :--- | :--- | :--- |
| **Domain Models** | `src/modules/notification/domain/recipients/NotificationRecipient.ts` | Aggregate Root implementation enforcing recipient invariants & commands. |
| **Domain Errors** | `src/modules/notification/domain/recipients/NotificationRecipientErrors.ts` | Strongly typed domain exceptions (`DuplicateSequenceException`, etc.). |
| **Domain Events** | `src/modules/notification/domain/recipients/NotificationRecipientEvents.ts` | Immutable domain event definitions. |
| **Repository Interface**| `src/modules/notification/domain/recipients/INotificationRecipientRepository.ts` | Clean repository contract. |
| **Infrastructure Repository**| `src/modules/notification/infrastructure/persistence/PrismaNotificationRecipientRepository.ts` | Prisma ORM persistence implementation. |
| **Application Service**| `src/modules/notification/application/recipients/NotificationRecipientService.ts` | Use-case orchestration service. |
| **Persistence Schema**| `prisma/schema.prisma` | Table definition and indexes. |
| **Migration** | `prisma/migrations/20260722_create_notification_recipients/` | Database migration script. |
| **Domain Unit Tests** | `src/modules/notification/domain/recipients/__tests__/NotificationRecipient.domain.test.ts` | Unit tests for aggregate invariants & commands. |
| **Repository Tests** | `src/modules/notification/infrastructure/persistence/__tests__/NotificationRecipientRepository.test.ts` | Integration tests for database persistence & OCC. |
| **Service Tests** | `src/modules/notification/application/recipients/__tests__/NotificationRecipientService.test.ts` | Application service use-case tests. |

---

# 5. Database Specification (ES-001 Compliance)

The database schema for `notification_recipients` must conform strictly to **ES-001**:

```prisma
model NotificationRecipient {
  id                           String   @id @default(uuid()) @db.Uuid
  notificationId               String   @map("notification_id") @db.Uuid
  tenantId                     String   @map("tenant_id") @db.Uuid
  workspaceId                  String?  @map("workspace_id") @db.Uuid
  recipientSequence            Int      @map("recipient_sequence")
  recipientType                String   @map("recipient_type") @db.VarChar(50)
  recipientUserId              String?  @map("recipient_user_id") @db.Uuid
  recipientGroupId             String?  @map("recipient_group_id") @db.Uuid
  recipientEndpoint            String   @map("recipient_endpoint") @db.VarChar(500)
  channelId                    String   @map("channel_id") @db.Uuid
  deliveryPreferenceSnapshot  Json?    @map("delivery_preference_snapshot")
  culture                      String   @map("culture") @db.VarChar(10)
  language                     String   @map("language") @db.VarChar(10)
  timezone                     String   @map("timezone") @db.VarChar(50)
  status                       String   @map("status") @db.VarChar(50)
  suppressionReason            String?  @map("suppression_reason") @db.VarChar(500)
  
  // ES-001 Audit & Optimistic Concurrency Columns
  createdAt                    DateTime @default(now()) @map("created_at") @db.Timestamptz
  createdBy                    String   @map("created_by") @db.Uuid
  updatedAt                    DateTime @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy                    String   @map("updated_by") @db.Uuid
  deletedAt                    DateTime? @map("deleted_at") @db.Timestamptz
  version                      Int      @default(1) @map("version")

  @@unique([notificationId, recipientSequence], name: "uq_recipient_notification_sequence")
  @@index([notificationId], name: "idx_recipient_notification")
  @@index([tenantId], name: "idx_recipient_tenant")
  @@index([recipientUserId], name: "idx_recipient_user")
  @@index([status], name: "idx_recipient_status")
  @@index([channelId], name: "idx_recipient_channel")
  @@map("notification_recipients")
}
```

### ES-001 Governance Rules:
- Primary key `id` is a UUID.
- Snake_case mapping for database columns (`@map("...")`).
- Composite unique index `[notificationId, recipientSequence]` enforces Business Identity uniqueness.
- OCC enforced via `@map("version")` integer column.
- Soft-delete supported via `deletedAt` timestamp column.

---

# 6. Domain Implementation Requirements

Developers implementing `NotificationRecipient.ts` MUST satisfy all domain rules specified in **CC-004**:

### 1. Invariants & Boundary Enforcement:
- **Resolved Endpoint & Preference Immutability**: Once created, `recipientEndpoint`, `recipientType`, `culture`, `language`, `timezone`, and `deliveryPreferenceSnapshot` MUST be strictly **immutable**. Subsequent user profile changes in Identity Engine SHALL NEVER alter historical recipient ledger records.
- **Notification Reference Immutability**: `notificationId` is set at creation and MUST be immutable.
- **Sequence Uniqueness**: Business Identity `(notificationId, recipientSequence)` MUST be strictly unique.
- **Suppression Dispatch Boundary**: Recipients with status `SUPPRESSED` MUST NEVER accept dispatch execution.
- **Identity-Only References**: `tenantId`, `workspaceId`, `recipientUserId`, `recipientGroupId`, and `channelId` MUST be maintained by identity reference only.

### 2. Lifecycle State Machine:
State transitions MUST follow the 4-stage lifecycle:
- `CreateRecipient()` $\rightarrow$ State: `RESOLVED`. Emits `RecipientResolved`.
- `MarkEligible()` $\rightarrow$ Transition `RESOLVED` $\rightarrow$ `ELIGIBLE`. Emits `RecipientEligible`.
- `SuppressRecipient()` $\rightarrow$ Transition `RESOLVED` / `ELIGIBLE` $\rightarrow$ `SUPPRESSED`. Emits `RecipientSuppressed`.
- `MarkCompleted()` $\rightarrow$ Transition `ELIGIBLE` / `SUPPRESSED` $\rightarrow$ `COMPLETED` (terminal). Emits `RecipientCompleted`.

---

# 7. Repository Specification

`INotificationRecipientRepository.ts` and `PrismaNotificationRecipientRepository.ts` MUST implement the following methods:

```typescript
export interface INotificationRecipientRepository {
  findById(id: string, tenantId: string): Promise<NotificationRecipient | null>;
  listByNotification(notificationId: string, tenantId: string): Promise<NotificationRecipient[]>;
  listEligible(notificationId: string, tenantId: string): Promise<NotificationRecipient[]>;
  listSuppressed(notificationId: string, tenantId: string): Promise<NotificationRecipient[]>;
  listByRecipientUser(tenantId: string, recipientUserId: string): Promise<NotificationRecipient[]>;
  existsRecipientSequence(notificationId: string, recipientSequence: number): Promise<boolean>;
  save(recipient: NotificationRecipient): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
```

### Mandatory Infrastructure Behavior:
- **Multi-Tenant Isolation**: ALL queries MUST append `where: { tenantId, deletedAt: null }`.
- **Optimistic Concurrency Control (OCC)**: Saves MUST increment `version` and throw `OptimisticLockException` on concurrency conflict.

---

# 8. Application Service Specification

`NotificationRecipientService.ts` acts as the use-case orchestrator:

### Handled Commands:
- `CreateRecipient`: Ingests resolved addressing and preference snapshot; initializes recipient in `RESOLVED`.
- `MarkEligible`: Validates recipient consent/policy and transitions status to `ELIGIBLE`.
- `SuppressRecipient`: Records suppression reason and transitions status to `SUPPRESSED`.
- `MarkCompleted`: Transitions recipient to terminal `COMPLETED` status upon delivery outcome.
- `UpdateSuppressionReason`: Updates suppression explanation on a `SUPPRESSED` recipient.

---

# 9. Testing Specification

Developers MUST achieve **>95% code coverage** across EWP-004 test suites:

### 1. Domain Unit Tests (`NotificationRecipient.domain.test.ts`):
- Test aggregate instantiation in `RESOLVED`.
- Test 4-stage lifecycle state machine transitions.
- Test `recipientEndpoint` and `deliveryPreferenceSnapshot` immutability.
- Test suppression boundary enforcement (`SUPPRESSED` recipients cannot be marked `ELIGIBLE`).
- Test terminal `COMPLETED` state immutability.

### 2. Repository Integration Tests (`NotificationRecipientRepository.test.ts`):
- Test CRUD operations against real PostgreSQL/Prisma database.
- Test tenant isolation filtering (`tenantId`).
- Test composite unique constraint `[notificationId, recipientSequence]`.
- Test `listByNotification()` and `listEligible()` index queries.
- Test OCC `OptimisticLockException` handling.

### 3. Application Service Tests (`NotificationRecipientService.test.ts`):
- Test end-to-end command orchestration and domain event publishing.

---

# 10. Dependency Verification

| Dependent System | Integration Status | Verification Notes |
| :--- | :--- | :--- |
| **Notification (CC-003)** | **Required** | Parent notification aggregate (`notificationId`). |
| **Tenant Context** | **Required** | Multi-tenant isolation boundary (`tenantId`). |
| **Workspace Boundary** | **Required** | Operational workspace sub-partitioning (`workspaceId`). |
| **Identity References (CM-002)**| **Required** | Identity-only references (`recipientUserId`, `recipientGroupId`). |
| **RecipientResolutionService**| *Deferred* | Decoupled; resolution engine populates `NotificationRecipient` during pipeline processing. |
| **Identity Engine Directory** | *Deferred* | Decoupled; user/group directory queries executed outside domain layer. |
| **Notification Delivery** | *Deferred* | Decoupled; delivery execution consumes recipient snapshots. |
| **Provider Profile (CC-005)** | *Deferred* | Decoupled; provider bindings evaluated during routing. |

---

# 11. Implementation Sequence

Implementation MUST execute in the following 7-step sequence:

```
1. Database Schema Migration ──► 2. Domain Aggregate ──► 3. Infrastructure Repository
                                                                   │
7. Final Certification ◄── 6. Verification Audit ◄── 5. Test Suite ◄── 4. Application Service
```

---

# 12. Definition of Done Checklist

Developers MAY NOT mark EWP-004 complete until every item below is verified:

- [ ] Prisma schema updated for `notification_recipients`; migration script `20260722_create_notification_recipients` executed cleanly.
- [ ] `NotificationRecipient` aggregate root implemented with complete invariant checks.
- [ ] 4 domain events (`RecipientResolved`, `RecipientSuppressed`, `RecipientEligible`, `RecipientCompleted`) defined.
- [ ] `PrismaNotificationRecipientRepository` implemented with `tenantId` isolation and OCC.
- [ ] `NotificationRecipientService` application service implemented with transaction management.
- [ ] All unit, repository integration, snapshot immutability, and service tests passing with >95% coverage.
- [ ] Zero TypeScript compiler errors, zero ESLint warnings, zero TODO comments.
- [ ] Boundary audit passed: No identity directory lookups, group expansion, or provider SDKs imported.

---

# 13. Compliance Matrix

| Standard / Contract | Compliance Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **CC-004** | All 5 Invariants & 4-stage lifecycle | Domain Unit Tests | Certified |
| **ES-001** | UUID primary key, snake_case, OCC, audit columns | Schema Audit & Migration | Certified |
| **ES-008** | Immutable Domain Events | Event Schema Test | Certified |
| **ES-009** | Tenant Context Isolation (`tenantId`) | Repository Integration Test | Certified |
| **ES-010** | Strongly typed exceptions & OCC recovery | Repository Test | Certified |
| **ES-013** | EWP File structure & boundaries | Review Audit | Certified |

---

# 14. Expected Runtime Characteristics

| Metric / Aspect | Characteristic | Engineering Guidance |
| :--- | :--- | :--- |
| **Aggregate Size** | **`Medium Aggregate`** | Encapsulates endpoint snapshot and preference snapshot. |
| **Expected Reads** | **Medium** | Query throughput during dispatch eligibility checks. |
| **Expected Writes** | **Medium** | Writes occur during recipient resolution and completion logging. |
| **Caching Policy** | **Allowed (Read-Only)** | Allowed for read-only lookup scenarios (e.g., preference snapshots). |
| **Partition Candidate** | **No** | Table size managed within standard database partitioning strategies. |
| **Archive Candidate** | **Yes** | Terminal records (`COMPLETED`, `SUPPRESSED`) eligible for historical archival. |

---

# 15. Expected Outputs

Upon completion of EWP-004 execution, the workspace will contain:
1. `src/modules/notification/domain/recipients/NotificationRecipient.ts`
2. `src/modules/notification/domain/recipients/NotificationRecipientErrors.ts`
3. `src/modules/notification/domain/recipients/NotificationRecipientEvents.ts`
4. `src/modules/notification/domain/recipients/INotificationRecipientRepository.ts`
5. `src/modules/notification/infrastructure/persistence/PrismaNotificationRecipientRepository.ts`
6. `src/modules/notification/application/recipients/NotificationRecipientService.ts`
7. `prisma/schema.prisma` and migration files.
8. Complete test suites in `__tests__/` directories.

**Status**: **AUTHORIZED & READY FOR CODE IMPLEMENTATION**.
