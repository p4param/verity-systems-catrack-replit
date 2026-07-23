# EWP-002 — Notification Channel Implementation Package

| Field | Value |
| :--- | :--- |
| **Work Package ID** | EWP-002 |
| **Title** | Notification Channel Implementation Package |
| **Engine** | VS09 – Communication & Notification Engine |
| **Target Capability**| CC-002 — Notification Channel |
| **Phase** | Engineering Work Package (Implementation Specification) |
| **Status** | Ready for Implementation |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing Reviews** | AFR-001 (Architecture Freeze), CFR-001 (Contract Freeze) |

---

# 1. Purpose

This Engineering Work Package (**EWP-002**) provides the technical implementation specification for building the **`NotificationChannel`** aggregate root, domain errors, domain events, persistence schema, repository layer, application service, and test suites in the **VS09 Communication & Notification Engine**.

The objective of EWP-002 is to deliver a production-ready, fully tested, ES-001 database-compliant, multi-tenant `NotificationChannel` aggregate that satisfies all specifications in **Capability Contract CC-002** and governing architectural decision records (**ADR-009-001 through ADR-009-004**).

---

# 2. Inputs & Governing Artifacts

All software engineering work in EWP-002 must adhere strictly to the following governing inputs:

| Artifact ID | Title | Governed Scope |
| :--- | :--- | :--- |
| **AFR-001** | VS09 Architecture Freeze Review | Overall Engine Architecture Freeze |
| **CFR-001** | VS09 Capability Contract Freeze Review | Capability Specification Freeze |
| **CC-002** | Notification Channel Capability Contract | Business Contract, Invariants, Commands & Queries |
| **ADR-009-001** | Communication Delivery Model | Dual-tier Queue & Delivery Model |
| **ADR-009-002** | Channel & Provider Abstraction | Channel vs. Provider Separation & Metadata Model |
| **ADR-009-003** | Template Resolution & Personalization | Channel Resolution & Rendering Pipeline |
| **ADR-009-004** | Queue, Retry & Delivery Tracking | Technology-Agnostic Channel Dispatch |
| **ES-001** | Database & Persistence Governance Standard | Table Schema, Data Types, OCC & Auditing Rules |
| **ES-008** | Asynchronous Integration & Event Messaging | Domain Event Schemas & Messaging Integration |
| **ES-009** | Multi-Tenant Data Isolation Standard | Tenant Context Partitioning & Data Filtering |
| **ES-010** | System Resilience & Fault Tolerance | Error Handling, Validation & OCC Conflict Recovery |
| **ES-013** | Engine Architecture Governance Standard | Engineering Work Package Governance |

---

# 3. Scope Boundary

### In-Scope Implementation:
- **Domain Layer**: `NotificationChannel` aggregate root (`Small Aggregate`), domain invariants, domain commands, aggregate lifecycle state machine (`Draft` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`), domain validation rules, and domain event definitions (`ChannelCreated`, `ChannelActivated`, `ChannelSuspended`, `ChannelArchived`, `ChannelEnabled`, `ChannelDisabled`, `DefaultChannelChanged`).
- **Persistence Layer**: Database schema migration (`prisma/schema.prisma`), `notification_channels` table definition, indexes, foreign keys, audit timestamps, and OCC version counter.
- **Infrastructure Layer**: `INotificationChannelRepository` interface and `PrismaNotificationChannelRepository` implementation with tenant isolation enforcement.
- **Application Layer**: `NotificationChannelService` command/query handlers and transaction boundaries.
- **Testing**: Unit tests for domain logic, integration tests for Prisma repositories, application service orchestrations, and regression suites.

### Out-of-Scope (Handled by Other EWPs / Infrastructure):
- **Provider Adapters & Vendor SDKs**: Transport drivers managed by isolated Provider Adapters in EWP-005 (ADR-009-002).
- **Provider Selection & Failover**: Managed by `ChannelRoutingService` in EWP-005.
- **Queue Processing & Worker Threads**: Managed by worker queues in EWP-003 / EWP-004 (ADR-009-004).
- **Notification Delivery State Machine**: Managed by `NotificationDelivery` aggregate in EWP-003.
- **Template Rendering & Personalization**: Managed by `TemplateResolutionService` (ADR-009-003).

---

# 4. Deliverables & File Mapping

Developers implementing EWP-002 MUST create or update the following source code files:

| Layer | Target File Path | Description |
| :--- | :--- | :--- |
| **Domain Models** | `src/modules/notification/domain/channels/NotificationChannel.ts` | Aggregate Root implementation enforcing invariants and commands. |
| **Domain Errors** | `src/modules/notification/domain/channels/NotificationChannelErrors.ts` | Strongly typed domain exceptions (`DuplicateChannelCodeException`, etc.). |
| **Domain Events** | `src/modules/notification/domain/channels/NotificationChannelEvents.ts` | Immutable domain event definitions. |
| **Repository Interface**| `src/modules/notification/domain/channels/INotificationChannelRepository.ts` | Clean repository contract. |
| **Infrastructure Repository**| `src/modules/notification/infrastructure/persistence/PrismaNotificationChannelRepository.ts` | Prisma ORM persistence implementation. |
| **Application Service**| `src/modules/notification/application/channels/NotificationChannelService.ts` | Use-case orchestration service. |
| **Persistence Schema**| `prisma/schema.prisma` | Table definition and indexes. |
| **Migration** | `prisma/migrations/20260722_create_notification_channels/` | Database migration script. |
| **Domain Unit Tests** | `src/modules/notification/domain/channels/__tests__/NotificationChannel.domain.test.ts` | Unit tests for aggregate invariants & commands. |
| **Repository Tests** | `src/modules/notification/infrastructure/persistence/__tests__/NotificationChannelRepository.test.ts` | Integration tests for database persistence & OCC. |
| **Service Tests** | `src/modules/notification/application/channels/__tests__/NotificationChannelService.test.ts` | Application service use-case tests. |

---

# 5. Database Specification (ES-001 Compliance)

The database schema for `notification_channels` must conform strictly to **ES-001**:

```prisma
model NotificationChannel {
  id                         String   @id @default(uuid()) @db.Uuid
  tenantId                   String   @map("tenant_id") @db.Uuid
  workspaceId                String?  @map("workspace_id") @db.Uuid
  channelCode                String   @map("channel_code") @db.VarChar(100)
  channelName                String   @map("channel_name") @db.VarChar(255)
  description                String?  @map("description") @db.VarChar(1000)
  channelType                String   @map("channel_type") @db.VarChar(50)
  status                     String   @map("status") @db.VarChar(50)
  priority                   Int      @default(100) @map("priority")
  isDefault                  Boolean  @default(false) @map("is_default")
  isEnabled                  Boolean  @default(true) @map("is_enabled")
  supportedTemplateCategories Json    @map("supported_template_categories")
  configurationMetadata      Json?    @map("configuration_metadata")
  
  // ES-001 Audit & Optimistic Concurrency Columns
  createdAt                  DateTime @default(now()) @map("created_at") @db.Timestamptz
  createdBy                  String   @map("created_by") @db.Uuid
  updatedAt                  DateTime @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy                  String   @map("updated_by") @db.Uuid
  deletedAt                  DateTime? @map("deleted_at") @db.Timestamptz
  version                    Int      @default(1) @map("version")

  @@unique([tenantId, channelCode], name: "uq_channel_tenant_code")
  @@index([tenantId], name: "idx_channel_tenant")
  @@index([tenantId, channelType], name: "idx_channel_tenant_type")
  @@index([tenantId, status], name: "idx_channel_tenant_status")
  @@index([tenantId, isEnabled], name: "idx_channel_tenant_enabled")
  @@map("notification_channels")
}
```

### ES-001 Governance Rules:
- Primary key `id` is a UUID.
- Snake_case mapping for database columns (`@map("...")`).
- Composite unique index `[tenantId, channelCode]` enforces Business Identity uniqueness.
- OCC enforced via `@map("version")` integer column.
- Soft-delete supported via `deletedAt` timestamp column.

---

# 6. Domain Implementation Requirements

Developers implementing `NotificationChannel.ts` MUST satisfy all domain rules specified in **CC-002**:

### 1. Business Invariants Enforcement:
- **Unique Channel Code**: The Business Identity `(tenantId, channelCode)` MUST be unique per tenant.
- **Single Default Per Channel Type**: Setting `isDefault = true` for a channel type MUST unset `isDefault` on all other channels of that `channelType` within the tenant.
- **Immutable Channel Type**: `channelType` MUST be immutable once created.
- **Disabled Routing Boundary**: Disabled channels (`isEnabled = false`) or suspended channels (`status = SUSPENDED`) MUST NOT accept intent dispatches.
- **Unique Supported Categories**: `supportedTemplateCategories` array MUST be deduplicated on insertion.

### 2. State Machine Implementation:
State transitions MUST follow the 4-stage lifecycle:
- `CreateChannel()` $\rightarrow$ State: `DRAFT`. Emits `ChannelCreated`.
- `ActivateChannel()` $\rightarrow$ Transition `DRAFT` / `SUSPENDED` $\rightarrow$ `ACTIVE`. Emits `ChannelActivated`.
- `SuspendChannel()` $\rightarrow$ Transition `ACTIVE` $\rightarrow$ `SUSPENDED`. Emits `ChannelSuspended`.
- `ArchiveChannel()` $\rightarrow$ Transition `SUSPENDED` / `ACTIVE` $\rightarrow$ `ARCHIVED` (terminal). Emits `ChannelArchived`.

---

# 7. Repository Specification

`INotificationChannelRepository.ts` and `PrismaNotificationChannelRepository.ts` MUST implement the following methods:

```typescript
export interface INotificationChannelRepository {
  findById(id: string, tenantId: string): Promise<NotificationChannel | null>;
  findByCode(tenantId: string, channelCode: string): Promise<NotificationChannel | null>;
  findDefaultChannel(tenantId: string, channelType: string): Promise<NotificationChannel | null>;
  listActive(tenantId: string, category?: string): Promise<NotificationChannel[]>;
  listEnabled(tenantId: string): Promise<NotificationChannel[]>;
  listByType(tenantId: string, channelType: string): Promise<NotificationChannel[]>;
  existsChannelCode(tenantId: string, channelCode: string): Promise<boolean>;
  save(channel: NotificationChannel): Promise<void>;
  clearOtherDefaults(tenantId: string, channelType: string, excludeChannelId: string): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
```

### Mandatory Infrastructure Behavior:
- **Multi-Tenant Filtering**: ALL database read/write queries MUST append `where: { tenantId, deletedAt: null }`.
- **Optimistic Concurrency Control (OCC)**: Saves MUST increment `version` and throw `OptimisticLockException` if `version` has changed in the database.

---

# 8. Application Service Specification

`NotificationChannelService.ts` acts as the use-case orchestrator:

### Handled Commands:
- `CreateChannel`: Instantiates channel aggregate in `DRAFT`.
- `ActivateChannel`: Activates channel for runtime operations.
- `SuspendChannel`: Suspends channel due to operational pauses.
- `ArchiveChannel`: Decommissions channel permanently.
- `EnableChannel` / `DisableChannel`: Toggles `isEnabled` routing availability.
- `SetDefault`: Marks channel as default for its type and invokes `clearOtherDefaults()`.
- `UpdateMetadata`: Updates channel display name, description, priority, and configuration metadata.

---

# 9. Testing Specification

Developers MUST achieve **>95% code coverage** across EWP-002 test suites:

### 1. Domain Unit Tests (`NotificationChannel.domain.test.ts`):
- Test aggregate creation in `DRAFT`.
- Test 4-stage lifecycle transitions (`Draft` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`).
- Test immutable `channelType` validation.
- Test category deduplication.
- Test terminal `ARCHIVED` state immutability.

### 2. Repository Integration Tests (`NotificationChannelRepository.test.ts`):
- Test CRUD operations against real PostgreSQL/Prisma database.
- Test tenant data isolation filtering.
- Test composite unique constraint `[tenantId, channelCode]`.
- Test `clearOtherDefaults()` single-default enforcement across tenant channels.
- Test Optimistic Concurrency Control (`OptimisticLockException` on concurrent save).

### 3. Application Service Tests (`NotificationChannelService.test.ts`):
- Test end-to-end command handlers and event emissions.

---

# 10. Dependency Verification

| Dependent System | Integration Status | Verification Notes |
| :--- | :--- | :--- |
| **Tenant Context** | **Required** | Supplies `tenantId` and `workspaceId` for multi-tenant data partitioning. |
| **Workspace Boundary** | **Required** | Optional workspace sub-partitioning supported in persistence model. |
| **Metadata Engine** | **Required** | Supplies channel configuration metadata schemas. |
| **Provider Profile (CC-005)** | *Deferred* | Decoupled; provider bindings evaluated during runtime selection in EWP-005. |
| **Notification Delivery (CC-003)**| *Deferred* | Decoupled; delivery execution consumes channels by identity reference. |

---

# 11. Definition of Done Checklist

Developers MAY NOT mark EWP-002 complete until every item below is verified:

- [ ] Prisma schema updated and migration script `20260722_create_notification_channels` executed cleanly.
- [ ] `NotificationChannel` aggregate root implemented with complete invariant checks.
- [ ] 7 domain events (`ChannelCreated`, `ChannelActivated`, `ChannelSuspended`, `ChannelArchived`, `ChannelEnabled`, `ChannelDisabled`, `DefaultChannelChanged`) defined.
- [ ] `PrismaNotificationChannelRepository` implemented with single-default enforcement, `tenantId` isolation, and OCC.
- [ ] `NotificationChannelService` application service implemented with transaction management.
- [ ] All unit, repository integration, service, and lifecycle tests passing with >95% coverage.
- [ ] Zero TypeScript compiler errors, zero ESLint warnings, zero TODO comments.
- [ ] Boundary audit passed: No provider adapter SDKs, queue workers, or rendering engines imported.

---

# 12. Compliance Matrix

| Standard / Contract | Compliance Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **CC-002** | All 6 Invariants & 4-stage lifecycle | Domain Unit Tests | Certified |
| **ES-001** | UUID primary key, snake_case, OCC, audit columns | Schema Audit & Migration | Certified |
| **ES-008** | Immutable Domain Events | Event Schema Test | Certified |
| **ES-009** | Tenant Context Isolation (`tenantId`) | Repository Integration Test | Certified |
| **ES-010** | Strongly typed exceptions & OCC recovery | Repository Test | Certified |
| **ES-013** | EWP File structure & boundaries | Review Audit | Certified |

---

# 13. Expected Outputs

Upon completion of EWP-002 execution, the workspace will contain:
1. `src/modules/notification/domain/channels/NotificationChannel.ts`
2. `src/modules/notification/domain/channels/NotificationChannelErrors.ts`
3. `src/modules/notification/domain/channels/NotificationChannelEvents.ts`
4. `src/modules/notification/domain/channels/INotificationChannelRepository.ts`
5. `src/modules/notification/infrastructure/persistence/PrismaNotificationChannelRepository.ts`
6. `src/modules/notification/application/channels/NotificationChannelService.ts`
7. `prisma/schema.prisma` and migration files.
8. Complete test suites in `__tests__/` directories.

**Status**: **AUTHORIZED & READY FOR CODE IMPLEMENTATION**.
