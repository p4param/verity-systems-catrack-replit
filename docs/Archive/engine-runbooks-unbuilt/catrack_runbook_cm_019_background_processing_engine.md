# Catrack Technical Runbook: CM-019 Background Processing Engine
**Catrack ERP Platform Component Specification (CM-019)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-019`
*   **Component Name:** Background Processing Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Redis-Backed Work Queues (BullMQ), Worker Node Management, Dead-Letter Queues (DLQ), Idempotency Key Audits, Execution Telemetry.
*   **Target Audience:** Enterprise Software Engineers, DevOps Engineers, System Administrators.

---

## 2. Objective & Functional Scope

The primary objective of `CM-019` is to implement a high-volume, asynchronous background processing engine that coordinates message queues, worker processing nodes, dead-letter routes, retry policies, and execution telemetry across all modules of the Catrack ERP platform.

### Functional Scope
*   **Asynchronous Workloads:** Offloading heavy or long-running computations from the primary API request path.
*   **Worker Process Nodes:** Implementing dedicated, concurrent worker handlers to process jobs.
*   **Dead-Letter Queues (DLQ):** Routing failed jobs that exceed retry limits to a DLQ for investigation.
*   **Idempotency Protection:** Verifying incoming jobs using idempotency keys to prevent duplicate execution.
*   **Concurrency & Scaling:** Managing concurrent job limits per worker instance.

---

## 3. Technical Architecture Expectations

The Background Processing Engine must conform to the following architectural design:

```
                            JOB LIFECYCLE PIPELINE
                            
                               Job Submission (Payload)
                                         |
                                         v
                            +--------------------------+
                            |    Idempotency Check     | --(Duplicate job)--> Return Active Job ID
                            |  (Check key in Redis L2) |
                            +--------------------------+
                                         |
                                  (Passed)
                                         v
                            +--------------------------+
                            |  Active Queue Placement  |
                            |   (BullMQ / Redis L2)    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Worker Fetch & Lock   |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Job Execution        |
                            +--------------------------+
                             /                        \
                        (Success)                   (Fail)
                          /                            \
                         v                              v
            +--------------------+             +--------------------+
            | Update Log History |             |   Retry Handler    |
            |   (Record success) |             | (Check back-off)   |
            +--------------------+             +--------------------+
                                                        |
                                                  (Retry Limit)
                                                        |
                                                        v
                                               +--------------------+
                                               |  Dead-Letter Queue |
                                               |     (Log Failure)  |
                                               +--------------------+
```

*   **Redis Job Locking:** Workers lock active jobs in Redis during execution. If a worker goes offline, the lock expires, and the engine automatically returns the job to the active queue.
*   **Idempotency Keys:** Every job must present a unique identifier key. If a duplicate key is submitted while a job is active or completed, the engine returns the existing record, preventing duplicate execution.
*   **Dead-Letter Queue (DLQ):** Jobs that fail all retries are automatically routed to a DLQ table, prompting security alerts.

---

## 4. Domain Model & Boundaries

The Background Processing Engine manages the following entities:

*   **BackgroundJob:** Tracks job names, execution payloads, idempotency keys, target handlers, and statuses.
*   **BackgroundWorkerNode:** Tracks active worker nodes, concurrent job settings, and system usage.
*   **BackgroundJobHistory:** Stores execution logs, run durations, exit codes, and error stack traces.

---

## 5. API Contract Specifications

All endpoints under `CM-019` must reside within the versioned `/api/v1/jobs/` namespace:

### 1. Submit Background Job
*   **Route:** `POST /api/v1/jobs`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "jobType": "GENERATE_PDF_REPORT",
      "idempotencyKey": "idem-key-12345",
      "payload": {
        "reportId": "rep-uuid-1",
        "format": "PDF"
      }
    }
    ```
*   **Success Response (202 Accepted):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "job-uuid-5678",
        "status": "QUEUED"
      }
    }
    ```

### 2. Query Job Status
*   **Route:** `GET /api/v1/jobs/:jobId`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "job-uuid-5678",
        "status": "COMPLETED",
        "progress": 100,
        "runDurationMs": 1820
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Managing scheduled jobs (creating, disabling, or trigger runs) requires the `ADMIN_ACCESS` permission scope.
*   **Data Scoping:** Background jobs must run within a designated tenant context (`tenantId`), preventing data leakage.

---

## 7. Caching & Performance Guidelines

*   **Redis-Backed Queue Management:** Using Redis prevents database locking in PostgreSQL during queue operations.
*   **Job History Maintenance:** Execution logs are cleaned up periodically, deleting records older than 30 days to optimize database storage.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-019` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Queue Integration ] -> [ Phase 3: Worker Node ] -> [ Phase 4: Job API ] -> [ Phase 5: Verification ]
* Create Background tables    * Setup BullMQ Redis queues   * Setup worker lock controls  * Implement CRUD routes       * Write Vitest unit tests
* Run Prisma migrations        * Configure Redis connections * Implement retry handlers    * Implement status query      * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define job, worker, and history tables in the database schemas. Run migrations.
*   **Phase 2: Queue Integration Setup:** Set up BullMQ and configure Redis connection pools.
*   **Phase 3: Worker Node Setup:** Implement worker node services, lock controls, and retry handlers.
*   **Phase 4: Job API Integration:** Implement REST API paths for managing jobs and querying job statuses.
*   **Phase 5: Verification & Tests:** Write unit tests to check retry logic, and write E2E tests to verify job scheduling and execution logs.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Job retry handlers and lock controllers must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that background tasks cannot access tenant directories outside their scope.
# Catrack Technical Runbook & Specification (CM-019 Background Processing Engine) completed successfully.
