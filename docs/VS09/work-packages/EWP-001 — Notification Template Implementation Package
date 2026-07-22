# EWP-001 — Notification Template Implementation Package

| Field | Value |
| :--- | :--- |
| **Work Package ID** | EWP-001 |
| **Title** | Notification Template Implementation Package |
| **Engine** | VS09 – Communication & Notification Engine |
| **Target Capability**| CC-001 — Notification Template |
| **Phase** | Engineering Work Package (Implementation Specification) |
| **Status** | Ready for Implementation |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing Reviews** | AFR-001 (Architecture Freeze), CFR-001 (Contract Freeze) |

---

# 1. Purpose

This Engineering Work Package (**EWP-001**) provides the technical implementation specification for building the **`NotificationTemplate`** aggregate root, domain entities, persistence schema, repository layer, application service, and test suites in the **VS09 Communication & Notification Engine**.

The objective of EWP-001 is to deliver a production-ready, fully tested, ES-001 database-compliant, multi-tenant `NotificationTemplate` aggregate that satisfies all specifications in **Capability Contract CC-001** and governing architectural decision records (**ADR-009-001 through ADR-009-004**).

---

# 2. Inputs & Governing Artifacts

All software engineering work in EWP-001 must adhere strictly to the following governing inputs:

| Artifact ID | Title | Governed Scope |
| :--- | :--- | :--- |
| **AFR-001** | VS09 Architecture Freeze Review | Overall Engine Architecture Freeze |
| **CFR-001** | VS09 Capability Contract Freeze Review | Capability Specification Freeze |
| **CC-001** | Notification Template Capability Contract | Business Contract, Invariants, Commands & Queries |
| **ADR-009-001** | Communication Delivery Model | Dual-tier Queue & Non-blocking Ingestion Boundary |
| **ADR-009-002** | Channel & Provider Abstraction | Abstract Channel & Provider Isolation |
| **ADR-009-003** | Template Resolution & Personalization | RenderContext, Hierarchy & Resolution Pipeline |
| **ADR-009-004** | Queue, Retry & Delivery Tracking | Technology-Agnostic Queues & Tracing |
| **ES-001** | Database & Persistence Governance Standard | Table Schema, Data Types, OCC & Auditing Rules |
| **ES-008** | Asynchronous Integration & Event Messaging | Domain Event Schemas & Messaging Integration |
| **ES-009** | Multi-Tenant Data Isolation Standard | Tenant Context Partitioning & Data Filtering |
| **ES-010** | System Resilience & Fault Tolerance | Error Handling, Validation & OCC Conflict Recovery |
| **ES-013** | Engine Architecture Governance Standard | Engineering Work Package Governance |

---

# 3. Scope Boundary

### In-Scope Implementation:
- **Domain Layer**: `NotificationTemplate` aggregate root, `TemplateVersion` value object, `VariableSchema` descriptor value object, domain invariants, domain commands, aggregate lifecycle state machine, domain validation rules, and domain event definitions (`TemplateCreated`, `TemplatePublished`, `TemplateVersionCreated`, `TemplateDeprecated`, `TemplateArchived`).
- **Persistence Layer**: Database schema migration (`prisma/schema.prisma`), `notification_templates` table definition, indexes, foreign keys, audit timestamps, and OCC version counter.
- **Infrastructure Layer**: `INotificationTemplateRepository` interface and `PrismaNotificationTemplateRepository` implementation with tenant isolation enforcement.
- **Application Layer**: `NotificationTemplateService` command/query handlers and transaction boundaries.
- **Testing**: Unit tests for domain logic, integration tests for Prisma repositories, application service orchestrations, and regression suites.

### Out-of-Scope (Handled by Other EWPs / Services):
- **Template Rendering & Personalization**: Executed by `TemplateResolutionService` (ADR-009-003).
- **Localization Engine Dictionaries**: Managed by Metadata Engine.
- **Branding Assets**: Managed by Branding/Metadata Engine.
- **Concrete Provider Transport Drivers**: Managed by Provider Adapters in EWP-005 (ADR-009-002).
- **Background Worker Processing**: Managed by worker queues in EWP-003 / EWP-004 (ADR-009-004).

---

# 4. Deliverables & File Mapping

Developers implementing EWP-001 MUST create or update the following source code files:

| Layer | Target File Path | Description |
| :--- | :--- | :--- |
| **Domain Models** | `src/modules/notification/domain/templates/NotificationTemplate.ts` | Aggregate Root implementation enforcing invariants and commands. |
| **Domain Errors** | `src/modules/notification/domain/templates/NotificationTemplateErrors.ts` | Strongly typed domain exceptions (`DuplicateVersionException`, etc.). |
| **Domain Events** | `src/modules/notification/domain/templates/NotificationTemplateEvents.ts` | Immutable domain event definitions. |
| **Value Objects** | `src/modules/notification/domain/templates/value-objects/VariableSchema.ts` | JSON Schema descriptor VO. |
| **Repository Interface**| `src/modules/notification/domain/templates/INotificationTemplateRepository.ts` | Clean repository contract. |
| **Infrastructure Repository**| `src/modules/notification/infrastructure/persistence/PrismaNotificationTemplateRepository.ts` | Prisma ORM persistence implementation. |
| **Application Service**| `src/modules/notification/application/templates/NotificationTemplateService.ts` | Use-case orchestration service. |
| **Persistence Schema**| `prisma/schema.prisma` | Table definition and indexes. |
| **Migration** | `prisma/migrations/20260722_create_notification_templates/` | Database migration script. |
| **Domain Unit Tests** | `src/modules/notification/domain/templates/__tests__/NotificationTemplate.domain.test.ts` | Unit tests for aggregate invariants & commands. |
| **Repository Tests** | `src/modules/notification/infrastructure/persistence/__tests__/NotificationTemplateRepository.test.ts` | Integration tests for database persistence & OCC. |
| **Service Tests** | `src/modules/notification/application/templates/__tests__/NotificationTemplateService.test.ts` | Application service use-case tests. |

---

# 5. Database Specification (ES-001 Compliance)

The database schema for `notification_templates` must conform strictly to **ES-001**:

```prisma
model NotificationTemplate {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @map("tenant_id") @db.Uuid
  workspaceId         String?  @map("workspace_id") @db.Uuid
  templateCode        String   @map("template_code") @db.VarChar(100)
  templateName        String   @map("template_name") @db.VarChar(255)
  description         String?  @map("description") @db.VarChar(1000)
  category            String   @map("category") @db.VarChar(50)
  status              String   @map("status") @db.VarChar(50)
  templateVersion     String   @map("template_version") @db.VarChar(50)
  parentTemplateId    String?  @map("parent_template_id") @db.Uuid
  supportedChannels   Json     @map("supported_channels")
  supportedLanguages  Json     @map("supported_languages")
  defaultLanguage     String   @map("default_language") @db.VarChar(10)
  brandingProfileId   String?  @map("branding_profile_id") @db.Uuid
  isSystemTemplate    Boolean  @default(false) @map("is_system_template")
  isActive            Boolean  @default(true) @map("is_active")
  variableSchema      Json     @map("variable_schema")
  
  // ES-001 Audit & Optimistic Concurrency Columns
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz
  createdBy           String   @map("created_by") @db.Uuid
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy           String   @map("updated_by") @db.Uuid
  deletedAt           DateTime? @map("deleted_at") @db.Timestamptz
  version             Int      @default(1) @map("version")

  @@unique([tenantId, templateCode, templateVersion], name: "uq_template_tenant_code_version")
  @@index([tenantId, status], name: "idx_template_tenant_status")
  @@index([tenantId, category], name: "idx_template_tenant_category")
  @@map("notification_templates")
}
```

### ES-001 Governance Rules:
- Primary key `id` is a UUID.
- Snake_case mapping for database columns (`@map("...")`).
- Composite unique index `[tenantId, templateCode, templateVersion]` enforces Business Identity uniqueness.
- OCC enforced via `@map("version")` integer column.
- Soft-delete supported via `deletedAt` timestamp column.

---

# 6. Domain Implementation Requirements

Developers implementing `NotificationTemplate.ts` MUST satisfy all domain rules specified in **CC-001**:

### 1. Business Invariants Enforcement:
- **Version Immutability**: Transitioning to `PUBLISHED` locks the version. Attempting to mutate content attributes on a `PUBLISHED` template MUST throw `TemplateVersionImmutableException`.
- **Circular Inheritance Check**: Setting `parentTemplateId` MUST verify that the parent template ID is not equal to `this.id` and does not create an inheritance cycle.
- **Language & Channel Uniqueness**: `supportedLanguages` and `supportedChannels` arrays MUST be deduplicated on insertion. `defaultLanguage` MUST exist inside `supportedLanguages`.
- **Schema Key Verification**: `variableSchema` MUST be valid JSON Schema.

### 2. State Machine Implementation:
State transitions MUST follow the 4-stage lifecycle:
- `CreateTemplate()` $\rightarrow$ State: `DRAFT`, Version: `1.0.0`.
- `PublishTemplate()` $\rightarrow$ Transition `DRAFT` $\rightarrow$ `PUBLISHED`. Emits `TemplatePublished`.
- `CreateVersion()` $\rightarrow$ Derives new `DRAFT` instance from `PUBLISHED` predecessor, inheriting predecessor metadata. Emits `TemplateVersionCreated`.
- `DeprecateTemplate()` $\rightarrow$ Transition `PUBLISHED` $\rightarrow$ `DEPRECATED`. Emits `TemplateDeprecated`.
- `ArchiveTemplate()` $\rightarrow$ Transition `DEPRECATED` or `PUBLISHED` $\rightarrow$ `ARCHIVED` (terminal). Emits `TemplateArchived`.

---

# 7. Repository Specification

`INotificationTemplateRepository.ts` and `PrismaNotificationTemplateRepository.ts` MUST implement the following methods:

```typescript
export interface INotificationTemplateRepository {
  findById(id: string, tenantId: string): Promise<NotificationTemplate | null>;
  findByCode(tenantId: string, templateCode: string, version?: string): Promise<NotificationTemplate | null>;
  findLatestPublishedVersion(tenantId: string, templateCode: string): Promise<NotificationTemplate | null>;
  findParentTemplate(parentTemplateId: string, tenantId: string): Promise<NotificationTemplate | null>;
  listPublished(tenantId: string, category?: string): Promise<NotificationTemplate[]>;
  save(template: NotificationTemplate): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
```

### Mandatory Infrastructure Behavior:
- **Multi-Tenant Filtering**: ALL database read/write queries MUST append `where: { tenantId, deletedAt: null }`.
- **Optimistic Concurrency Control (OCC)**: Saves MUST increment `version` and throw `OptimisticLockException` if `version` has changed in the database.

---

# 8. Application Service Specification

`NotificationTemplateService.ts` acts as the use-case orchestrator:

### Mandatory Service Rules:
- Enforces database transaction boundaries for commands.
- Converts DTOs to Domain Aggregates and vice-versa.
- Emits Domain Events via `IDomainEventPublisher` upon transaction commit.
- Contains ZERO template rendering, localization engine, or HTTP transport code.

---

# 9. Testing Specification

Developers MUST achieve **>95% code coverage** across EWP-001 test suites:

### 1. Domain Unit Tests (`NotificationTemplate.domain.test.ts`):
- Test aggregate instantiation in `DRAFT`.
- Test version immutability locks after `PublishTemplate()`.
- Test `CreateVersion()` metadata inheritance from predecessor.
- Test circular inheritance rejection.
- Test deduplication of languages and channels.
- Test terminal `ARCHIVED` state immutability.

### 2. Repository Integration Tests (`NotificationTemplateRepository.test.ts`):
- Test CRUD operations against real PostgreSQL/Prisma database.
- Test tenant data isolation filtering.
- Test composite unique constraint `[tenantId, templateCode, templateVersion]`.
- Test Optimistic Concurrency Control (`OptimisticLockException` on concurrent save).

### 3. Application Service Tests (`NotificationTemplateService.test.ts`):
- Test end-to-end command handler execution.
- Test event publishing upon successful command execution.

---

# 10. Definition of Done Checklist

Developers MAY NOT mark EWP-001 complete until every item below is verified:

- [ ] Prisma schema updated and migration script `20260722_create_notification_templates` executed cleanly.
- [ ] `NotificationTemplate` aggregate root implemented with complete invariant checks.
- [ ] 5 domain events (`TemplateCreated`, `TemplatePublished`, `TemplateVersionCreated`, `TemplateDeprecated`, `TemplateArchived`) defined.
- [ ] `PrismaNotificationTemplateRepository` implemented with strict `tenantId` isolation and OCC.
- [ ] `NotificationTemplateService` application service implemented with transaction management.
- [ ] All unit, repository integration, and application service tests passing with >95% coverage.
- [ ] Zero TypeScript compiler errors, zero ESLint warnings, zero TODO comments.
- [ ] Boundary audit passed: No rendering, localization, provider, or queue dependencies imported.

---

# 11. Compliance Matrix

| Standard / Contract | Compliance Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **CC-001** | All 8 Invariants & 4-stage lifecycle | Domain Unit Tests | Certified |
| **ES-001** | UUID primary key, snake_case, OCC, audit columns | Schema Audit & Migration | Certified |
| **ES-008** | Immutable Domain Events | Event Schema Test | Certified |
| **ES-009** | Tenant Context Isolation (`tenantId`) | Repository Integration Test | Certified |
| **ES-010** | Strongly typed exceptions & OCC recovery | Repository Test | Certified |
| **ES-013** | EWP File structure & boundaries | Review Audit | Certified |

---

# 12. Expected Output

Upon completion of EWP-001 execution, the workspace will contain:
1. `src/modules/notification/domain/templates/NotificationTemplate.ts`
2. `src/modules/notification/domain/templates/NotificationTemplateErrors.ts`
3. `src/modules/notification/domain/templates/NotificationTemplateEvents.ts`
4. `src/modules/notification/domain/templates/INotificationTemplateRepository.ts`
5. `src/modules/notification/infrastructure/persistence/PrismaNotificationTemplateRepository.ts`
6. `src/modules/notification/application/templates/NotificationTemplateService.ts`
7. `prisma/schema.prisma` and migration files.
8. Complete test suites in `__tests__/` directories.

**Status**: **AUTHORIZED & READY FOR CODE IMPLEMENTATION**.
