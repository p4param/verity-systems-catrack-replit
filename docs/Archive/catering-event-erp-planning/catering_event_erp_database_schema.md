# Master Database Schema & Naming Conventions
**Document Code:** ERP-DBS-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Data Architect & ERP Database Designer  

---

## 1. Database Architecture Decisions

To support high transaction volumes, multi-tenancy, and long-term modular decomposition, we make the following database architecture design decisions:

### 1.1. Key Decisions & Rationales

| Decision Area | Chosen Strategy | Technical Justification |
|---|---|---|
| **Database Instance** | Single Database Instance (Logical Schemas) | Provides a balance of low initial cost, easy cross-schema queries for global reporting, and simple migrations. |
| **Primary Keys** | UUIDv7 (Time-Ordered UUIDs) | Provides the security and uniqueness of UUIDs while maintaining index sorting (similar to auto-incrementing IDs), preventing index fragmentation. |
| **Concurrency Control**| Optimistic Locking (`version` column) | Prevents write-write conflicts on shared resources (like event spaces or inventory items) without locking database tables. |
| **Soft Delete** | `deleted_at` timestamp with filtered views | Retains relational integrity for historical audit reports while hiding inactive data from standard application views. |
| **Temporal Data** | System-period versioning on transaction tables | Tracks historical states for audits (e.g., changes to quotes and menus) by writing historical versions to secondary tables. |
| **Partitioning** | Range Partitioning by `created_at` | Applied to high-volume transaction tables (`AuditLog`, `LedgerEntry`) by year to keep active indices small and fast. |

---

## 2. Enterprise Naming Conventions

Strict naming conventions ensure consistency across database models, ORMs, and API data transfer objects (DTOs):

* **General Rule:** All database identifiers must use **snake_case** and be strictly lowercase.
* **Schemas:** Singular nouns representing functional domains (e.g., `crm`, `finance`, `security`).
* **Tables:** Plural nouns representing entities (e.g., `companies`, `employees`, `purchase_orders`).
* **Columns:** Singular nouns (e.g., `first_name`, `created_at`). Boolean columns must use `is_` or `has_` prefixes (e.g., `is_active`, `has_dietary_restriction`).
* **Primary Keys:** Named `id` (UUIDv7 typed) in all tables.
* **Foreign Keys:** Named `[singular_parent_table_name]_id` (e.g., `company_id`). Constraint names must follow: `fk__[current_table]__[parent_table]`.
* **Indexes:** Constraint names must follow: `idx__[table_name]__[columns_joined_by_underlines]` (e.g., `idx__customers__email`).
* **Enums:** Suffix with `_type` or `_status` (e.g., `event_status`, `payment_method`).

---

## 3. Database Schema Organization

The database is divided into **20 logical PostgreSQL schemas** to isolate functional modules:

```
[PostgreSQL Instance]
   ├── [core]           -- Shared basic system engines
   ├── [security]       -- User credentials, RBAC, tokens
   ├── [masterdata]     -- Core company, customer, and vendor configurations
   ├── [crm]            -- Leads, inquiries, and quotations
   ├── [events]         -- Event workspace and run-sheets
   ├── [menu]           -- Menus and package setups
   ├── [recipes]        -- Production recipes and scale factors
   ├── [inventory]      -- Stocks, transfers, and asset audits
   ├── [procurement]    -- Purchases, orders, and receiving logs
   ├── [finance]        -- Invoices, ledger entries, and tax setups
   ├── [logistics]      -- Dispatch, vehicles, and runs
   ├── [staff]          -- HR rosters and shift entries
   ├── [documents]      -- PDF storage files and layouts
   ├── [notifications]  -- Alerts, SMS, and email queues
   ├── [reports]        -- DB views for general exports
   ├── [audit]          -- Immature transaction log tables
   ├── [integration]    -- Third-party webhook sync tables
   ├── [workflow]       -- State engine transition setups
   ├── [analytics]      -- Aggregated snapshot tables
   └── [vendors]        -- Vendor billing agreements
```

---

## 4. Master Data Schema Design DDL

Below are the production-ready DDL definitions for the 14 core master tables, complete with constraints, indexes, and audit columns.

### 4.1. Core System & Regional Setup

```sql
-- 1. Companies Table (Tenant Boundary)
CREATE TABLE masterdata.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Client-side or trigger generates UUIDv7
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tax_identifier VARCHAR(50) NOT NULL UNIQUE,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Cities Table
CREATE TABLE masterdata.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES masterdata.companies(id),
    name VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__cities__companies FOREIGN KEY (company_id) REFERENCES masterdata.companies(id)
);
CREATE INDEX idx__cities__company ON masterdata.cities(company_id);

-- 3. Branches Table (Kitchens/Hubs)
CREATE TABLE masterdata.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE, -- e.g., "NY-MAN", "LA-DT"
    name VARCHAR(150) NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    postal_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__branches__cities FOREIGN KEY (city_id) REFERENCES masterdata.cities(id)
);
CREATE INDEX idx__branches__city ON masterdata.branches(city_id);

-- 4. Departments Table
CREATE TABLE masterdata.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "Sales", "Kitchen", "Logistics"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__departments__branches FOREIGN KEY (branch_id) REFERENCES masterdata.branches(id)
);
CREATE INDEX idx__departments__branch ON masterdata.departments(branch_id);

-- 5. Warehouses Table
CREATE TABLE masterdata.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL, -- e.g., "Cold Storage A", "Dry Linen Room"
    type VARCHAR(50) NOT NULL DEFAULT 'STANDARD', -- e.g., Cold, Dry, Transit
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__warehouses__branches FOREIGN KEY (branch_id) REFERENCES masterdata.branches(id)
);
CREATE INDEX idx__warehouses__branch ON masterdata.warehouses(branch_id);
```

### 4.2. Security & Access Control

```sql
-- 6. Roles Table
CREATE TABLE security.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL, -- e.g., "Branch Manager"
    code VARCHAR(50) NOT NULL, -- e.g., "BRANCH_MANAGER"
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk__roles__companies FOREIGN KEY (company_id) REFERENCES masterdata.companies(id)
);
CREATE UNIQUE INDEX idx__roles__company_code ON security.roles(company_id, code);

-- 7. Permissions Table
CREATE TABLE security.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL, -- e.g., "INVENTORY"
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "INVENTORY.RECEIVE_STOCK"
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3. Business Contacts & Staff

```sql
-- 8. Employees Table
CREATE TABLE masterdata.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__employees__branches FOREIGN KEY (branch_id) REFERENCES masterdata.branches(id)
);
CREATE INDEX idx__employees__branch ON masterdata.employees(branch_id);

-- 9. Customers Table
CREATE TABLE masterdata.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL, -- Corporate or personal name
    type VARCHAR(20) NOT NULL DEFAULT 'CORPORATE', -- INDIVIDUAL, CORPORATE
    tax_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__customers__companies FOREIGN KEY (company_id) REFERENCES masterdata.companies(id)
);
CREATE INDEX idx__customers__company ON masterdata.customers(company_id);

-- 10. Contact Persons Table
CREATE TABLE masterdata.contact_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk__contact_persons__customers FOREIGN KEY (customer_id) REFERENCES masterdata.customers(id)
);
CREATE INDEX idx__contact_persons__customer ON masterdata.contact_persons(customer_id);

-- 11. Vendors Table
CREATE TABLE masterdata.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tax_number VARCHAR(50),
    payment_terms_days INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__vendors__companies FOREIGN KEY (company_id) REFERENCES masterdata.companies(id)
);
CREATE INDEX idx__vendors__company ON masterdata.vendors(company_id);
```

### 4.4. Localization & Configuration Masters

```sql
-- 12. Currencies Table
CREATE TABLE masterdata.currencies (
    code VARCHAR(3) PRIMARY KEY, -- ISO 4217 code (e.g. USD, EUR, INR)
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_places INT NOT NULL DEFAULT 2
);

-- 13. Taxes Table
CREATE TABLE masterdata.taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "State Sales Tax"
    rate NUMERIC(5,4) NOT NULL, -- e.g. 0.0825 (8.25%)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__taxes__cities FOREIGN KEY (city_id) REFERENCES masterdata.cities(id)
);
CREATE INDEX idx__taxes__city ON masterdata.taxes(city_id);

-- 14. Units of Measure (UOM)
CREATE TABLE masterdata.units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL, -- e.g., "KG", "LITER", "BOX-12"
    description VARCHAR(100) NOT NULL,
    conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1.0000, -- Conversion factor to baseline
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk__uom__companies FOREIGN KEY (company_id) REFERENCES masterdata.companies(id)
);
CREATE UNIQUE INDEX idx__uom__company_code ON masterdata.units_of_measure(company_id, code);
```
