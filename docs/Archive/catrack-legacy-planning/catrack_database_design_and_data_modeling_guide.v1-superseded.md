# Catrack Database Design Standards & Data Modeling Guide
**Catrack ERP Platform Database Architecture Handbook**
**Document Version:** 1.0.0  
**Classification:** Database Architecture Standard  
**Status:** Approved Reference Standard  

---

## 1. Database Philosophy & Core Objectives

The Catrack database architecture is built to ensure long-term data integrity, transactional performance, security, and multi-tenant isolation. To achieve these goals, the database layer follows strict architectural constraints:

*   **Transactional Integrity (ACID):** Strict transactional safety governs all state mutations. Financial ledgers, event bookings, and inventory dispatches must be executed in atomic transactions.
*   **Logical Multi-Tenant Isolation:** Multi-tenancy is implemented logically. Every database record must be associated with a specific tenant identity to prevent unauthorized cross-tenant data access.
*   **Scale-Out Performance:** High-frequency read queries must be optimized using caching layers and proper indexing. Transactional operations are isolated from analytical queries to prevent performance degradation under heavy load.
*   **Auditability by Default:** All changes to transactional records write to an immutable audit trail.

---

## 2. Database Layering Architecture

The Catrack database is structured into seven logical layers, separating concerns from platform-wide configurations down to reporting views:

```
+-------------------------------------------------------------------------+
|                            PLATFORM LAYER                               |
|        (Tenant Master  ·  Base Modules  ·  Global Configurations)       |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                             SHARED TABLES                               |
|       (Users  ·  Roles  ·  Permissions  ·  Global Currencies)           |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                            BUSINESS TABLES                              |
|   (Customers  ·  Warehouses  ·  Venues  ·  Recipes  ·  Vendors)        |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          TRANSACTIONAL TABLES                           |
|      (Events  ·  Purchase Orders  ·  Laundry Batches  ·  Invoices)      |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                             AUDIT TABLES                                |
|    (Immutable Activity Logs  ·  Security Alerts  ·  Change Records)     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                            HISTORY TABLES                               |
|   (Archived Event Records  ·  Historic Pricing  ·  Ledger Rollups)      |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           REPORTING VIEWS                               |
|   (Materialized Summaries  ·  Vendor Aging  ·  Operational Dashboards)  |
+-------------------------------------------------------------------------+
```

### 1. Platform Layer
*   **Responsibility:** The root layer. It manages tenant accounts, licenses, system configurations, and module registrations.
*   **Characteristics:** Read-heavy, static structure. System administrators only modify this layer.

### 2. Shared Tables
*   **Responsibility:** Manages platform entities shared across domains, including user profiles, roles, permissions, currencies, and documents.
*   **Characteristics:** Referenced by all other business domains using foreign key relationships.

### 3. Business Tables (Master Data)
*   **Responsibility:** Manages master records like Customers, Suppliers, Warehouses, Venues, Recipes, and Vehicles.
*   **Characteristics:** Read-heavy, slow-mutating tables. Records are scoped by tenant and branch identifiers.

### 4. Transactional Tables
*   **Responsibility:** Manages high-frequency daily operations, including Events, Functions, Purchase Orders, Laundry Batches, and Invoices.
*   **Characteristics:** Write-heavy tables that execute under strict transaction locks.

### 5. Audit Tables
*   **Responsibility:** Tracks all mutations to business and transactional tables.
*   **Characteristics:** Write-only, immutable structures. Deletes and updates are blocked by the database engine.

### 6. History Tables
*   **Responsibility:** Holds archived records and transactional snapshots (e.g., event data from previous fiscal years).
*   **Characteristics:** Optimized for compressed storage and long-term search operations.

### 7. Reporting Views
*   **Responsibility:** Provides compiled, query-ready data abstractions for frontend dashboards and business reports.
*   **Characteristics:** Non-updatable, query-optimized views. These are refreshed asynchronously using background jobs.

---

## 3. Data Modeling Standards

To maintain consistency across all modules, developers must follow these database design rules:

### Primary Keys & Key Strategy
*   **Rule:** All tables must use **UUIDv4** keys (or CUID strings) for primary identifiers. 
*   **Rationale:** UUIDs prevent primary key conflicts during offline synchronization and data migrations. Do not expose auto-incrementing integers to public API paths.

### Standard Audit Fields
Every business and transactional table must include these audit columns:

| Column | Type | Nullable | Rationale |
|---|---|---|---|
| `createdAt` | DateTime | No | Records the exact creation timestamp. |
| `createdBy` | UUID | No | Maps to the User ID responsible for creation. |
| `updatedAt` | DateTime | No | Automatically updated on record changes. |
| `updatedBy` | UUID | No | Maps to the User ID responsible for the update. |

### Soft Delete Policy
*   **Rule:** Standard business data must not be deleted from the database.
*   **Implementation:** Use `isDeleted Boolean @default(false)` and `deletedAt DateTime?` columns. All read queries must filter on `isDeleted = false` by default.

---

## 4. Multi-Tenant Partitioning

Catrack uses a logical multi-tenant isolation model to separate customer accounts:

```
+--------------------------------------------------------------------------+
|                     LOGICAL TENANT PARTITIONING                          |
+--------------------------------------------------------------------------+
|                                                                          |
|   Database Table (e.g., catering_events)                                 |
|   +----+----------+-----------+------------+-------------------------+   |
|   | ID | tenantId | companyId |  branchId  | Event Details           |   |
|   +----+----------+-----------+------------+-------------------------+   |
|   | 01 | tenant_A | company_A |  branch_A1 | Wedding Banquet         |   |
|   | 02 | tenant_A | company_A |  branch_A2 | Corporate Lunch         |   |
|   | 03 | tenant_B | company_B |  branch_B1 | Birthday Party          |   |
|   +----+----------+-----------+------------+-------------------------+   |
|                                                                          |
|   * System automatically appends "WHERE tenantId = CurrentTenant" to    |
|     prevent cross-tenant data leaks.                                     |
|                                                                          |
+--------------------------------------------------------------------------+
```

*   **Logical Isolation:** Every row scoped to a tenant must contain a `tenantId` parameter. 
*   **Data Integrity:** API queries must check the user's token and automatically append a `WHERE tenantId = user.tenantId` filter to all database queries.
*   **Branch Partitioning:** Multi-branch operations require records to be marked with a `branchId` to support local inventory checks, driver routing, and tax calculations.

---

## 5. Indexing & Optimization

Proper indexing ensures the system maintains low query latencies as datasets grow:

*   **Foreign Key Indexes:** Every foreign key relationship must have a database index defined. This prevents table scans during join operations.
*   **Composite Indexes:** High-frequency search queries must use composite indexes matching their filter parameters.
    *   *Example:* Indexing `(tenantId, isDeleted, status)` on transactional tables.
*   **JSONB Indexing:** Custom fields and metadata stored in PostgreSQL `JSONB` columns must use **GIN (Generalized Inverted Index)** indexes to support fast lookups.

---

## 6. Audit & History Design

The Audit layer operates under strict security rules:

*   **Immutability:** Audit tables are write-only. Database permissions block `UPDATE` and `DELETE` operations on these tables.
*   **Log Structure:** Every audit record must capture:
    *   `id`: Primary key (UUIDv4)
    *   `tenantId`: Tenant context
    *   `actorId`: User responsible for the change
    *   `actionType`: Type of operation (`CREATE`, `UPDATE`, `DELETE`, `TRANSITION`)
    *   `entityName`: Target table name
    *   `entityId`: Target record UUID
    *   `payload`: JSON diff capturing old values and new values

---

## 7. Reporting Views & Materialized Aggregations

To protect transaction performance, reporting queries are isolated from live tables:

*   **Query-Ready Views:** Analytical dashboards read data from pre-compiled PostgreSQL views instead of executing complex joins on transactional tables.
*   **Materialized Views:** Large reports (like vendor aging or annual revenue summaries) use Materialized Views that are updated asynchronously using background cron jobs.

---

## 8. Database Migration Workflow

To prevent database conflicts and downtime, migrations must follow these rules:

*   **Deliveries via Migration Files:** All database changes must be delivered through Prisma migrations. Direct schema modifications are prohibited.
*   **Zero-Downtime Alterations:** Avoid schema modifications that lock tables. Large database updates (such as adding nullable columns or indexes) must run in phases:
    1.  Add new fields as nullable columns.
    2.  Write data update scripts.
    3.  Set constraints and indexes once data is populated.
*   **Rollback Scripts:** Major migrations must include verification tests and rollback scripts to restore the schema in the event of an upgrade failure.

---

## 9. Future Extensions & Governance

*   **Schema Modifications:** Database schema changes require approval from the Principal Architect to prevent structural changes that could affect performance.
*   **Model Isolation:** Domains must not query database tables belonging to other bounded contexts directly. Instead, they must consume data through API endpoints or shared service layers.
*   **Data Archiving Policy:** Operational data exceeding two years of age is moved to history tables to keep primary transactional tables optimized for active operations.
