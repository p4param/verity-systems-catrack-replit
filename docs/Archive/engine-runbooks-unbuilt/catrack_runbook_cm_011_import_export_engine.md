# Catrack Technical Runbook: CM-011 Import/Export Engine
**Catrack ERP Platform Component Specification (CM-011)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-011`
*   **Component Name:** Import/Export Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** CSV/Excel/JSON Processing, Dynamic Field Mapping, Bulk Database Writes, Transactional Rollbacks, Validation Logging.
*   **Target Audience:** Enterprise Software Engineers, Database Architects, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-011` is to implement a unified data exchange engine that coordinates spreadsheet uploads, mapping validations, bulk database writes, and transactional rollbacks across all modules of the Catrack ERP platform.

### Functional Scope
*   **Data Parsing:** Parsing CSV, Excel (XLSX), and JSON formats.
*   **Dynamic Field Mapping:** Mapping spreadsheet columns to database attributes based on metadata.
*   **Transactional Rollbacks:** Rolling back entire import runs if a single row fails validation.
*   **Bulk Database Writes:** Processing imports using database transactions to protect data integrity.
*   **Validation Logging:** Logging validation errors per row (e.g., column mismatches, incorrect data types).

---

## 3. Technical Architecture Expectations

The Import/Export Engine must conform to the following architectural design:

```
                            DATA IMPORT EXECUTION PIPELINE
                            
                               Import Request (File Stream)
                                         |
                                         v
                            +--------------------------+
                            |    Metadata Parsing      | --(Unsupported format)--> Return 400 Bad
                            | (CSV/Excel layout check) |
                            +--------------------------+
                                         |
                                  (Passed)
                                         v
                            +--------------------------+
                            |   Validation & Mapping   | --(Failed mappings)--> Return Error Log
                            | (Zod schema schema check)|
                            +--------------------------+
                                         |
                                  (Passed)
                                         v
                            +--------------------------+
                            |    Transaction Start     |
                            |  (PostgreSQL isolation)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Bulk Database Write   | --(Write error)--> Rollback Transaction
                            +--------------------------+
                                         |
                                      (Success)
                                         v
                            +--------------------------+
                            |    Commit Transaction    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Audit Trail Update    |
                            +--------------------------+
```

*   **Transactional Safety:** Imports must execute within a database transaction. If a row fails validation or database constraints, the transaction is rolled back, preventing partial data updates.
*   **Background Processing:** Large files (exceeding 100 rows) must be processed asynchronously using background workers, saving results in S3.
*   **Memory Efficiency:** File streams must be parsed sequentially to prevent memory issues during large imports.

---

## 4. Domain Model & Boundaries

The Import/Export Engine manages these entities:

*   **DataExchangeJob:** Tracks import/export statuses, file paths, job types, and execution logs.
*   **ExchangeMappingDefinition:** Stores spreadsheet-to-database column mapping configurations.
*   **ExchangeValidationErrorLog:** Stores row-level validation errors, column references, and descriptions.

---

## 5. API Contract Specifications

All endpoints under `CM-011` must reside within the versioned `/api/v1/exchange/` namespace:

### 1. Trigger Data Import
*   **Route:** `POST /api/v1/exchange/import`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:** Multipart form data containing:
    *   `file`: The raw data file (CSV/XLSX).
    *   `mappingCode`: Reference to mapping metadata (e.g., `ITEM_IMPORT_MAP`).
*   **Success Response (202 Accepted):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "exchange-job-uuid-1234",
        "status": "PROCESSING",
        "totalRows": 250
      }
    }
    ```

### 2. Retrieve Job Progress & Error Logs
*   **Route:** `GET /api/v1/exchange/jobs/:jobId`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "exchange-job-uuid-1234",
        "status": "FAILED",
        "processedRows": 140,
        "failedRows": 1,
        "errors": [
          {
            "row": 141,
            "column": "unitCost",
            "message": "Invalid value: Cost must be a positive number."
          }
        ]
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Import operations require write permissions for the target module (e.g., importing inventory items requires `INVENTORY_MANAGE`).
*   **Tenant Isolation:** Data rows must be verified to ensure the `tenantId` match, blocking users from importing data into other tenants' accounts.

---

## 7. Caching & Performance Guidelines

*   **No Active Caching:** Import operations write directly to database tables. Cached lookup queries (like validating status codes) check Redis to speed up parsing.
*   **Stream Parsing:** Excel parsing uses memory-efficient stream parsers to prevent server memory issues.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-011` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Stream Parser ] -> [ Phase 3: Validation Logic ] -> [ Phase 4: Bulk Writer ] -> [ Phase 5: Verification ]
* Create Exchange tables      * Build Excel stream reader   * Build Zod schema parser    * Implement DB transactions   * Write Vitest unit tests
* Run Prisma migrations        * Build CSV parser            * Hook validation logging     * Setup rollback helpers      * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define exchange job, mapping, and error log tables in the database schemas. Run migrations.
*   **Phase 2: Stream Parser Implementation:** Build the memory-efficient Excel and CSV stream readers.
*   **Phase 3: Validation Logic Setup:** Build the mapping validator and configure Zod schema checks for input rows.
*   **Phase 4: Bulk Writer Implementation:** Implement PostgreSQL database transaction wrappers and rollback helpers.
*   **Phase 5: Verification & Tests:** Write unit tests to check column mapping, and write E2E tests to verify bulk imports and transaction rollbacks.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Mapping parsers and transaction rollback helpers must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that a single row failure rolls back all updates in the import run.
