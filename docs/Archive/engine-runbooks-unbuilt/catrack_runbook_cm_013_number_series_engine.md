# Catrack Technical Runbook: CM-013 Number Series Engine
**Catrack ERP Platform Component Specification (CM-013)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-013`
*   **Component Name:** Number Series Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Thread-Safe Sequence Generation, Prefixing & Suffixing Configurations, Fiscal Year Resets, Branch & Company Sequences.
*   **Target Audience:** Enterprise Software Engineers, Database Architects, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-013` is to implement a centralized, thread-safe document numbering engine that generates sequential, formatted business keys (e.g., `INV-2026-0001`, `EVT-branch-002`) across all modules of the Catrack ERP platform.

### Functional Scope
*   **Thread-Safe Sequence Generation:** Generating sequential numbers without duplicate assignments under high concurrency.
*   **Format Compilation:** Compiling dynamic prefix, year, branch, and suffix formats.
*   **Fiscal Year Resets:** Automatically resetting sequences to 1 at the start of a new fiscal year.
*   **Scoped Sequences:** Partitioning sequences by company (`tenantId`) and branch (`branchId`).

---

## 3. Technical Architecture Expectations

The Number Series Engine must conform to the following architectural design:

```
                            SEQUENCE GENERATION FLOW
                            
                               Sequence Request (Entity Code)
                                         |
                                         v
                            +--------------------------+
                            |   Get Series Definition  |
                            |  (Verify active status)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Lock Series Record     |
                            | (SELECT FOR UPDATE lock) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Check Reset Rules      | --(New year/month)--> Reset current to 0
                            | (Verify fiscal/calendar) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            | Increment Sequence (DB)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Compile Format String   |
                            | (Apply prefix, pad zeros)|
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Commit & Release      |
                            +--------------------------+
                                         |
                                         v
                                  Returned Number
```

*   **Pessimistic Locking:** Sequence generation must use database row-level locking (e.g., `SELECT FOR UPDATE` in PostgreSQL) during the increment step to prevent duplicate numbers under high concurrency.
*   **Dynamic Padding:** Format engines must support padding settings (e.g., padding a sequence value of `5` with zeros to output `0005`).
*   **Format Tags:** Support placeholders within prefix and suffix templates:
    *   `{YYYY}`: Current 4-digit calendar year.
    *   `{YY}`: Current 2-digit calendar year.
    *   `{MM}`: Current 2-digit month.
    *   `{BRANCH}`: Scoped branch code.

---

## 4. Domain Model & Boundaries

The Number Series Engine manages these entities:

*   **NumberSeriesDefinition:** Stores sequence settings, formats, padding lengths, reset behaviors, and active statuses.
*   **NumberSeriesSequence:** Stores active sequence counts, years, and branch references.

---

## 5. API Contract Specifications

All endpoints under `CM-013` must reside within the versioned `/api/v1/sequences/` namespace:

### 1. Request Next Number in Series
*   **Route:** `POST /api/v1/sequences/next`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "entityCode": "INVOICE",
      "branchId": "branch-uuid-12"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "number": "INV-2026-0001",
        "currentSequence": 1
      }
    }
    ```

### 2. Configure Series Definition
*   **Route:** `POST /api/v1/sequences/definitions`
*   **Request Payload:**
    ```json
    {
      "entityCode": "EVENT",
      "prefix": "EVT-{YYYY}-",
      "paddingLength": 5,
      "resetPeriod": "YEARLY"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "definitionId": "def-uuid-1234",
        "entityCode": "EVENT"
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Managing scheduled jobs (creating, disabling, or trigger runs) requires the `ADMIN_ACCESS` permission scope.
*   **Data Scoping:** Background jobs must run within a designated tenant context (`tenantId`), preventing data leakage.

---

## 7. Caching & Performance Guidelines

*   **No Active Sequence Caching:** Active sequence counters cannot be cached in memory to ensure transactional consistency and prevent skipped numbers.
*   **Metadata Caching:** Definition templates (prefix rules, padding lengths) are cached in Redis with a Time to Live (TTL) of **24 hours**.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-013` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Lock Logic ] -> [ Phase 3: Format Compiler ] -> [ Phase 4: API Setup ] -> [ Phase 5: Verification ]
* Create Sequence tables      * Build pessimistic locks     * Implement placeholders tag  * Implement next routes       * Write Vitest unit tests
* Run Prisma migrations        * Setup increment checks      * Implement zero-padding logic* Implement admin dashboard   * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define number series definition and sequence tables in the schemas. Run migrations.
*   **Phase 2: Lock Logic Implementation:** Build the transaction-locked sequence increments service.
*   **Phase 3: Format Compiler Setup:** Implement placeholder parsing (`{YYYY}`, `{BRANCH}`) and number-padding logic.
*   **Phase 4: API Integration:** Implement REST API paths for next-number requests and configurations.
*   **Phase 5: Verification & Tests:** Write unit tests to check concurrency locks, and write E2E tests to verify formatting and year resets.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Pessimistic lock increments and format compilers must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Concurrency testing must confirm that simultaneous queries return unique, sequential numbers.
# Catrack Technical Runbook & Specification (CM-013 Number Series Engine) completed successfully.
