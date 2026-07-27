# Catrack Technical Runbook: CM-014 File Storage Engine
**Catrack ERP Platform Component Specification (CM-014)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-014`
*   **Component Name:** File Storage Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Cloud/Local Storage Abstraction, File Lifecycle Rules, CDN Distribution Setup, Storage Access Control Keys.
*   **Target Audience:** Enterprise Software Engineers, DevOps Engineers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-014` is to implement a unified file storage abstraction layer that coordinates local directory storage, cloud-based S3 buckets, CDN delivery rules, lifecycle transitions, and access controls across all modules of the Catrack ERP platform.

### Functional Scope
*   **Cloud/Local Abstraction:** Providing a consistent file API for both local environments (dev/test) and cloud buckets (production).
*   **Lifecycle Rules:** Automating file transitions (e.g., archiving old files to cold storage, deleting temporary reports).
*   **CDN Integration:** Configuring CDN caching for public assets (logos, media files) to optimize load times.
*   **Storage Access Controls:** Enforcing tenant isolation and managing private vs. public read/write permissions.

---

## 3. Technical Architecture Expectations

The File Storage Engine must conform to the following architectural design:

```
                            FILE STORAGE OPERATION FLOW
                            
                               Storage Operation (Read / Write)
                                         |
                                         v
                            +--------------------------+
                            |    API Abstraction Layer |
                            |  (Local vs S3 Routing)   |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Security & Auth Check  | --(Unauthorized)--> Return 403 Forbidden
                            |  (Validate token scopes) |
                            +--------------------------+
                                         |
                                  (Passed)
                                         v
                            +--------------------------+
                            |     Driver Execution     |
                            +--------------------------+
                             /                        \
                    (Local Driver)               (S3 Driver)
                       /                                \
                      v                                  v
            +--------------------+             +--------------------+
            | Local Disk Storage |             | S3 Cloud Bucket    |
            | (Read/Write block) |             | (REST upload/get)  |
            +--------------------+             +--------------------+
                      \                                  /
                       \                                /
                        v                              v
                            +--------------------------+
                            |      Lifecycle Check     | --(Schedule match)--> Move to Cold Archive
                            | (Verify retention rules) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    CDN Distribution      | --(Public assets)--> Cache edge nodes
                            +--------------------------+
```

*   **Driver Pattern Abstraction:** Access to files must use a Driver Pattern (e.g., `DiskDriver` for local dev, `S3Driver` for cloud prod), ensuring backend code remains unchanged regardless of where files are hosted.
*   **Lifecycle Configurations:** Storage tables must define file expiration and retention settings (e.g., deleting temporary report exports after 30 days).
*   **Security Access Control:** Private files require temporary signed URLs for access. Public files are served through CDNs.

---

## 4. Domain Model & Boundaries

The File Storage Engine manages these entities:

*   **StorageBucketConfiguration:** Stores bucket configurations, driver types, region keys, and access credentials.
*   **StorageFileLog:** Stores paths, driver types, sizes, file hashes, MIME types, and expiration rules.
*   **StorageLifecycleRule:** Stores archival rules and deletion schedules per bucket category.

---

## 5. API Contract Specifications

All endpoints under `CM-014` must reside within the versioned `/api/v1/storage/` namespace:

### 1. Write File Payload
*   **Route:** `POST /api/v1/storage/files`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:** Multipart form data containing:
    *   `file`: Raw file stream.
    *   `bucketCategory`: Target storage category (e.g., `INVOICES`, `ASSETS`).
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "fileKey": "invoices/2026/07/inv-1234.pdf",
        "fileSize": 54200,
        "mimeType": "application/pdf"
      }
    }
    ```

### 2. Request File Download URL
*   **Route:** `GET /api/v1/storage/files/download`
*   **Query Parameters:** `fileKey` (e.g., `invoices/2026/07/inv-1234.pdf`).
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "downloadUrl": "https://s3.example.com/invoices/2026/07/inv-1234.pdf?signature=..."
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Verification:** Temporary preview URLs must expire after a maximum of **15 minutes**.
*   **Data Scoping:** Every document record and storage bucket path must include the `tenantId` parameter to enforce tenant isolation.
*   **Vulnerability Protection:** Restrict uploaded file types to safe MIME categories, blocking executable formats (e.g., `.exe`, `.sh`).

---

## 7. Caching & Performance Guidelines

*   **CDN Integration:** Public assets (e.g., tenant brand logos, portal images) are served through CDNs with a Cache-Control max-age header of **365 days**.
*   **Signature Calculations Caching:** Presigned URL generation processes are optimized to execute in under 10ms.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-014` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Driver Logic ] -> [ Phase 3: S3 Integration ] -> [ Phase 4: Lifecycle Cron ] -> [ Phase 5: Verification ]
* Create Storage tables       * Build Driver abstractions   * Implement S3 integration    * Setup retention cleanup cron* Write Vitest unit tests
* Run Prisma migrations        * Implement local disk driver * Configure public CDN rules  * Setup S3 cold archival rules* Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define bucket configuration, file log, and lifecycle rule tables in the database schemas. Run migrations.
*   **Phase 2: Driver Logic Implementation:** Build the driver interfaces and write the local disk driver service.
*   **Phase 3: S3 Integration Setup:** Implement the S3 cloud driver and configure CDN delivery rules.
*   **Phase 4: Lifecycle Cron Setup:** Set up background cron tasks to delete expired files and archive old records to cold storage.
*   **Phase 5: Verification & Tests:** Write unit tests to check file parsing, and write E2E tests to verify driver routing and access controls.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Driver abstraction controllers and format check utilities must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot download other tenants' documents or upload unsafe files.
# Catrack Technical Runbook & Specification (CM-014 File Storage Engine) completed successfully.
