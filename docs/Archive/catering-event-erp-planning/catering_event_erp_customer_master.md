# Customer Master & Contact Management Framework
**Document Code:** ERP-CMD-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Master Data Architect, CRM Consultant, & Customer Data Management Specialist  

---

## 1. Master Data Governance & Duplicate Prevention

To maintain data quality across multi-city operations (and support millions of customer profiles), the ERP implements a **Master Data Management (MDM) Pipeline**:

```
[New Customer Profile Created] ──► [Normalize Contact Strings (Email/Phone)]
                                                 │
[Add to Duplicate Review Queue] ◄── [Fuzzy Match Flagged (Score > 85%)] ◄┴──► [Save Profile]
```

### 1.1. Core MDM Principles
* **Fuzzy Duplicate Matching:** During customer creation (via manual entry, CSV imports, or API endpoints), the system runs a trigram similarity check on `name` and matches exact phone numbers and email domains. Queries scoring >85% are blocked and routed to the Duplicate Review Queue.
* **Survivorship Rules:** When merging duplicate profiles:
  * Transaction history (invoices, bookings) is combined.
  * The oldest `created_at` timestamp is kept.
  * Conflict resolution defaults to the user's manual choices or selects the profile with the most complete KYC documentation.
* **Audit & Reversals:** The system logs all merges in `customer_merge_history`, allowing administrators to undo a profile merge and restore the original records.

---

## 2. Customer Lifecycle Management

Customer states are tracked to coordinate targeted sales actions:

* **Prospect:** Lead captured with no active inquiries.
* **Active Customer:** Customer with at least one confirmed booking or settled invoice in the past 12 months.
* **VIP Customer:** High-value repeat buyers (e.g. corporate accounts with >$100k annual spend).
* **Dormant Customer:** No event bookings in the past 18 months. Automated email/WhatsApp campaigns are triggered.
* **Blocked Customer:** Accounts locked due to non-payment or credit limit breaches. New quotation requests are blocked automatically.

---

## 3. Database Schema Design (18 Tables DDL)

All master customer records reside inside the `masterdata` schema.

```sql
CREATE SCHEMA IF NOT EXISTS masterdata;

-- 1. Customer Categories
CREATE TABLE masterdata.customer_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "CORPORATE", "WEDDING_PLANNER", "INDIVIDUAL"
    name VARCHAR(100) NOT NULL
);

-- 2. Customers
CREATE TABLE masterdata.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES masterdata.customer_categories(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL', -- INDIVIDUAL, CORPORATE
    status VARCHAR(30) NOT NULL DEFAULT 'PROSPECT', -- PROSPECT, ACTIVE, VIP, DORMANT, BLOCKED, ARCHIVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Customer Profiles (Extended KYC details)
CREATE TABLE masterdata.customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    tax_number VARCHAR(50), -- PAN/GST identifier
    registration_number VARCHAR(100), -- Corporate registration number
    industry VARCHAR(100), -- For corporate segmenting
    completeness_score INT NOT NULL DEFAULT 0, -- 0-100 data completeness
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customer Contacts
CREATE TABLE masterdata.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PRIMARY', -- PRIMARY, BILLING, EMERGENCY, COORDINATOR
    is_decision_maker BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_contacts_lookup ON masterdata.customer_contacts(customer_id);

-- 5. Customer Addresses
CREATE TABLE masterdata.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL, -- RESIDENTIAL, OFFICE, BILLING, VENUE
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Customer Relationships
CREATE TABLE masterdata.customer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    target_customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- PARENT_COMPANY, SUBSIDIARY, SPOUSE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Customer Households
CREATE TABLE masterdata.customer_households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_name VARCHAR(150) NOT NULL,
    primary_contact_id UUID NOT NULL REFERENCES masterdata.customers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Customer Segments
CREATE TABLE masterdata.customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    segmentation_rules JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Customer Tags
CREATE TABLE masterdata.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_cust_tag ON masterdata.customer_tags(customer_id, name);

-- 10. Customer Documents (Uploads like PAN, GST, ID proofs)
CREATE TABLE masterdata.customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    document_name VARCHAR(150) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Customer Verifications (KYC Sign-offs)
CREATE TABLE masterdata.customer_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    verified_by UUID NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED', -- UNVERIFIED, VERIFIED, REJECTED
    notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 12. Customer Preferences
CREATE TABLE masterdata.customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Customer Statuses (Transition Logs)
CREATE TABLE masterdata.customer_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Customer Merge History
CREATE TABLE masterdata.customer_merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surviving_customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    merged_customer_id UUID NOT NULL, -- Target ID (since record is soft-deleted)
    merge_metadata JSONB NOT NULL, -- Diffs and records combined
    merged_by UUID NOT NULL,
    merged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Customer Import Jobs
CREATE TABLE masterdata.customer_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, ROLLED_BACK
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Customer Import Rows (Temp storage for verification)
CREATE TABLE masterdata.customer_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES masterdata.customer_import_jobs(id) ON DELETE CASCADE,
    raw_data JSONB NOT NULL,
    import_status VARCHAR(20) NOT NULL, -- VALID, INVALID, DUPLICATE
    error_message TEXT
);

-- 17. Customer Classifications (Dynamic groups)
CREATE TABLE masterdata.customer_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    classification_value VARCHAR(100) NOT NULL, -- e.g., "HIGH_PROFIT", "VIP"
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Customer Audit Logs
CREATE TABLE masterdata.customer_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES masterdata.customers(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, MERGE, BLOCK
    previous_values JSONB,
    current_values JSONB,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cust_audit_time ON masterdata.customer_audit_logs(customer_id, changed_at DESC);
```

---

## 4. Address Verification & Geolocation

To coordinate deliveries and logistics run-sheets:

* **Address Standardization:** Address records entered in the ERP are standardized using integrations with Google Places API or Mapbox to verify formatting.
* **Coordinate Mapping:** Every validated address resolves to precise coordinates (`latitude`, `longitude`), which are cached in the database.
* **Logistics Routing:** Delivery routing engines read coordinates from `customer_addresses` to calculate transit times and schedule runs.
