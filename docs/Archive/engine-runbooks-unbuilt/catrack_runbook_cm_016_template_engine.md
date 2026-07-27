# Catrack Technical Runbook: CM-016 Template Engine
**Catrack ERP Platform Component Specification (CM-016)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-016`
*   **Component Name:** Template Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Centralized Template Repository, Placeholder Merge Compiler, Multi-Format Generation (PDF/DOCX/HTML), Template Version Control, Storage Integration.
*   **Target Audience:** Enterprise Software Engineers, UI/UX Developers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-016` is to implement a unified, centralized template engine that parses placeholders, merges data fields, compiles HTML/CSS schemas, and generates final communication formats (PDF, DOCX, XLSX, HTML, Email) across all modules of the Catrack ERP platform.

### Functional Scope
*   **Centralized Template Repository:** Storing templates, placeholders, layout settings, and translation keys.
*   **Placeholder Merge Compiler:** Parsing text templates and replacing variables with actual database values.
*   **Multi-Format Generation:** Rendering HTML templates to PDF, Excel, and Word files.
*   **Template Version Control:** Storing template revisions and rollback settings.

---

## 3. Technical Architecture Expectations

The Template Engine must conform to the following architectural design:

```
                            TEMPLATE RENDERING PIPELINE
                            
                               Render Request (Parameters)
                                         |
                                         v
                            +--------------------------+
                            |     Get Active Template  |
                            | (Verify active version)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    L1/L2 Redis Cache     | --(Hit)--> Return Template Schema
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Database Fetch (Prisma)  | --(Save)--> Populate Cache
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Placeholder Compiler    |
                            | (Merge data parameters)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Format Rendering      |
                            +--------------------------+
                             /         |            \
                            /          |             \
                           v           v              v
                     [ PDF Render ] [ DOCX Render ] [ HTML Render ]
                           \           |              /
                            \          |             /
                             v         v            v
                            +--------------------------+
                            |    Storage Integration   | --(Save to S3)--> Return download link
                            +--------------------------+
```

*   **HTML-to-PDF Conversion:** PDF generation uses headless browser processes or dedicated node libraries (e.g., Puppeteer, Playwright) to convert HTML/CSS templates into PDF documents.
*   **Asynchronous Processing:** Long document generation processes (such as compiling annual reports or large event catalogs) must run asynchronously in background queues.

---

## 4. Domain Model & Boundaries

The Template Engine manages these entities:

*   **TemplateDefinition:** Stores template details, output formats, categories, active version numbers, and translations.
*   **TemplateVersion:** Stores HTML layout files, CSS files, variables schemas, and creator references.
*   **GeneratedDocument:** Stores generated document names, file keys, output formats, creation timestamps, and tenant IDs.

---

## 5. API Contract Specifications

All endpoints under `CM-016` must reside within the versioned `/api/v1/templates/` namespace:

### 1. Render Template to Format
*   **Route:** `POST /api/v1/templates/:templateCode/render`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "format": "PDF",
      "data": {
        "customerName": "John Doe",
        "invoiceNumber": "INV-2026-0001",
        "totalAmount": 1500
      }
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "documentKey": "documents/invoices/2026/07/inv-1234.pdf",
        "downloadUrl": "https://s3.example.com/documents/invoices/2026/07/inv-1234.pdf?signature=...",
        "generatedAt": "2026-07-07T10:00:00Z"
      }
    }
    ```

### 2. Update Template Version
*   **Route:** `POST /api/v1/templates/:templateCode/versions`
*   **Request Payload:**
    ```json
    {
      "htmlContent": "<html><body><h1>Invoice for {{customerName}}</h1></body></html>",
      "cssContent": "h1 { color: #00C4B4; }",
      "variablesSchema": {
        "customerName": "string",
        "invoiceNumber": "string",
        "totalAmount": "number"
      }
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "versionNumber": 3,
        "isActive": true
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Modifying templates and updating versions requires the `TEMPLATES_MANAGE` permission scope. Requesting rendering operations is open to internal system actions.
*   **Tenant Isolation:** Every template definition and generated document record must include the `tenantId` parameter, enforcing tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **L2 Caching:** Template layouts, HTML structures, and CSS files are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Cache Invalidation:** Activating a new template version invalidates the cached template in Redis, forcing a reload on the next request.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-016` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Merge Parser ] -> [ Phase 3: Format Render ] -> [ Phase 4: Cache Integration ] -> [ Phase 5: Verification ]
* Create Template tables      * Build placeholder parser   * Setup PDF converter        * Cache active layouts       * Write Vitest unit tests
* Run Prisma migrations        * Implement schema checks    * Implement DOCX/XLSX engines * Hook invalidation triggers  * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define template definition, version, and generated document tables in the schemas. Run migrations.
*   **Phase 2: Merge Parser Implementation:** Build the placeholder parser and configure Zod schema validation checks for incoming data.
*   **Phase 3: Format Render Setup:** Set up Puppeteer or Playwright for HTML-to-PDF rendering and configure Excel/Word export engines.
*   **Phase 4: Cache Integration:** Implement the Redis caching layer, hook cache invalidations, and configure S3 upload integration.
*   **Phase 5: Verification & Tests:** Write unit tests to check placeholder parsing, and write E2E tests to verify template rendering and PDF generation.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The placeholder parser and format render services must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that rendering templates cannot execute unsafe Javascript commands or access unauthorized tenant files.
# Catrack Technical Runbook & Specification (CM-016 Template Engine) completed successfully.
