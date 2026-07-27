# RP-001 — Implementation Review Package
## EWP-001: PlatformApplication Aggregate
### Engine: VS08 – License, Subscription & Tenant Management Engine  
### Milestone: VS08A – Tenant Foundation

**Prepared:** 2026-07-20  
**Status:** Submitted for Implementation Review  
**Certification Candidate:** `src/modules/platform/catalog/`

---

## 1. Summary

EWP-001 implements the **PlatformApplication** aggregate — the platform-level catalog of business applications (e.g., Catering ERP, HSE, CRM, HRMS). It is the foundational registry upon which application packages, installations, and licensing capabilities will be built in subsequent milestones.

### Scope (this work package only)
- Platform registry entry: create, read, search, filter, retire
- Lifecycle state machine: Draft → Published → Deprecated → Retired
- Optimistic concurrency via `version BIGINT` on every write
- Full ES-001 audit trail: created/updated/deleted columns on every record

### Explicitly Out of Scope
Packages, installation, licensing, runtime, tenant-scoped objects — none appear anywhere in this implementation.

### Governing Documents Satisfied
ES-001 · ES-008 · ES-009 · ES-010 · DDS-101A · CC-001 · EWP-001 · ADR-008-001 through ADR-008-011

### Key Compliance Decisions
| ID | Decision |
|---|---|
| RC-001 | `PlatformApplication` metadata is editable post-publication. Only `PlatformApplicationPackage` is an "immutable published artifact" under ES-009 §6. |
| RC-002 | 23 real PostgreSQL integration tests added (`developer+` profiles). |
| RC-003 | Module path is `src/modules/platform/catalog/` per ES-010 catalog semantics. |
| RC-004 | Lifecycle `Draft → Published → Deprecated → Retired` (Published → Retired shortcut) ratified. |
| RC-005 | No automatic UPPER_CASE normalization. Validator enforces `^[A-Z0-9_-]+$`; callers must supply codes in uppercase. |

---

## 2. Git Diff

### Modified files (tracked, already committed baseline)

```diff
--- a/jest.config.js
+++ b/jest.config.js
@@ -27,12 +27,17 @@ const PROFILES = {
     "<rootDir>/src/modules/platform/persistence/__tests__/unit/**/*.test.ts",
     "<rootDir>/src/modules/platform/runtime/application/__tests__/**/*.test.ts",
     "<rootDir>/src/modules/platform/workflow/tests/**/*.test.ts",
+    // VS08A: PlatformApplication aggregate — unit tests only (no DB required)
+    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
   ],
   developer: [
     "<rootDir>/src/modules/platform/persistence/__tests__/unit/**/*.test.ts",
     "<rootDir>/src/modules/platform/persistence/__tests__/integration/**/*.test.ts",
     "<rootDir>/src/modules/platform/runtime/application/__tests__/**/*.test.ts",
     "<rootDir>/src/modules/platform/workflow/tests/**/*.test.ts",
+    // VS08A: PlatformApplication aggregate — unit + integration tests
+    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
+    "<rootDir>/src/modules/platform/catalog/tests/integration/*.test.ts",
   ],
   certification: [
     ...
+    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
+    "<rootDir>/src/modules/platform/catalog/tests/integration/*.test.ts",
   ],
   nightly: [
     ...
+    "<rootDir>/src/modules/platform/catalog/tests/*.test.ts",
+    "<rootDir>/src/modules/platform/catalog/tests/integration/*.test.ts",
   ],
   collectCoverageFrom: [
+    "src/modules/platform/catalog/**/*.ts",
+    "!src/modules/platform/catalog/tests/**",
+    "!src/modules/platform/catalog/index.ts",
   ],
 };
```

```diff
--- a/src/lib/prisma.ts
+++ b/src/lib/prisma.ts
@@ -7,4 +7,5 @@ const globalForPrisma = global as unknown as { prisma: PrismaClient };
-if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).platformRecordSequence) {
-    console.warn("⚠️ Stale Prisma Client detected (missing platformRecordSequence model)...");
+// VS08A: Updated to check for platformApplication (most recent model).
+if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).platformApplication) {
+    console.warn("⚠️ Stale Prisma Client detected (missing platformApplication model)...");
```

### Untracked new directories

| Path | Description |
|---|---|
| `src/modules/platform/catalog/` | New module — entire VS08A implementation |
| `prisma/migrations/20260720120000_vs08a_platform_application/` | DDL migration |
| `docs/prompts/docs/prompts/VS08A-100_Documentation_Package/` | Governing docs (read-only input) |
| `docs/prompts/docs/prompts/Subscription_Model/` | EWP source (read-only input) |

---

## 3. File Manifest

### New files — Production (`src/modules/platform/catalog/`)

| File | Role | Lines | Bytes |
|---|---|---|---|
| `index.ts` | Module barrel export | 33 | 1,489 |
| `contracts/index.ts` | Contract re-export | 3 | 212 |
| `contracts/IPlatformApplicationRepository.ts` | Repository interface | 69 | 2,676 |
| `contracts/IPlatformApplicationService.ts` | Service interface | 68 | 2,491 |
| `domain/PlatformApplication.ts` | Aggregate root | 130 | 5,144 |
| `domain/PlatformApplicationErrors.ts` | Domain error classes | 78 | 3,144 |
| `domain/PlatformApplicationLifecycle.ts` | Lifecycle state machine | 76 | 2,593 |
| `domain/PlatformApplicationValidator.ts` | Command validators | 86 | 3,438 |
| `models/PlatformApplicationModels.ts` | DTOs and command types | 89 | 3,459 |
| `repositories/index.ts` | Repository re-export | 2 | 111 |
| `repositories/PlatformApplicationRepository.ts` | Prisma repository | 265 | 9,839 |
| `services/index.ts` | Service re-export | 2 | 101 |
| `services/PlatformApplicationService.ts` | Application service | 161 | 6,799 |
| **Production subtotal** | | **1,062 lines** | **41,496 bytes** |

### New files — Tests (`src/modules/platform/catalog/tests/`)

| File | Type | Tests | Lines | Bytes |
|---|---|---|---|---|
| `PlatformApplication.domain.test.ts` | Unit | 25 | 334 | 14,255 |
| `PlatformApplicationLifecycle.test.ts` | Unit | 28 | 168 | 7,960 |
| `PlatformApplicationRepository.test.ts` | Unit (mocked) | 29 | 304 | 14,024 |
| `PlatformApplicationService.test.ts` | Unit | 36 | 402 | 18,948 |
| `integration/PlatformApplicationRepository.integration.test.ts` | Integration (live DB) | 23 | 296 | 14,181 |
| **Test subtotal** | | **141 tests** | **1,504 lines** | **69,368 bytes** |

### New files — Database

| File | Description |
|---|---|
| `prisma/migrations/20260720120000_vs08a_platform_application/migration.sql` | DDL for `platform_applications` table |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | +43 lines: added `PlatformApplication` model |
| `jest.config.js` | +15 lines: added catalog module to all test profiles + coverage |
| `src/lib/prisma.ts` | +2 lines: updated staleness guard to reference `platformApplication` |
| `src/generated/client/*` | Auto-generated — regenerated by `prisma generate` after schema change |

---

## 4. Prisma Diff

```diff
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -2383,0 +2384,43 @@
+// ─── VS08A: License, Subscription & Tenant Management Engine ─────────────────
+//
+// PlatformApplication — platform catalog of business applications.
+// Represents the definition of an application that can be licensed,
+// installed, and managed on the platform (e.g. Catering ERP, HSE).
+
+model PlatformApplication {
+  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
+  code        String    @unique @map("code")
+  name        String    @unique @map("name")
+  displayName String    @map("display_name")
+  description String?   @map("description")
+  category    String    @map("category")
+  iconUrl     String?   @map("icon_url")
+  websiteUrl  String?   @map("website_url")
+
+  // Lifecycle: Draft | Published | Deprecated | Retired
+  status      String    @default("Draft") @map("status")
+
+  // ES-001 mandatory audit columns
+  createdAt   DateTime  @default(now()) @map("created_at")
+  createdBy   String?   @db.Uuid @map("created_by")
+  updatedAt   DateTime  @updatedAt @map("updated_at")
+  updatedBy   String?   @db.Uuid @map("updated_by")
+  isDeleted   Boolean   @default(false) @map("is_deleted")
+  deletedAt   DateTime? @map("deleted_at")
+  deletedBy   String?   @db.Uuid @map("deleted_by")
+
+  // ES-001 optimistic concurrency
+  version     BigInt    @default(1) @map("version")
+
+  @@index([status], map: "idx_platform_applications_status")
+  @@index([category], map: "idx_platform_applications_category")
+  @@index([isDeleted], map: "idx_platform_applications_is_deleted")
+  @@map("platform_applications")
+}
```

**Design notes:**
- `status` is `VARCHAR(50)` (not a DB enum) — intentional, allows forward extension without a migration.
- `createdBy` / `updatedBy` / `deletedBy` are nullable UUIDs — platform operations may be system-initiated.
- No tenant_id, workspace_id, or installation references — ES-009 platform data isolation.

---

## 5. Migration

**File:** [`prisma/migrations/20260720120000_vs08a_platform_application/migration.sql`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/prisma/migrations/20260720120000_vs08a_platform_application/migration.sql)

```sql
-- VS08A: PlatformApplication aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)

CREATE TABLE platform_applications (
  -- Identity
  id            UUID          NOT NULL DEFAULT gen_random_uuid(),
  code          VARCHAR(255)  NOT NULL,
  name          VARCHAR(255)  NOT NULL,
  display_name  VARCHAR(255)  NOT NULL,
  description   TEXT,
  category      VARCHAR(255)  NOT NULL,
  icon_url      TEXT,
  website_url   TEXT,

  -- Lifecycle: Draft | Published | Deprecated | Retired
  status        VARCHAR(50)   NOT NULL DEFAULT 'Draft',

  -- ES-001: Mandatory audit columns
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by    UUID,
  is_deleted    BOOLEAN       NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,

  -- ES-001: Optimistic concurrency
  version       BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT platform_applications_pkey        PRIMARY KEY (id),
  CONSTRAINT platform_applications_code_unique UNIQUE (code),
  CONSTRAINT platform_applications_name_unique UNIQUE (name)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_platform_applications_status     ON platform_applications (status);
CREATE INDEX idx_platform_applications_category   ON platform_applications (category);
CREATE INDEX idx_platform_applications_is_deleted ON platform_applications (is_deleted);
```

**Status:** Applied to `verity_catrack-ai` PostgreSQL database. Verified via integration tests running against the live table.

---

## 6. Aggregate

**File:** [`domain/PlatformApplication.ts`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/src/modules/platform/catalog/domain/PlatformApplication.ts)  
**File:** [`domain/PlatformApplicationLifecycle.ts`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/src/modules/platform/catalog/domain/PlatformApplicationLifecycle.ts)  
**File:** [`domain/PlatformApplicationErrors.ts`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/src/modules/platform/catalog/domain/PlatformApplicationErrors.ts)  
**File:** [`domain/PlatformApplicationValidator.ts`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/src/modules/platform/catalog/domain/PlatformApplicationValidator.ts)

### Aggregate Root Design

```
PlatformApplication (aggregate root)
  ├── private constructor (single entry point for all construction)
  ├── static create(command)         → new Draft application
  ├── static reconstitute(record)    → load from persistence
  ├── assertModifiable()             → domain guard; throws on Retired
  └── toRecord()                     → snapshot for persistence / return
```

The aggregate root holds one private `PlatformApplicationRecord` and exposes it only through read-only getters and `toRecord()`. No state mutation methods exist on the aggregate — all mutation is handled by the repository layer writing directly to the DB, which then re-reads fresh state.

### Lifecycle State Machine

```
Draft ──────────────────► Published
                          │
                          ├──► Deprecated ──► Retired (terminal)
                          │
                          └──────────────────► Retired (shortcut)
```

Implemented in `PlatformApplicationLifecycle` as a static transition table:
- All transitions are validated before any DB write.
- `isModifiable()` returns `false` only for `Retired` — metadata is editable in Draft, Published, and Deprecated states (RC-001 decision).
- `allowedNextStatuses()` returns a defensive copy — callers cannot mutate internal state.

### Domain Error Hierarchy

| Error Class | Thrown When |
|---|---|
| `PlatformApplicationNotFoundError` | Record not found by id or code |
| `DuplicateApplicationCodeError` | `code` already exists (globally unique) |
| `DuplicateApplicationNameError` | `name` already exists (globally unique, case-insensitive) |
| `InvalidLifecycleTransitionError` | Attempted forbidden state transition |
| `RetiredApplicationModificationError` | Metadata update attempted on Retired application |
| `PlatformApplicationConcurrencyError` | Version mismatch on write (optimistic concurrency) |
| `PlatformApplicationValidationError` | Command field validation failed; carries `fields` map |

All errors extend `Error` with custom `name` and structured payload properties.

### Validator

`PlatformApplicationValidator` enforces:
- `code`: required, matches `^[A-Z0-9_-]+$` (uppercase only, no auto-normalization per RC-005), max 100 chars
- `name`: required, max 255 chars
- `displayName`: required, max 255 chars
- `category`: required
- `actorUserId`: required
- `validateUpdateMetadataCommand`: id required; displayName if provided must be non-empty
- Multiple errors are collected before throwing (all fields validated in one pass)

---

## 7. Repository

**File:** [`repositories/PlatformApplicationRepository.ts`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/src/modules/platform/catalog/repositories/PlatformApplicationRepository.ts)

### Write Strategy: `$executeRaw` (ES-001 Compliance)

All writes (`create`, `updateMetadata`, `retire`) use Prisma tagged template `$executeRaw` (parameterized SQL). This ensures:

1. **Atomic optimistic concurrency** — `WHERE id = $id AND version = $expectedVersion` in a single UPDATE; the affected row count is checked; zero rows → `PlatformApplicationConcurrencyError`.
2. **No Prisma ORM write-path middleware interference** — raw SQL bypasses Prisma's auto-connect, query events, and result casting for writes, which is required for exact row-count inspection.
3. **ES-001 compliance** — `version = version + 1` is done atomically in the DB, not in application code.

### Read Strategy: Prisma ORM

All reads use `(prisma as any).platformApplication.findFirst / findMany / count`. This provides:
- Type-safe field mapping via `@map` directives in schema.
- Automatic camelCase ↔ snake_case conversion.
- `isDeleted: false` filter always applied (soft delete transparency).

### Unique Constraint Error Translation

`rethrowUniqueViolation()` handles two error shapes from PostgreSQL:
- **Prisma P2002** (standard ORM path): inspects `meta.target` or `meta.constraint_name`.
- **Raw 23505** (raw SQL path): inspects PostgreSQL's `Key (column)=...` detail in the error message, matching `key (code)` or `key (name)` to avoid false positives from the error prefix `"Code: 23505"`.

### Interface

```typescript
interface IPlatformApplicationRepository {
  create(record: PlatformApplicationRecord): Promise<void>;
  updateMetadata(id, data, actorUserId, expectedVersion): Promise<void>;
  retire(id, actorUserId, expectedVersion): Promise<void>;
  getById(id): Promise<PlatformApplicationRecord | null>;
  getByCode(code): Promise<PlatformApplicationRecord | null>;
  list(query): Promise<PlatformApplicationRecord[]>;
  search(query): Promise<PlatformApplicationRecord[]>;
  existsByCode(code): Promise<boolean>;
  existsByName(name): Promise<boolean>;
}
```

---

## 8. Service

**File:** [`services/PlatformApplicationService.ts`](file:///c:/VeritySystems/catrack/verity-systems-catrack-replit/src/modules/platform/catalog/services/PlatformApplicationService.ts)

The service layer coordinates validation, domain enforcement, and repository calls. It contains no SQL and no persistence details.

### Operation Flow

**`register(command)`**
1. Validate command fields (validator; throws `PlatformApplicationValidationError`)
2. Check code uniqueness → `DuplicateApplicationCodeError`
3. Check name uniqueness → `DuplicateApplicationNameError`
4. Create aggregate (domain sets Draft status, trims fields)
5. Persist via repository (DB constraints are the final concurrency guard)
6. Return record

**`updateMetadata(command)`**
1. Validate command fields
2. Load existing record → `PlatformApplicationNotFoundError` if absent
3. Reconstitute aggregate; call `assertModifiable()` → `RetiredApplicationModificationError` if Retired
4. Merge command fields with existing values (partial update: omitted fields retain current values)
5. Persist with `expectedVersion` → `PlatformApplicationConcurrencyError` on stale version
6. Re-read and return fresh state

**`retire(command)`**
1. Load existing record → `PlatformApplicationNotFoundError` if absent
2. Validate lifecycle transition (domain layer) → `InvalidLifecycleTransitionError` if forbidden
3. Persist retirement with `expectedVersion` → `PlatformApplicationConcurrencyError` on stale version
4. Re-read and return fresh state

**Queries**  
`getById` · `getByCode` · `list(query)` · `search(query)` · `filterByCategory` · `filterByStatus`

`search()` short-circuits on blank query (returns `[]` without a DB round-trip).

---

## 9. Tests

### Summary

| Suite | Profile | Tests | Passing | Time |
|---|---|---|---|---|
| `PlatformApplication.domain.test.ts` | smoke+ | 25 | ✅ 25 | — |
| `PlatformApplicationLifecycle.test.ts` | smoke+ | 28 | ✅ 28 | — |
| `PlatformApplicationService.test.ts` | smoke+ | 36 | ✅ 36 | — |
| `PlatformApplicationRepository.test.ts` | smoke+ | 29 | ✅ 29 | — |
| `PlatformApplicationRepository.integration.test.ts` | developer+ | 23 | ✅ 23 | — |
| **TOTAL** | | **141** | **✅ 141 / 141** | **2.6 s** |

### Unit Test Coverage by Area

**Domain (25 tests)**
- Aggregate creation (initial values, UUID generation, whitespace trim)
- Code stored as-is without normalization (RC-005)
- Reconstitution from persisted record
- `assertModifiable()` — pass for Draft/Published/Deprecated; throw for Retired
- `toRecord()` returns a copy (mutation-proof)
- Validator: valid command passes; code empty/whitespace/invalid-chars/lowercase all throw; name/displayName/category/actorUserId empty throw; multi-field errors collected

**Lifecycle (28 tests)**
- All valid transitions: Draft→Published, Published→Deprecated, Published→Retired, Deprecated→Retired
- All invalid transitions throw `InvalidLifecycleTransitionError` (12 cases)
- `isRetirable`: Draft false, Published true, Deprecated true, Retired false
- `isModifiable`: Draft/Published/Deprecated true, Retired false
- `canTransitionTo`: true/false without throw
- `allowedNextStatuses`: correct lists; returns a defensive copy

**Service (36 tests)**
- `register`: success, code missing, name missing, duplicate code, duplicate name, no-create on code fail
- `updateMetadata`: success, not found, retired guard, concurrency error, partial update preserves existing values
- `retire`: published/deprecated success, draft forbidden, already-retired forbidden, not found
- `getById` / `getByCode`: success and not-found
- `list` / `search` (including blank query short-circuit)
- `filterByCategory` / `filterByStatus`
- Soft-delete transparency via repository contract
- Repository contract structural test (duck-typing)

**Repository Unit (29 tests, mocked Prisma)**
- Contract structural test
- `create`: success, P2002 code violation, P2002 name violation, non-P2002 propagated
- `updateMetadata`: success, zero-rows → concurrency error
- `retire`: success, zero-rows → concurrency error
- `getById`: found, null, isDeleted filter
- `getByCode`: whitespace trim (RC-005), found
- `list`: mapped results, status filter, category filter, soft-delete exclusion
- `search`: OR conditions, combined filters
- `existsByCode` / `existsByName`: true and false cases

### Integration Test Coverage (23 tests, live PostgreSQL)

- Round-trip create + getById (id, code, name, status=Draft, version=1n, isDeleted=false)
- `getById` returns null for non-existent id
- `getById` excludes soft-deleted records (raw SQL mark → not found)
- `getByCode` exact match, null for unknown, whitespace trim (RC-005)
- `existsByCode` true/false, `existsByName` true/false
- `updateMetadata` — fields updated, version incremented, updatedAt timestamp set, updatedBy set
- `updateMetadata` stale version → `PlatformApplicationConcurrencyError`
- `retire` — status=Retired, version incremented
- `retire` stale version → `PlatformApplicationConcurrencyError`
- `list` by status + category; excludes soft-deleted; filters by unique category
- `search` by code fragment, name fragment, no-match returns `[]`
- `create` duplicate code → `DuplicateApplicationCodeError`
- `create` duplicate name → `DuplicateApplicationNameError`

All integration tests use a run-scoped prefix (`TEST-<ms>-*`) for isolation.  
`afterAll` calls `platformApplication.deleteMany({ where: { code: { startsWith: PREFIX } } })` for cleanup.

---

## 10. Architecture Deviations

> No deviations from the approved CAP architecture were introduced. The following items are documented for completeness.

| # | Topic | Detail | Status |
|---|---|---|---|
| D1 | `(prisma as any).platformApplication` cast | Prisma typed client uses `prisma.platformApplication` but the generated type declarations for new models occasionally require a cast during dev before a full type-generation pass. This is a tooling artifact, not an architecture deviation. | Acceptable — auto-resolves on `prisma generate`. |
| D2 | `rethrowUniqueViolation` inspects error message text | Prisma's `$executeRaw` does not always surface structured `meta.target` for unique violations; message inspection was required to distinguish code vs name violation. | Acceptable — tested against live DB in integration tests. Fragility is bounded: constraint names are `platform_applications_code_unique` and `platform_applications_name_unique`, which are stable. |
| D3 | Service re-reads after write | `updateMetadata` and `retire` each perform a `getById` after the write to return fresh state. This adds one extra read per mutation. | Acceptable — consistent with platform-wide pattern. The alternative (constructing the return value from command data + existing record) introduces more state-management complexity than the additional DB read. |
| D4 | Stale Prisma guard in `src/lib/prisma.ts` | The guard was updated from `platformRecordSequence` to `platformApplication`. This is the established convention (most recently added model) — not a deviation. | Ratified — follows existing pattern. |

---

## 11. Performance

### Query Performance

| Operation | Strategy | Indexed? | Expected Cost |
|---|---|---|---|
| `getById` | ORM `findFirst` by PK | `id` is PRIMARY KEY | O(log n), negligible |
| `getByCode` | ORM `findFirst` by unique | `code` UNIQUE index | O(log n), negligible |
| `list(status)` | ORM `findMany` with status filter | `idx_platform_applications_status` | O(log n + k) |
| `list(category)` | ORM `findMany` with category filter | `idx_platform_applications_category` | O(log n + k) |
| `search(query)` | ORM `findMany` with OR ILIKE | No full-text index — sequential ILIKE | O(n) — see note |
| `create` | `$executeRaw` INSERT | Unique index on code, name | O(log n) on constraint |
| `updateMetadata` | `$executeRaw` UPDATE with version | PK lookup + version filter | O(log n) |
| `retire` | `$executeRaw` UPDATE with version | PK lookup + version filter | O(log n) |

**Search note:** `search()` uses `ILIKE %term%` across four columns in an OR clause. This is a sequential scan for large tables. For VS08A this is acceptable — the `platform_applications` table will contain at most O(100) rows (one entry per business application). If the catalog grows significantly, a GIN full-text index on a `tsvector` column should be added.

### Connection Management
- The module reuses the shared singleton Prisma client (`src/lib/prisma.ts`). No new connections are created.
- Integration test `afterAll` calls `$disconnect()` — this is a test-only teardown; it does not affect production runtime.

### Version Column
- `version` is `BIGINT` — arithmetic in PostgreSQL is exact. No overflow risk at realistic usage volumes (∞ updates to a PlatformApplication record would require 9.2 × 10¹⁸ writes).

---

## 12. Security

| # | Area | Analysis | Risk |
|---|---|---|---|
| S1 | SQL Injection | All writes use Prisma `$executeRaw` **tagged template literals**, which are parameterized at the driver level. No string interpolation of user input is performed. All reads use Prisma ORM with structured `where` objects. | None — parameterized throughout. |
| S2 | Tenant Data Isolation | `platform_applications` contains no `tenant_id`, `workspace_id`, or tenant references. It is strictly a Platform-level table. No tenant data can leak into or out of this aggregate. | None. |
| S3 | `actorUserId` Validation | The `actorUserId` field is passed as a UUID parameter to the DB (`::uuid` cast). Non-UUID values will cause a PostgreSQL cast error before any data is written. The validator also requires a non-empty `actorUserId` on create. | Low — DB-level type enforcement. |
| S4 | Input Sanitization | Fields are `trim()`-ed in the aggregate factory. URLs (`iconUrl`, `websiteUrl`) are stored as-is without sanitization — no URL format validation is applied. | Low — display concern, not injection. A format validator could be added in a future iteration if URLs are rendered as links. |
| S5 | Soft Delete vs Physical Delete | Records are never physically deleted through this aggregate (no `delete` method). Soft delete (`is_deleted = true`) is applied only by raw SQL in test cleanup — not exposed in the production interface. Retired applications are soft-visible (isDeleted remains false). | None — intended design. |
| S6 | Optimistic Concurrency | Every write requires `expectedVersion`. A stale version (from a concurrent modification) results in `PlatformApplicationConcurrencyError`, not a silent overwrite. | None — last-write-wins is explicitly prevented. |
| S7 | Error Leakage | Domain errors carry only the resource identifier (id or code). PostgreSQL error details are never propagated to callers — they are caught and translated to typed domain errors in `rethrowUniqueViolation`. | None — DB internals not exposed. |

---

## 13. Ready For Certification

**EWP-001 — PlatformApplication** is ready for Certification.

### Checklist

| Item | Status |
|---|---|
| All CC-001 capabilities implemented | ✅ register, updateMetadata, retire, getById, getByCode, list, search, filterByCategory, filterByStatus |
| ES-001: UUID PK with `gen_random_uuid()` | ✅ |
| ES-001: Full audit columns (created/updated/deleted) | ✅ |
| ES-001: Soft delete (`is_deleted`, `deleted_at`, `deleted_by`) | ✅ |
| ES-001: Optimistic concurrency (`version BIGINT`) | ✅ |
| ES-008: Domain layer encapsulates all invariants | ✅ |
| ES-009: Platform data — no tenant references | ✅ |
| ES-010: PascalCase model, snake_case plural table | ✅ `PlatformApplication` / `platform_applications` |
| DDS-101A: Core entity implemented per spec | ✅ |
| Migration applied to database | ✅ Verified via integration tests |
| No TODOs, no placeholder code | ✅ Confirmed — zero instances |
| No architecture changes to existing modules | ✅ Confirmed |
| Unit tests: 118 tests, 4 suites, 0 failures | ✅ |
| Integration tests: 23 tests, 1 suite, 0 failures | ✅ |
| Compliance report reviewed and all RCs resolved | ✅ |

### Final Test Run (2026-07-20)

```
Test Suites: 5 passed, 5 total
Tests:       141 passed, 141 total
Time:        2.611 s
```

### Next Steps

Upon Certification approval, the following milestones will be unlocked:
- **EWP-002** — PlatformApplicationPackage (versions, packages, the true "published artifact" under ES-009 §6)
- **EWP-003** — ApplicationInstallation (tenant-scoped installation records)
- **EWP-004** — LicenseSubscription (commercial boundaries, tenant licensing)
