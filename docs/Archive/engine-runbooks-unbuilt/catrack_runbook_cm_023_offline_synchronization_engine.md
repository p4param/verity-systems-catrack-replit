# Catrack Technical Runbook: CM-023 Offline Synchronization Engine
**Catrack ERP Platform Component Specification (CM-023)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-023`
*   **Component Name:** Offline Synchronization Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Client-Side Offline Storage (IndexedDB), Sync Queue Reconciliation, Conflict Resolution Strategies, Delta Update Calculations, Sync Session Recovery.
*   **Target Audience:** Enterprise Software Engineers, Mobile Developers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-023` is to implement an offline synchronization engine that manages offline data storage, sync queues, conflict resolution rules, delta updates, and recovery workflows across all mobile and web modules of the Catrack ERP platform.

### Functional Scope
*   **Offline Data Caching:** Caching transaction records in browser IndexedDB databases for offline access.
*   **Sync Queue Reconciliation:** Recording client updates in an offline sync queue and dispatching payloads when reconnecting.
*   **Conflict Resolution:** Executing resolution strategies (Last-Write-Wins vs. Version control) when data conflicts occur.
*   **Delta Update Calculations:** Sending only altered data values (deltas) instead of complete records.
*   **Session Recovery:** Restoring active sync sessions after network drops.

---

## 3. Technical Architecture Expectations

The Offline Synchronization Engine must conform to the following architectural design:

```
                            OFFLINE SYNC WORKFLOW
                            
                               Client Mutation (Offline)
                                         |
                                         v
                            +--------------------------+
                            |    Write to IndexedDB    |
                            |   (Local database write) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Queue in Local Sync    |
                            | (Sequence transaction tag)
                            +--------------------------+
                                         |
                                (Network Restored)
                                         v
                            +--------------------------+
                            |    Sync Payload Build    |
                            |  (Calculate delta changes)
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Send Sync Request     |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Server Conflict Check   |
                            +--------------------------+
                             /                        \
                        (No Conflict)               (Conflict Found)
                          /                            \
                         v                              v
            +--------------------+             +--------------------+
            | Commit database    |             | Apply Resolution   |
            | (Update version)   |             | (LWW vs Version check)
            +--------------------+             +--------------------+
                                                        |
                                                 (Resolve success)
                                                        |
                                                        v
                                               +--------------------+
                                               |  Sync Local State  |
                                               | (Update client ID) |
                                               +--------------------+
```

*   **Version Control Check:** Database records must use numeric version tags (`version = 1, 2, ...`). The server checks if the incoming client version matches the database version before executing updates.
*   **Dynamic Resolution Policy:** The engine implements two conflict resolution policies defined in metadata:
    *   *Last-Write-Wins (LWW):* The incoming update automatically overwrites the database record.
    *   *Version Control Check:* If version numbers mismatch, the transaction is rejected, and the client must download the latest server record to resolve the conflict.

---

## 4. Domain Model & Boundaries

The Offline Synchronization Engine manages these entities:

*   **SyncSession:** Tracks active client sync sessions, connection states, and last sync timestamps.
*   **SyncQueueLog:** Stores queued transaction payloads, sequence keys, and tenant mappings.
*   **SyncConflictLog:** Stores conflict records, resolution statuses, old values, and new values.

---

## 5. API Contract Specifications

All endpoints under `CM-023` must reside within the versioned `/api/v1/sync/` namespace:

### 1. Submit Sync Queue Payloads
*   **Route:** `POST /api/v1/sync/reconcile`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "syncSessionId": "sess-uuid-1234",
      "payloads": [
        {
          "sequenceKey": 1,
          "entityName": "CateringEvent",
          "entityId": "event-uuid-1",
          "action": "UPDATE",
          "clientVersion": 2,
          "delta": {
            "statusId": "status-uuid-confirmed"
          }
        }
      ]
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "syncSessionId": "sess-uuid-1234",
        "processedCount": 1,
        "conflicts": []
      }
    }
    ```

### 2. Query Sync Conflicts
*   **Route:** `GET /api/v1/sync/conflicts`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "conflicts": [
          {
            "conflictId": "conf-uuid-1",
            "entityName": "CateringEvent",
            "entityId": "event-uuid-1",
            "serverVersion": 3,
            "clientVersion": 2,
            "resolved": false
          }
        ]
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Sync operations require write permissions for the target module (e.g., syncing inventory items requires `INVENTORY_MANAGE`).
*   **Tenant Isolation:** Sync queues and conflict logs must include the `tenantId` parameter, enforcing tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **Delta Transfers:** The sync engine transmits only modified data attributes (deltas) instead of complete records, minimizing network bandwidth.
*   **Batch Operations:** Sync operations are processed in transactions to optimize database write times.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-023` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Client IndexedDB ] -> [ Phase 3: Sync APIs Setup ] -> [ Phase 4: Conflict Resolver] -> [ Phase 5: Verification ]
* Create Sync tables          * Configure IndexedDB schema  * Implement reconcile API     * Implement LWW logic         * Write Vitest unit tests
* Run Prisma migrations        * Build client sync queue     * Implement conflict APIs     * Implement version mismatch  * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define sync session, queue, and conflict tables in the database schemas. Run migrations.
*   **Phase 2: Client IndexedDB Setup:** Configure IndexedDB stores and implement the client-side sync queue.
*   **Phase 3: Sync APIs Setup:** Implement REST API paths for submitting sync queues and querying conflicts.
*   **Phase 4: Conflict Resolver Setup:** Implement LWW and version conflict resolution logic.
*   **Phase 5: Verification & Tests:** Write unit tests to check conflict resolution, and write E2E tests to verify offline data caching and sync recovery.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The conflict resolver and version controllers must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot access other tenants' sync files or edit records without permission.
# Catrack Technical Runbook & Specification (CM-023 Offline Synchronization Engine) completed successfully.
