# Enterprise Database Standards Handbook
## Guidelines and Best Practices for PostgreSQL Database Design
**Document Code:** ERP-DBH-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Database Architect  

---

## 1. Core Database Design Principles

To ensure consistency, scalability, and ease of maintenance, all developers and database designers must adhere to these design principles:

### 1.1. Core Principles

* **Database-First Design:** Database tables, data types, relationships, constraints, and validation rules must be defined before writing application-level code.
* **Separation of Master and Transactional Data:** Master tables (e.g., `customers`, `menu_items`) must remain decoupled from transactional logs (e.g., `invoice_items`, `stock_ledger_entries`). Transaction tables must copy values (like price, tax rate) during the transaction rather than referencing master rows to prevent history modifications.
* **OLTP vs. Reporting Boundaries:** Online Transaction Processing (OLTP) tables must be optimized for write speed and normal forms (3NF). Operational reports must query read-only database replicas or materialized views to prevent performance hits on transactional servers.
* **Microservices Readiness:** Keep database schemas modular. Do not perform direct database joins between schemas (e.g., joining `crm` and `billing` tables). Instead, use ID references so tables can be easily split into separate databases when needed.

---

## 2. Schema Organization Standards

The database is divided into logical Postgres schemas to isolate functional boundaries:

* **Domain Schema Boundaries:** Tables belonging to a specific functional area must reside within their respective schema (e.g., `crm.leads`, `inventory.warehouses`).
* **Shared Utilities Schema (`shared`):** Contains shared helper tables (e.g., global currencies, zip code coordinates) and system functions (e.g., audit triggers, JSON converters).
* **Archive Schema (`archive`):** Houses historical transaction tables. Older records (e.g., completed events from two years ago) are moved to the `archive` schema to keep active tables small.

---

## 3. Table & Column Naming Standards

Consistent naming helps keep ORMs, APIs, and query builders easy to read:

### 3.1. General Naming Conventions

* **Table Names:** Must be strictly **lowercase**, **plural**, and use **snake_case** (e.g., `purchase_order_items`, `event_spaces`).
* **Lookup Tables:** Name with a `_type` or `_status` suffix (e.g., `event_statuses`, `payment_types`).
* **Bridge Tables:** Name by combining both table names in alphabetical order (e.g., `events_staff`).

### 3.2. Column Naming Conventions

* **Primary Keys:** Named `id` (UUIDv7 typed) in all tables.
* **Amounts & Quantities:** Use specific suffixes: `_amount` for money values (e.g., `tax_amount`, `grand_total_amount`), `_qty` for count values (e.g., `ordered_qty`, `shipped_qty`), and `_rate` for percentages (e.g., `sales_tax_rate`).
* **Dates & Times:** Use specific suffixes: `_date` for dates (e.g., `event_date`) and `_at` for timestamps (e.g., `created_at`, `deleted_at`).
* **Booleans:** Use `is_` or `has_` prefixes (e.g., `is_active`, `has_dietary_restriction`).

---

## 4. Mandatory Standard Columns

Every table created in the transactional database must contain these standard columns for audit, tracking, and recovery:

```sql
-- Standard Column Set Template
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
company_id UUID NOT NULL REFERENCES masterdata.companies(id),
city_id UUID NOT NULL REFERENCES masterdata.cities(id),
branch_id UUID NOT NULL REFERENCES masterdata.branches(id),
is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
deleted_at TIMESTAMP WITH TIME ZONE,
deleted_by UUID,
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by UUID,
version_no INT NOT NULL DEFAULT 1,
external_reference_id VARCHAR(100),
source_system VARCHAR(50) DEFAULT 'ERP_WEB',
metadata_json JSONB
```

### 4.1. Core Columns Specification

* **`id`:** Unique identifier (UUIDv7 type).
* **`company_id` / `city_id` / `branch_id`:** Enforces multi-tenant and branch data isolation.
* **`is_deleted` / `deleted_at` / `deleted_by`:** Standard columns for soft deletion.
* **`created_at` / `created_by` / `updated_at` / `updated_by`:** Standard columns for audit logs.
* **`version_no`:** Incrementing integer used for optimistic locking.
* **`external_reference_id` / `source_system`:** Links data to external systems (e.g., Salesforce, QuickBooks).
* **`metadata_json`:** A flexible JSONB field used for optional attributes, preventing database schema changes.

---

## 5. Key Strategies

### 5.1. Primary Key Strategy: UUIDv7
* The system uses **UUIDv7** for primary keys. UUIDv7 keys are time-sorted, which improves index lookup speeds in PostgreSQL.
* Sequence auto-increments (bigint) are restricted to invoice/document numbers where gaps are not allowed (e.g., `NY-INV-10023`).

### 5.2. Foreign Key Standards & Soft Deletes
* **Relational Rules:** Use `ON DELETE RESTRICT` for parent-child relations (e.g., preventing a vendor from being deleted if they have active invoices).
* **Soft Delete Propagation:** Cascade actions must not be handled by the database engine. The application layer must trigger soft deletes sequentially to ensure the audit logs (`deleted_by`) are correct.

---

## 6. Indexing Standards

To maintain fast query response times as databases scale:

1. **Foreign Key Indexes:** Every foreign key column (`_id`) must have an index.
2. **Partial Indexes:** Optimize soft-delete queries by adding partial indexes (e.g., `WHERE is_deleted = false`).
3. **GIN Indexes:** Add Generalized Inverted Index (GIN) on the `metadata_json` column to speed up JSON lookups.
4. **Index Naming Standard:**
   ```sql
   CREATE INDEX idx__[table_name]__[column_name] ON schema_name.table_name(column_name) WHERE is_deleted = false;
   ```
