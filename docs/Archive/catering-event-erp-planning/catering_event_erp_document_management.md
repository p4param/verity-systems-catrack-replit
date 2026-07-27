# Document Management Framework
**Document Code:** ERP-DOC-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Content Management (ECM) Architect & Information Governance Specialist  

---

## 1. Storage Strategy & Cloud Abstraction Layer

To ensure cloud portability and support both cloud and on-premise infrastructure, the ERP implements a **Storage Abstraction Layer** using a provider-agnostic interface:

```
[ERP Document Service]
         │
         ▼ Storage Abstraction Interface (get, put, delete, signUrl)
  ┌──────┴──────────────────────┬──────────────────────┐
  ▼                             ▼                      ▼
[AWS S3 / Cloud]         [MinIO / On-Prem]       [Local Storage]
```

### 1.1. Hybrid Storage Engine
* **Cloud Object Storage:** S3-compatible endpoints (AWS S3, Cloudflare R2, MinIO) store unstructured documents (BEO PDFs, contract images, signed client agreements).
* **Local Storage Fallback:** On-premise deployments write files to a network-attached storage (NAS) mount using standard path configurations.
* **Content Delivery Network (CDN):** Static public assets (e.g. food item photos, branch logos) are cached at edge locations via Amazon CloudFront to reduce database server loads.
* **Security & Encryption:** All files are encrypted at rest using AES-256 keys (managed by AWS KMS or HashiCorp Vault) and delivered via short-lived pre-signed URLs (15-minute expirations).

---

## 2. OCR & Document Processing Pipeline

The ERP integrates OCR (Optical Character Recognition) and AI engines to automate data extraction:

```
[Vendor Invoice Uploaded (PDF/Image)] ──► [Push to Processing Queue]
                                                 │
[Prisma DB Update] ◄── [Structured JSON Output] ◄┴──► [Analyze via Tesseract/Google DocumentAI]
```

1. **Trigger:** A user uploads a vendor invoice or client license to the `documents` folder.
2. **Extraction:** A background worker sends the document to the OCR engine (e.g., Tesseract or Google DocumentAI).
3. **Parsing:** The extracted text is parsed into a structured JSON schema (identifying invoice totals, tax details, invoice date, and PO numbers).
4. **Matching:** The system automatically matches the extracted invoice details against the corresponding Purchase Order.

---

## 3. Database Schema Design (18 Tables DDL)

All document and asset metadata tables reside inside the `documents` schema.

```sql
CREATE SCHEMA IF NOT EXISTS documents;

-- 1. Document Folders
CREATE TABLE documents.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    branch_id UUID,
    parent_folder_id UUID REFERENCES documents.document_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_folder_parent ON documents.document_folders(parent_folder_id);

-- 2. Document Categories
CREATE TABLE documents.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. "CONTRACTS", "INVOICES"
    name VARCHAR(100) NOT NULL
);

-- 3. Documents
CREATE TABLE documents.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES documents.document_folders(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES documents.document_categories(id),
    title VARCHAR(255) NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_doc_folder ON documents.documents(folder_id);

-- 4. Document Versions
CREATE TABLE documents.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- S3 key or file path
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_doc_version_unique ON documents.document_versions(document_id, version_number);

-- 5. Document Tags
CREATE TABLE documents.document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 6. Document Metadata
CREATE TABLE documents.document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    metadata_key VARCHAR(100) NOT NULL,
    metadata_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_doc_meta_key ON documents.document_metadata(document_id, metadata_key);

-- 7. Document Permissions
CREATE TABLE documents.document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    grantee_type VARCHAR(20) NOT NULL, -- ROLE, USER, DEPARTMENT
    grantee_id UUID NOT NULL,
    allow_read BOOLEAN NOT NULL DEFAULT TRUE,
    allow_write BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Document Shares (External links)
CREATE TABLE documents.document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL,
    recipient_email VARCHAR(255),
    access_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Document Templates
CREATE TABLE documents.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    template_html TEXT NOT NULL, -- HTML template with variables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Generated Documents (Output PDFs)
CREATE TABLE documents.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES documents.document_templates(id),
    entity_type VARCHAR(50) NOT NULL, -- e.g., "Event", "Invoice"
    entity_id UUID NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Digital Signatures
CREATE TABLE documents.digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    signer_email VARCHAR(255) NOT NULL,
    signature_provider VARCHAR(50) NOT NULL, -- e.g., "AdobeSign", "DocuSign", "Internal"
    provider_envelope_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, DECLINED
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Document Approvals
CREATE TABLE documents.document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    approver_user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    rejection_reason TEXT,
    actioned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Document Reviews
CREATE TABLE documents.document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL,
    comments TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Document Retention Policies
CREATE TABLE documents.document_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES documents.document_categories(id),
    retention_period_days INT NOT NULL,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    action_after_retention VARCHAR(20) NOT NULL DEFAULT 'ARCHIVE' -- ARCHIVE, PURGE
);

-- 15. Document Archives
CREATE TABLE documents.document_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_document_id UUID NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Document Audit Logs
CREATE TABLE documents.document_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DOWNLOAD, VIEW
    ip_address VARCHAR(45) NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_doc_audit_lookup ON documents.document_audit_logs(document_id);

-- 17. Media Assets (Photos/Videos)
CREATE TABLE documents.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title VARCHAR(150),
    original_file_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Media Transformations (Thumbnails/Web formats)
CREATE TABLE documents.media_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_asset_id UUID NOT NULL REFERENCES documents.media_assets(id) ON DELETE CASCADE,
    transformation_type VARCHAR(50) NOT NULL, -- e.g., "THUMBNAIL_150x150", "WEB_OPTIMIZED"
    file_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Concurrent Editing & Version Control

To prevent conflicts when multiple users edit or view the same file:

* **File Locking (Check-In/Check-Out):** When a user starts editing a document (like a menu template or contract), the system locks the file (`is_locked = TRUE`). Other users can view or download the file, but cannot upload modifications until the editor checks the file back in or the lock times out (default timeout is 2 hours).
* **Semantic Versioning:** Saving modifications updates the document's version number:
  * **Minor Version Updates (e.g., 1.1, 1.2):** Standard saves and drafts.
  * **Major Version Updates (e.g., 2.0, 3.0):** Formally signed contracts, approved BEOs, and finalized financial statements.
* **Metadata Inheritance:** Unstructured files linked to events inherit tag metadata (e.g., City, Branch, Event ID, Client ID) from the parent event record automatically, making search and retrieval simple.
