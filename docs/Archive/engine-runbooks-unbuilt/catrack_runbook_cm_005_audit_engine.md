# Catrack Technical Runbook: CM-005 Audit Engine
**Catrack ERP Platform Component Specification (CM-005)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-005`
*   **Component Name:** Audit Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Immutable Write-only Audit Logging, Change Diff Generation, User Activity Logs, Record Restoration, Compliance Audits.
*   **Target Audience:** Enterprise Software Engineers, Database Administrators, Security & Compliance Auditors.

---

## 2. Objective & Functional Scope

The primary objective of `CM-005` is to implement the audit engine that tracks all business operations, logins, user activities, and data changes across the Catrack ERP platform.

### Functional Scope
*   **Immutable Write-Only Logging:** Writing logs to tables where updates and deletes are blocked.
*   **Change Diff Generation:** Generating JSON diffs comparing old and new states on every update.
*   **User Activity Logs:** Recording logins, failed log-ins, session refreshes, and permissions checks.
*   **Record Restoration:** Restoring deleted or modified records back to previous historical states.
*   **Compliance Support:** Satisfying regulatory standards for data traceability and security audits.

---

## 3. Technical Architecture Expectations

The Audit Engine must conform to the following architectural design:

```
                            AUDIT LOG WRITE PIPELINE
                            
                               Data Mutation Request
                                         |
                                         v
                            +--------------------------+
                            |  Execute Database Write  |
                            +--------------------------+
                                         |
                                      (Passed)
                                         v
                            +--------------------------+
                            |    Generate Change Diff  |
                            |   (Old vs. New values)   |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Context Capture        |
                            | (JWT user claims, IP)    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Write to Audit Table    |
                            | (Write-only transaction) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            | Security Alert Monitor   | --(Critical change)--> Trigger Alert
                            +--------------------------+
```

*   **Database Immutability:** Audit tables are write-only. Database user permissions block `UPDATE` and `DELETE` queries on these tables.
*   **Asynchronous Processing:** Writing logs must run asynchronously in background workers to prevent database blocking on primary transactions.
*   **Dynamic Data Diffing:** The service compares the record state before the write operation to the state after the write, generating a structured JSON diff of altered parameters.

---

## 4. Domain Model & Boundaries

The Audit Engine manages these entities:

*   **AuditLog:** Stores user actions, transaction details, and network contexts.
*   **EntityChangeLog:** Stores target table names, primary keys, and JSON diff payloads.
*   **SecurityAlertLog:** Records high-severity incidents (e.g., access breaches, database updates on sealed parameters).

---

## 5. API Contract Specifications

All endpoints under `CM-005` must reside within the versioned `/api/v1/admin/audit/` namespace:

### 1. Query Change History
*   **Route:** `GET /api/v1/admin/audit/changes`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Query Parameters:** `entityName` (e.g., `CateringEvent`), `entityId` (UUID), `limit`.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "entityName": "CateringEvent",
        "entityId": "event-uuid-1234",
        "changes": [
          {
            "id": "log-uuid-1",
            "timestamp": "2026-07-07T10:00:00Z",
            "actorId": "user-uuid",
            "action": "UPDATE",
            "diff": {
              "statusId": {
                "old": "status-uuid-draft",
                "new": "status-uuid-confirmed"
              }
            }
          }
        ]
      }
    }
    ```

### 2. Restore Historical Record
*   **Route:** `POST /api/v1/admin/audit/changes/:logId/restore`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "restored": true,
        "entityId": "event-uuid-1234",
        "restoredVersion": 4
      }
    }
    ```
*   **Error Response (403 Forbidden - Insufficient Permissions):**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERR_AUDIT_FORBIDDEN",
        "message": "Only users with the AUDIT_VIEW permission can view audit trails or perform record restorations."
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Restriction:** Access to endpoints under the `/api/v1/admin/audit/` path requires the `AUDIT_VIEW` permission scope.
*   **Database Constraints:** Audit logs must include the `tenantId` parameter to restrict reviews to the tenant's data. Cross-tenant queries are blocked.
*   **Verification:** Modifying or deleting audit records is blocked at the database engine level.

---

## 7. Caching & Performance Guidelines

*   **No Active Caching:** Audit log tables are not cached. Queries run directly against database tables using index queries on `(entityName, entityId)`.
*   **Write Optimization:** Batch logging operations using background queues (BullMQ) to prevent database blocking on primary writes.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-005` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Diff Generator ] -> [ Phase 3: Route Setup ] -> [ Phase 4: Restore Logic ] -> [ Phase 5: Verification ]
* Create Audit tables         * Build JSON diff helper      * Implement query routes     * Build restoration helpers   * Write Vitest unit tests
* Run Prisma migrations        * Integrate change listeners  * Setup filter options       * Setup security alerts       * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define audit log, change log, and alert log tables in the database schemas. Run migrations.
*   **Phase 2: Diff Generator Implementation:** Build the JSON diff parser and integrate database write listeners to trigger logs automatically.
*   **Phase 3: Route Setup:** Implement REST API paths for querying change histories and viewing logs.
*   **Phase 4: Restore Logic Implementation:** Build the database restoration helpers to rollback records to previous versions, and configure security alert triggers.
*   **Phase 5: Verification & Tests:** Write unit tests to check the diff generator, and write E2E tests to verify restoration steps and tenant boundaries.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The JSON diff parser and restoration logic must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that update and delete queries fail on audit tables.
