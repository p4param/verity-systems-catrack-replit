# Catrack Technical Runbook: CM-012 Scheduler Engine
**Catrack ERP Platform Component Specification (CM-012)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-012`
*   **Component Name:** Scheduler Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Cron-Based Job Scheduling, Background Task Processing, Job Queue Management, Retry Policies, Execution Telemetry.
*   **Target Audience:** Enterprise Software Engineers, DevOps Engineers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-012` is to implement a background job scheduler that coordinates cron-based tasks, reminders, background queues, retries, and performance monitoring across all modules of the Catrack ERP platform.

### Functional Scope
*   **Cron-Based Task Scheduling:** Defining and scheduling recurring tasks (e.g., nightly reports, cache cleanups).
*   **Background Queue Management:** Running tasks asynchronously using Redis-backed queues.
*   **Job Retry Policies:** Configuring retries with exponential back-off rules.
*   **Execution Telemetry:** Tracking job execution times, success rates, and errors.
*   **Alert Notifications:** Alerting administrators when critical background jobs fail.

---

## 3. Technical Architecture Expectations

The Scheduler Engine must conform to the following architectural design:

```
                            JOB SCHEDULING PIPELINE
                            
                                Cron Trigger / Event
                                         |
                                         v
                            +--------------------------+
                            |    Job Registration      |
                            | (Verify status in config) |
                            +--------------------------+
                                         |
                                  (Active)
                                         v
                            +--------------------------+
                            |   Queue Push (BullMQ)    |
                            |   (Persist in Redis)     |
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
            |  Update Log Status |             |  Retry Validation  |
            |     (Success)      |             | (Check back-off)   |
            +--------------------+             +--------------------+
                                                        |
                                                  (Retry Limit)
                                                        |
                                                        v
                                               +--------------------+
                                               | Trigger Alert Log  |
                                               |     (Failed)       |
                                               +--------------------+
```

*   **Redis-Backed Queues:** Background tasks and queues are managed in Redis using the BullMQ framework.
*   **Job Lock Strategy:** Workers lock active jobs in Redis, preventing duplicate execution in multi-server environments.
*   **Decoupled Worker Nodes:** Worker processes run as independent services to prevent heavy background tasks from affecting API performance.

---

## 4. Domain Model & Boundaries

The Scheduler Engine manages the following entities:

*   **ScheduledJobDefinition:** Defines job details, cron strings, target endpoints, retry configurations, and active statuses.
*   **JobExecutionQueue:** Tracks queued items, active states, execution logs, and target worker servers.
*   **JobExecutionHistory:** Stores execution logs, timestamps, run durations, success statuses, and error stack traces.

---

## 5. API Contract Specifications

All endpoints under `CM-012` must reside within the versioned `/api/v1/scheduler/` namespace:

### 1. Register Scheduled Task
*   **Route:** `POST /api/v1/scheduler/jobs`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "jobCode": "NIGHTLY_KPI_ROLLUP",
      "cronExpression": "0 1 * * *",
      "targetService": "DashboardKpiService",
      "targetAction": "runDailyRollup",
      "retryLimit": 3,
      "backoffDelaySeconds": 60
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "job-uuid-1234",
        "nextRunAt": "2026-07-08T01:00:00Z"
      }
    }
    ```

### 2. Retrieve Job Status
*   **Route:** `GET /api/v1/scheduler/jobs/:jobId/status`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "job-uuid-1234",
        "status": "ACTIVE",
        "lastRun": {
          "status": "SUCCESS",
          "runDurationMs": 1450,
          "executedAt": "2026-07-07T01:00:01Z"
        }
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

The implementation of `CM-012` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Queue Integration ] -> [ Phase 3: Worker Setup ] -> [ Phase 4: Job API ] -> [ Phase 5: Verification ]
* Create Scheduler tables     * Setup BullMQ framework      * Setup worker node           * Implement CRUD routes       * Write Vitest unit tests
* Run Prisma migrations        * Configure Redis queues      * Implement retry logic       * Implement manual trigger    * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define job, queue, and execution log tables in the database schemas. Run migrations.
*   **Phase 2: Queue Integration Setup:** Set up BullMQ and configure Redis-backed queues.
*   **Phase 3: Worker Node Setup:** Implement worker node services, lock controls, and retry handlers.
*   **Phase 4: Job API Integration:** Implement REST API paths for managing jobs and triggering manual runs.
*   **Phase 5: Verification & Tests:** Write unit tests to check retry logic, and write E2E tests to verify job scheduling and execution logs.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The job retry handler and lock controller must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that background tasks cannot access tenant directories outside their scope.
# Catrack Technical Runbook & Specification (CM-012 Scheduler Engine) completed successfully.
