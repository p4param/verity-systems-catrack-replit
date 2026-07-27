# Catrack Technical Runbook: CM-008 Reporting Engine
**Catrack ERP Platform Component Specification (CM-008)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-008`
*   **Component Name:** Reporting Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Parameterized Query Compilation, Template-Based Layouts, CSV/Excel/PDF Exports, Scheduled Report Execution.
*   **Target Audience:** Enterprise Software Engineers, Database Architects, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-008` is to implement a unified reporting engine that compiles database queries, builds reports from templates, schedules delivery, and handles format exports across all modules of the Catrack ERP platform.

### Functional Scope
*   **Parameterized Query Compilation:** Validating query inputs and compiling dynamic SQL queries.
*   **Format Exports:** Exporting report data to CSV, Excel (XLSX), and PDF formats.
*   **Scheduled Reporting:** Scheduling report generation and delivery (email) using cron tasks.
*   **Template-Based Layouts:** Designing consistent tables, headers, and summaries using configuration metadata.

---

## 3. Technical Architecture Expectations

The Reporting Engine must conform to the following architectural design:

```
                            REPORT GENERATION PIPELINE
                            
                               Report Request (Parameters)
                                         |
                                         v
                            +--------------------------+
                            |   Parameter Validation   | --(Invalid inputs)--> Return 400 Bad
                            | (Zod schema checking)    |
                            +--------------------------+
                                         |
                                  (Passed)
                                         v
                            +--------------------------+
                            |    API Routing / Queue   |
                            | (Immediate vs Scheduled) |
                            +--------------------------+
                             /                        \
                    (Immediate)                      (Scheduled)
                       /                                \
                      v                                  v
            +--------------------+             +--------------------+
            | Read Replica Fetch |             | Background Worker  |
            | (SQL Query Exec)   |             | (BullMQ / Redis)   |
            +--------------------+             +--------------------+
                      \                                  /
                       \                                /
                        v                              v
                            +--------------------------+
                            |   Template Compiler      |
                            | (Build layout structure) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Exporter Service     |
                            |  (Generate PDF/CSV/XLSX) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Response/Storage     |
                            | (Send to S3 or stream back
                            +--------------------------+
```

*   **Read Replica Queries:** Report queries must run against read replicas to protect primary database performance during active transaction hours.
*   **Decoupled Export Processors:** Implement export operations (PDF, Excel, CSV) using separate processing services, ensuring errors in one processor do not affect other formats.
*   **Background Execution:** Large reports (queries taking longer than 2 seconds) must run asynchronously in background workers, storing results in S3 for download.

---

## 4. Domain Model & Boundaries

The Reporting Engine manages the following entities:

*   **ReportDefinition:** Stores report metadata, parameter specifications, schema properties, and permission rules.
*   **ReportSchedule:** Stores cron schedule configurations, recipient lists, and export settings.
*   **ReportExecutionLog:** Stores execution histories, status updates, file sizes, and download links.

---

## 5. API Contract Specifications

All endpoints under `CM-008` must reside within the versioned `/api/v1/reports/` namespace:

### 1. Request Report Generation
*   **Route:** `POST /api/v1/reports/generate`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "reportCode": "EVENT_REVENUE_SUMMARY",
      "format": "PDF",
      "parameters": {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "branchId": "branch-uuid-12"
      }
    }
    ```
*   **Success Response (200 OK - Immediate Stream):** Returns raw binary data matching the target Content-Type (e.g., `application/pdf`).
*   **Success Response (202 Accepted - Asynchronous Queue):**
    ```json
    {
      "success": true,
      "data": {
        "executionId": "exec-uuid-1234",
        "status": "QUEUED"
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Execution queries must check the user's role permissions (e.g., `REPORTING_VIEW` is required for standard reviews, while financial reports require specific permissions).
*   **Data Partitioning:** Every report query must automatically append `tenantId` and `branchId` parameters to database requests, maintaining tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **Metadata Caching (L2):** Report definitions and schema parameters are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Query Output Caching:** Static or monthly summaries are cached in S3 to prevent redundant database queries.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-008` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Query Compiler ] -> [ Phase 3: Export Services ] -> [ Phase 4: Job Scheduler ] -> [ Phase 5: Verification ]
* Create Report tables        * Build query builder         * Implement PDF processor     * Configure BullMQ cron       * Write Vitest unit tests
* Run Prisma migrations        * Implement input checks      * Implement Excel exporter    * Setup email delivery hooks  * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define report definition, schedule, and execution log tables in the database schemas. Run migrations.
*   **Phase 2: Query Compiler Implementation:** Build the dynamic query compiler and configure read replica database routing.
*   **Phase 3: Export Services Integration:** Implement PDF, CSV, and Excel export processors.
*   **Phase 4: Job Scheduler Setup:** Setup background cron workers to generate and deliver scheduled reports automatically.
*   **Phase 5: Verification & Tests:** Write unit tests to check query building, and write E2E tests to verify report generation and format exports.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The query compiler and export processors must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot access other tenants' data or run reports without the required permissions.
# Catrack Technical Runbook & Specification (CM-008 Reporting Engine) completed successfully.
