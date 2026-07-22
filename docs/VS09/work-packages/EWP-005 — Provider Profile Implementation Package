# EWP-005 — Provider Profile Implementation Package

| Field | Value |
| :--- | :--- |
| **Work Package ID** | EWP-005 |
| **Title** | Provider Profile Implementation Package |
| **Engine** | VS09 – Communication & Notification Engine |
| **Target Capability**| CC-005 — Provider Profile |
| **Phase** | Engineering Work Package (Implementation Specification) |
| **Status** | Ready for Implementation |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing Reviews** | AFR-001 (Architecture Freeze), CFR-001 (Contract Freeze) |

---

# 1. Purpose

This Engineering Work Package (**EWP-005**) provides the technical implementation specification for building the **`ProviderProfile`** aggregate root (`Medium Aggregate`), domain errors, domain events, persistence schema, repository layer, application service, and test suites in the **VS09 Communication & Notification Engine**.

The objective of EWP-005 is to deliver a production-ready, fully tested, ES-001 database-compliant, multi-tenant provider registration aggregate that satisfies all specifications in **Capability Contract CC-005** and governing architectural decision records (**ADR-009-001 through ADR-009-004**).

---

# 2. Inputs & Governing Artifacts

All software engineering work in EWP-005 must adhere strictly to the following governing inputs:

| Artifact ID | Title | Governed Scope |
| :--- | :--- | :--- |
| **AFR-001** | VS09 Architecture Freeze Review | Overall Engine Architecture Freeze |
| **CFR-001** | VS09 Capability Contract Freeze Review | Capability Specification Freeze |
| **CC-005** | Provider Profile Capability Contract | Business Contract, Invariants, Commands & Queries |
| **ADR-009-001** | Communication Delivery Model | Provider Integration & Ingestion Boundaries |
| **ADR-009-002** | Channel & Provider Abstraction | Abstract Provider Metadata & Capability Models |
| **ADR-009-003** | Template Resolution & Personalization | Provider Capability Matching Specifications |
| **ADR-009-004** | Queue, Retry & Delivery Tracking | Provider Circuit Breakers & Failure Isolation |
| **ES-001** | Database & Persistence Governance Standard | Table Schema, Data Types, OCC & Auditing Rules |
| **ES-008** | Asynchronous Integration & Event Messaging | Domain Event Schemas & Messaging Integration |
| **ES-009** | Multi-Tenant Data Isolation Standard | Tenant Context Partitioning & Data Filtering |
| **ES-010** | System Resilience & Fault Tolerance | Error Handling, Validation & OCC Conflict Recovery |
| **ES-013** | Engine Architecture Governance Standard | Engineering Work Package Governance |

---

# 3. Scope Boundary

### In-Scope Implementation:
- **Domain Layer**: `ProviderProfile` aggregate root (`Medium Aggregate`), domain invariants, domain commands, aggregate lifecycle state machine (`Configured` $\rightarrow$ `Active` $\rightarrow$ `Disabled` $\rightarrow$ `Retired`), domain validation rules, and domain event definitions (`ProviderRegistered`, `ProviderEnabled`, `ProviderDisabled`, `ProviderRetired`, `ProviderHealthUpdated`, `DefaultProviderChanged`).
- **Persistence Layer**: Database schema migration (`prisma/schema.prisma`), `provider_profiles` table definition, indexes, foreign keys, audit timestamps, and OCC version counter.
- **Infrastructure Layer**: `IProviderProfileRepository` interface and `PrismaProviderProfileRepository` implementation with tenant isolation enforcement.
- **Application Layer**: `ProviderProfileService` command/query handlers and transaction boundaries.
- **Testing**: Unit tests for domain logic, integration tests for Prisma repositories, application service orchestrations, capability metadata tests, and regression suites.

### Out-of-Scope (Handled by Other Infrastructure / Services):
- **Concrete Provider Transport Adapters**: Physical network transport code for SendGrid, Twilio, Microsoft Graph, Firebase (ADR-009-002).
- **HTTP Clients & REST Driver SDKs**: Third-party vendor SDK imports strictly forbidden in domain/application layer.
- **OAuth Authentication & API Key Storage**: Secrets managed by platform Key Vault / Security Engine (ES-001).
- **SMTP & Socket Clients**: Network transport drivers isolated in infrastructure transport adapters.
- **Queue Workers & Dispatch Executions**: Managed by worker queues in EWP-003 / EWP-004.
- **Background Health Monitoring Services**: Active health-check ping loops executed by external monitoring services.

---

# 4. Deliverables & File Mapping

Developers implementing EWP-005 MUST create or update the following source code files:

| Layer | Target File Path | Description |
| :--- | :--- | :--- |
| **Domain Models** | `src/modules/notification/domain/providers/ProviderProfile.ts` | Aggregate Root implementation enforcing provider invariants & commands. |
| **Domain Errors** | `src/modules/notification/domain/providers/ProviderProfileErrors.ts` | Strongly typed domain exceptions (`DuplicateProviderCodeException`, etc.). |
| **Domain Events** | `src/modules/notification/domain/providers/ProviderProfileEvents.ts` | Immutable domain event definitions. |
| **Repository Interface**| `src/modules/notification/domain/providers/IProviderProfileRepository.ts` | Clean repository contract. |
| **Infrastructure Repository**| `src/modules/notification/infrastructure/persistence/PrismaProviderProfileRepository.ts` | Prisma ORM persistence implementation. |
| **Application Service**| `src/modules/notification/application/providers/ProviderProfileService.ts` | Use-case orchestration service. |
| **Persistence Schema**| `prisma/schema.prisma` | Table definition and indexes. |
| **Migration** | `prisma/migrations/20260722_create_provider_profiles/` | Database migration script. |
| **Domain Unit Tests** | `src/modules/notification/domain/providers/__tests__/ProviderProfile.domain.test.ts` | Unit tests for aggregate invariants & commands. |
| **Repository Tests** | `src/modules/notification/infrastructure/persistence/__tests__/ProviderProfileRepository.test.ts` | Integration tests for database persistence & OCC. |
| **Service Tests** | `src/modules/notification/application/providers/__tests__/ProviderProfileService.test.ts` | Application service use-case tests. |

---

# 5. Database Specification (ES-001 Compliance)

The database schema for `provider_profiles` must conform strictly to **ES-001**:

```prisma
model ProviderProfile {
  id                     String   @id @default(uuid()) @db.Uuid
  tenantId               String   @map("tenant_id") @db.Uuid
  workspaceId            String?  @map("workspace_id") @db.Uuid
  providerCode           String   @map("provider_code") @db.VarChar(100)
  providerName           String   @map("provider_name") @db.VarChar(255)
  description            String?  @map("description") @db.VarChar(1000)
  providerType           String   @map("provider_type") @db.VarChar(50)
  status                 String   @map("status") @db.VarChar(50)
  healthStatus           String   @default("HEALTHY") @map("health_status") @db.VarChar(50)
  priority               Int      @default(100) @map("priority")
  isDefault              Boolean  @default(false) @map("is_default")
  isEnabled              Boolean  @default(true) @map("is_enabled")
  supportedChannels      Json     @map("supported_channels")
  capabilityMetadata     Json     @map("capability_metadata")
  configurationMetadata  Json?    @map("configuration_metadata")
  
  // ES-001 Audit & Optimistic Concurrency Columns
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  createdBy              String   @map("created_by") @db.Uuid
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy              String   @map("updated_by") @db.Uuid
  deletedAt              DateTime? @map("deleted_at") @db.Timestamptz
  version                Int      @default(1) @map("version")

  @@unique([tenantId, providerCode], name: "uq_provider_tenant_code")
  @@index([tenantId], name: "idx_provider_tenant")
  @@index([tenantId, providerType], name: "idx_provider_tenant_type")
  @@index([tenantId, status], name: "idx_provider_tenant_status")
  @@index([tenantId, healthStatus], name: "idx_provider_tenant_health")
  @@index([tenantId, isEnabled], name: "idx_provider_tenant_enabled")
  @@map("provider_profiles")
}
```

### ES-001 Governance Rules:
- Primary key `id` is a UUID.
- Snake_case mapping for database columns (`@map("...")`).
- Composite unique index `[tenantId, providerCode]` enforces Business Identity uniqueness.
- OCC enforced via `@map("version")` integer column.
- Soft-delete supported via `deletedAt` timestamp column.

---

# 6. Domain Implementation Requirements

Developers implementing `ProviderProfile.ts` MUST satisfy all domain rules specified in **CC-005**:

### 1. Invariants & Boundary Enforcement:
- **Unique Provider Code**: Business Identity `(tenantId, providerCode)` MUST be unique per tenant.
- **Immutable Provider Type**: `providerType` (e.g., `SMTP`, `SENDGRID`, `TWILIO`, `GRAPH_API`, `FIREBASE`) is immutable after creation.
- **Single Default Provider Per Channel**: Setting `isDefault = true` for a channel MUST unset `isDefault` on all other providers supporting that channel within the tenant.
- **No Credentials / Zero Transport Dependencies**: `ProviderProfile` MUST NOT contain OAuth secrets, API passwords, or physical SDK transport code. Secrets are referenced by key reference only.
- **Supported Channels Integrity**: `supportedChannels` array MUST be deduplicated and contain valid `NotificationChannel` identity references.

### 2. State Machine Implementation:
State transitions MUST follow the 4-stage lifecycle:
- `RegisterProvider()` $\rightarrow$ State: `CONFIGURED`. Emits `ProviderRegistered`.
- `EnableProvider()` $\rightarrow$ Transition `CONFIGURED` / `DISABLED` $\rightarrow$ `ACTIVE`. Emits `ProviderEnabled`.
- `DisableProvider()` $\rightarrow$ Transition `ACTIVE` $\rightarrow$ `DISABLED`. Emits `ProviderDisabled`.
- `RetireProvider()` $\rightarrow$ Transition `DISABLED` / `ACTIVE` $\rightarrow$ `RETIRED` (terminal). Emits `ProviderRetired`.

---

# 7. Repository Specification

`IProviderProfileRepository.ts` and `PrismaProviderProfileRepository.ts` MUST implement the following methods:

```typescript
export interface IProviderProfileRepository {
  findById(id: string, tenantId: string): Promise<ProviderProfile | null>;
  findByCode(tenantId: string, providerCode: string): Promise<ProviderProfile | null>;
  findDefaultProvider(tenantId: string, channelId: string): Promise<ProviderProfile | null>;
  listEnabledProviders(tenantId: string): Promise<ProviderProfile[]>;
  listHealthyProviders(tenantId: string): Promise<ProviderProfile[]>;
  listByChannel(tenantId: string, channelId: string): Promise<ProviderProfile[]>;
  existsProviderCode(tenantId: string, providerCode: string): Promise<boolean>;
  save(provider: ProviderProfile): Promise<void>;
  clearOtherDefaults(tenantId: string, channelId: string, excludeProviderId: string): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
```

### Mandatory Infrastructure Behavior:
- **Multi-Tenant Isolation**: ALL queries MUST append `where: { tenantId, deletedAt: null }`.
- **Optimistic Concurrency Control (OCC)**: Saves MUST increment `version` and throw `OptimisticLockException` on concurrency conflict.

---

# 8. Application Service Specification

`ProviderProfileService.ts` acts as the use-case orchestrator:

### Handled Commands:
- `RegisterProvider`: Instantiates provider profile in `CONFIGURED`.
- `EnableProvider`: Activates provider for runtime dispatch.
- `DisableProvider`: Disables provider due to operational maintenance.
- `RetireProvider`: Decommissions provider profile permanently.
- `UpdateMetadata`: Updates display name, description, capability metadata, and configuration metadata.
- `SetDefault`: Marks provider as default for a target channel and invokes `clearOtherDefaults()`.
- `SetPriority`: Adjusts provider selection priority weighting.
- `UpdateHealthStatus`: Updates provider operational health (`HEALTHY`, `DEGRADED`, `UNHEALTHY`, `CIRCUIT_BROKEN`).

---

# 9. Testing Specification

Developers MUST achieve **>95% code coverage** across EWP-005 test suites:

### 1. Domain Unit Tests (`ProviderProfile.domain.test.ts`):
- Test aggregate registration in `CONFIGURED`.
- Test 4-stage lifecycle state machine transitions.
- Test immutable `providerType` validation.
- Test supported channels deduplication.
- Test terminal `RETIRED` state immutability.

### 2. Repository Integration Tests (`ProviderProfileRepository.test.ts`):
- Test CRUD operations against real PostgreSQL/Prisma database.
- Test tenant data isolation filtering (`tenantId`).
- Test composite unique constraint `[tenantId, providerCode]`.
- Test `clearOtherDefaults()` single-default enforcement across channel providers.
- Test OCC `OptimisticLockException` handling.

### 3. Application Service Tests (`ProviderProfileService.test.ts`):
- Test end-to-end command orchestration, health updates, and domain event publishing.

---

# 10. Dependency Verification

| Dependent System | Integration Status | Verification Notes |
| :--- | :--- | :--- |
| **Notification Channel (CC-002)** | **Required** | Provider supported channels reference channel IDs. |
| **Tenant Context** | **Required** | Multi-tenant isolation boundary (`tenantId`). |
| **Workspace Boundary** | **Required** | Operational workspace sub-partitioning (`workspaceId`). |
| **Metadata Engine** | **Required** | Operational capability schema definitions. |
| **Provider Adapter Infrastructure**| *Deferred* | Decoupled; transport code consumes `ProviderProfile` during selection. |
| **Queue Workers** | *Deferred* | Decoupled; worker dispatch queries healthy providers. |
| **Notification Delivery (CC-003)**| *Deferred* | Decoupled; delivery dispatches bind `providerId`. |
| **Delivery Tracking (CC-006)** | *Deferred* | Decoupled; tracking maps vendor receipts back to `providerId`. |

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

Developers MAY NOT mark EWP-005 complete until every item below is verified:

- [ ] Prisma schema updated for `provider_profiles`; migration script `20260722_create_provider_profiles` executed cleanly.
- [ ] `ProviderProfile` aggregate root implemented with complete invariant checks.
- [ ] 6 domain events (`ProviderRegistered`, `ProviderEnabled`, `ProviderDisabled`, `ProviderRetired`, `ProviderHealthUpdated`, `DefaultProviderChanged`) defined.
- [ ] `PrismaProviderProfileRepository` implemented with single-default enforcement, `tenantId` isolation, and OCC.
- [ ] `ProviderProfileService` application service implemented with transaction management.
- [ ] All unit, repository integration, health update, and service tests passing with >95% coverage.
- [ ] Zero TypeScript compiler errors, zero ESLint warnings, zero TODO comments.
- [ ] Boundary audit passed: No vendor transport SDKs (Twilio, SendGrid, Firebase), HTTP clients, or secrets imported.

---

# 13. Compliance Matrix

| Standard / Contract | Compliance Requirement | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **CC-005** | All 6 Invariants & 4-stage lifecycle | Domain Unit Tests | Certified |
| **ES-001** | UUID primary key, snake_case, OCC, audit columns | Schema Audit & Migration | Certified |
| **ES-008** | Immutable Domain Events | Event Schema Test | Certified |
| **ES-009** | Tenant Context Isolation (`tenantId`) | Repository Integration Test | Certified |
| **ES-010** | Strongly typed exceptions & OCC recovery | Repository Test | Certified |
| **ES-013** | EWP File structure & boundaries | Review Audit | Certified |

---

# 14. Expected Runtime Characteristics

| Metric / Aspect | Characteristic | Engineering Guidance |
| :--- | :--- | :--- |
| **Aggregate Size** | **`Medium Aggregate`** | Encapsulates capability metadata map and configuration metadata map. |
| **Expected Reads** | **Medium** | Query throughput during channel provider selection and health routing. |
| **Expected Writes** | **Low** | Writes occur during provider configuration and health status updates. |
| **Caching Policy** | **Allowed** | Caching supported for active provider profile metadata lookups. |
| **Partition Candidate** | **No** | Table size managed within standard database partitioning strategies. |
| **Archive Candidate** | **No** | Active registration ledger; low volume does not require archival. |

---

# 15. Expected Outputs

Upon completion of EWP-005 execution, the workspace will contain:
1. `src/modules/notification/domain/providers/ProviderProfile.ts`
2. `src/modules/notification/domain/providers/ProviderProfileErrors.ts`
3. `src/modules/notification/domain/providers/ProviderProfileEvents.ts`
4. `src/modules/notification/domain/providers/IProviderProfileRepository.ts`
5. `src/modules/notification/infrastructure/persistence/PrismaProviderProfileRepository.ts`
6. `src/modules/notification/application/providers/ProviderProfileService.ts`
7. `prisma/schema.prisma` and migration files.
8. Complete test suites in `__tests__/` directories.

**Status**: **AUTHORIZED & READY FOR CODE IMPLEMENTATION**.
