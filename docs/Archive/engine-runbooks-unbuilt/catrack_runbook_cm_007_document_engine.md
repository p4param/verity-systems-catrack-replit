# Catrack Technical Runbook: CM-007 Document Engine
**Catrack ERP Platform Component Specification (CM-007)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-007`
*   **Component Name:** Document Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Secure File Uploads, Document Versioning, S3-Compatible Storage Integration, Document Preview Generation, Tagging Registries, OCR Pipeline Integration.
*   **Target Audience:** Enterprise Software Engineers, Storage Administrators, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-007` is to implement a centralized, secure document engine that coordinates file uploads, versioning, storage routing, previews, and metadata tagging across all modules of the Catrack ERP platform.

### Functional Scope
*   **Secure File Uploads:** Uploading attachments and verifying file types and sizes.
*   **Storage Integration:** Storing documents in S3-compatible object storage.
*   **Document Versioning:** Storing history logs when documents are modified.
*   **Tagging & Taxonomy:** Grouping files using custom metadata tags.
*   **OCR Pipeline Integration (SSO-Ready):** Pre-configuring files to support automated extraction pipelines.
*   **Preview Support:** Generating temporary read-only URLs for secure file previews.

---

## 3. Technical Architecture Expectations

The Document Engine must conform to the following architectural design:

```
                            FILE UPLOAD & STORAGE PIPELINE
                            
                               Upload Request (File Stream)
                                         |
                                         v
                            +--------------------------+
                            |    Metadata Validation   | --(Invalid type/size)--> Return 400 Bad
                            |  (MIME check, size limit)|
                            +--------------------------+
                                         |
                                  (Passed)
                                         v
                            +--------------------------+
                            |   Presigned URL Request  |
                            |    (S3 Provider Hand)    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Secure S3 Upload       |
                            | (Client to Object Bucket)|
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Database Log Entry     |
                            | (Save path, version, tags)
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Asynchronous Processing | --(OCR/Previews)--> Background worker
                            +--------------------------+
```

*   **Presigned Uploads Strategy:** Large uploads must bypass the application server. The API serves temporary presigned S3 upload URLs, enabling client browsers to upload streams directly to S3 buckets.
*   **Decoupled Storage Provider:** Integrate with storage layers using abstract interfaces to support swapping S3 providers without changing core logic.
*   **Encrypted Storage:** All objects inside the S3 storage buckets must be encrypted at rest using provider-managed AES-256 keys.

---

## 4. Domain Model & Boundaries

The Document Engine manages these entities:

*   **Document:** Stores primary metadata, active versions, and context mapping.
*   **DocumentVersion:** Stores historical file paths, creator references, and version numbers.
*   **DocumentTag:** Maps custom metadata tags to document records.
*   **DocumentPermission:** Manages granular read/write access permissions for files.

---

## 5. API Contract Specifications

All endpoints under `CM-007` must reside within the versioned `/api/v1/documents/` namespace:

### 1. Request Presigned Upload URL
*   **Route:** `POST /api/v1/documents/upload-url`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "fileName": "signed_contract.pdf",
      "contentType": "application/pdf",
      "fileSize": 1048576,
      "module": "EVENTS",
      "referenceId": "event-uuid-1234"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "documentId": "doc-uuid-5678",
        "uploadUrl": "https://s3.example.com/bucket/path?signature=...",
        "fields": {}
      }
    }
    ```

### 2. Generate Preview URL
*   **Route:** `GET /api/v1/documents/:documentId/preview`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "previewUrl": "https://s3.example.com/bucket/path?expires=...&signature=..."
      }
    }
    ```
*   **Error Response (403 Forbidden - Insufficient Permissions):**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERR_DOCUMENT_FORBIDDEN",
        "message": "You do not have the required permissions to access this document."
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

*   **No Database Caching:** Document metadata and version lists are not cached. Presigned preview URLs are generated on-demand to maintain security.
*   **Performance Optimization:** Use CDNs to distribute and optimize the delivery of public media assets.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-007` is split into five phases:

```
[ Phase 1: DB & Bucket ] -> [ Phase 2: S3 Service ] -> [ Phase 3: URL Signer ] -> [ Phase 4: Preview Engine ] -> [ Phase 5: Verification ]
* Create Document tables     * Configure S3 credentials   * Implement presigned APIs   * Implement preview routes    * Write Vitest unit tests
* Run Prisma migrations      * Setup storage buckets      * Implement save endpoints   * Configure CDN policies      * Run Playwright E2E checks
```

*   **Phase 1: DB & Bucket Setup:** Define document and version tables in the database schemas. Set up storage buckets on the cloud server. Run migrations.
*   **Phase 2: S3 Service Integration:** Configure credentials and implement the S3 file upload interface.
*   **Phase 3: URL Signer Implementation:** Implement API endpoints to generate presigned upload and preview URLs.
*   **Phase 4: Preview Engine Setup:** Configure CDN delivery rules and build temporary URL generators.
*   **Phase 5: Verification & Tests:** Write unit tests to check format validation, and write E2E tests to verify file uploads and access controls.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** File validation helpers and presigned URL generators must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot download other tenants' documents or upload unsafe files.
# Catrack Technical Runbook & Specification (CM-007 Document Engine) completed successfully.
