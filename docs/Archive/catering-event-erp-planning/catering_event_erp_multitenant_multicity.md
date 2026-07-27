# Multi-Tenant & Multi-City Architecture Specification
## Multi-Company Catering & Event Management ERP Platform
**Document Code:** ERP-MTA-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Solution Architect  

---

## 1. Tenancy & Isolation Strategy

To support the transition from a single catering company operating in multiple cities to a fully commercialized multi-tenant SaaS platform, we employ a **Hybrid Multi-Tenant Model**:

```
                              ┌──────────────────────────────────────────────┐
                              │            Global Router Database            │
                              │ - Active Tenants & Billing Status            │
                              │ - Domain Mappings & Database Route Tables    │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                 ┌───────────────────┴───────────────────┐
                                 ▼                                       ▼
                  ┌──────────────────────────────┐       ┌──────────────────────────────┐
                  │      Tenant DB Cluster 1     │       │      Tenant DB Cluster 2     │
                  │                              │       │                              │
                  │  ┌────────────────────────┐  │       │  ┌────────────────────────┐  │
                  │  │     Tenant Schema:     │  │       │  │     Tenant Schema:     │  │
                  │  │      "company_a"       │  │       │  │      "company_c"       │  │
                  │  └───────────┬────────────┘  │       │  └────────────────────────┘  │
                  │              │               │       │                              │
                  │  ┌───────────▼────────────┐  │       │                              │
                  │  │     Tenant Schema:     │  │       │                              │
                  │  │      "company_b"       │  │       │                              │
                  │  └────────────────────────┘  │       │                              │
                  └──────────────────────────────┘       └──────────────────────────────┘
```

### 1.1. Schema-Based Multi-Tenancy (Logical Separation)
* **Single Tenant Scale:** Each tenant (parent corporate entity or franchise holder) is assigned a dedicated PostgreSQL database schema.
* **Shared Database Cluster:** Multiple schemas are housed inside a single database instance to minimize server costs during early growth stages.
* **Easy Migration to Dedicated DBs:** Because all schemas share a identical internal structure, any schema can be extracted and restored onto dedicated hosting hardware without changing the application's queries.
* **Gateway Routing:** An API router interceptor reads the request header (or request domain `tenant-subdomain.platform.com`) and points the database connection pool directly to the target schema.

---

## 2. Organizational Hierarchy Design

To support complex business structures, the database models represent a strict hierarchy:

```
[Holding Company] 
       └── [Company / Legal Entity] 
                 └── [City / Territory] 
                           └── [Branch / Operational Hub] 
                                     ├── [Warehouse / Store] 
                                     └── [Department] 
```

### 2.1. Hierarchy Entities
1. **Company (Tenant-Level):** The highest organizational boundary. Holds distinct legal registrations, tax accounts, and master settings.
2. **City (City-Level):** Represents regional hubs (e.g., New York, Los Angeles). Manages regional logistics pricing and tax groups.
3. **Branch (Branch-Level):** A physical facility (central kitchen or banquet hall). Executes local orders and maintains a workforce roster.
4. **Department (Operational Boundary):** Division inside a branch (e.g., Cold Kitchen, Pastry, Logistics, Sales). Used to allocate costs.
5. **Warehouse/Store (Stock Location):** An inventory storage spot (e.g., dry store, walk-in freezer, linens cage).

---

## 3. Master Data Classification & Ownership Matrix

To prevent data duplicates while maintaining local modifications, masters are categorized across five ownership levels:

| Master Data Type | Classification Level | Shared Visibility | Local Override Scope |
|---|---|---|---|
| **Customers** | Company Level | Visible across all cities and branches of a company to coordinate corporate contracts. | Branch-specific client pricing contracts and historical sales notes. |
| **Contacts** | Company Level | Shared across branches to prevent duplicate sales reachouts. | Regional contact details and event preferences. |
| **Vendors** | Company Level | Master registry of partners (florists, third-party staff, equipment hires). | Local vendor branch contact details and localized rate cards. |
| **Menu Items** | Company Level | Standardized corporate menu templates to maintain brand quality. | Branch-level menu pricing and temporary ingredient substitutions. |
| **Recipes** | Company Level | Core kitchen recipes, preparation steps, and yields. | Non-modifiable by branches (prevents dish quality deviations). |
| **Resources (Assets)** | Warehouse Level | Unique assets (ovens, trucks, plates, linens) are owned by specific warehouses. | Cross-branch booking availability (read-only for sister branches). |
| **Vehicles** | Branch Level | Delivery trucks are assigned to a home branch depot. | Temporary operational allocation to sister branches during peak seasons. |
| **Staff** | Branch Level | Employees are assigned to a home branch roster. | Roster sharing across branches (cross-utilization billing). |
| **Expense Categories**| Company Level | Unified chart of accounts for standardized financial reporting. | Non-modifiable by branches. |
| **Taxes** | City Level | Localized sales tax brackets based on event location. | Event-specific tax exemptions. |
| **Templates** | Company Level | standard event layouts, run-sheets, BEO layout patterns. | Branch-specific header assets and logos. |
| **Notification Config** | Branch Level | Local messaging configuration (e.g., local manager notification settings). | Individual staff profile alert selections. |
| **Number Series** | Branch Level | Invoice/BEO numbering prefixed by branch code (e.g., NY-INV-10023, LA-INV-10023). | Non-modifiable. |
| **Configurations** | Branch Level | Operational parameters (e.g., kitchen lead times, shift rosters). | Branch manager configuration. |

---

## 4. Resource & Inventory Sharing Architecture

Operating across multiple locations requires strict cross-utilization rules:

### 4.1. Inter-Branch Transfer Workflow
When Branch A borrows resources (linens, plates, or vehicles) from Branch B, the system triggers a **Stock Transfer Order**:

```
[Branch A: Requisition Request] ──> [Branch B: Stock Approval] ──> [Stock Locked at Branch B]
                                                                          │
[Branch A: Receive Check-In]    ◄── [Logistics Dispatch Delivery] ◄───────┘
```

* **Audit Trail:** The inventory system transfers stock using a double-entry ledger. A "Transit Location" holds custody of the items during transport.
* **Inter-Company Billing:** The ERP automatically posts a balance-due journal entry to reflect the rent fee from Branch B to Branch A, keeping local branch P&L metrics accurate.

### 4.2. Centralized Procurement with Branch Execution
* **Consolidation:** The system runs a nightly check on inventory deficits across all warehouses in a city.
* **Bulk Order:** A single bulk purchase order (PO) is generated to secure bulk discount rates from vendors.
* **Local Delivery:** The vendor splits the bulk delivery across designated branch kitchens, with each kitchen running independent receiving checks on-site.

---

## 5. Role-Based Access Control (RBAC) Scopes

User permissions are tied to strict hierarchical scopes:

```
[Super Admin] ──────► Global Systems & Root Configuration (All Schemas)
    └─► [Company Admin] ──► Tenant Corporate Operations (Full Schema)
          └─► [Regional Manager] ──► Local City Aggregates (Selected Cities)
                └─► [Branch Manager] ───► Local Hub Operations (Single Branch)
                      └─► [Department Staff] ─► Specific Functional Action (Kitchen / Warehouse)
```

| Role | Access Scope | Primary Actions |
|---|---|---|
| **Super Administrator** | Global Router + All Tenant Databases | Tenant provisioning, billing settings, and root infrastructure management. |
| **Company Administrator** | Tenant Database Schema (All Cities) | Tenant-wide settings, user setups, master data approval, and corporate P&L reviews. |
| **Regional Manager** | Assigned City Scopes | Regional calendar management, branch performance reviews, and cross-branch inventory approvals. |
| **Branch Manager** | Single Branch Scope | Roster scheduling, local warehouse checks, local vendor orders, and BEO approvals. |
| **Sales Team** | Assigned Leads & Events | Lead generation, quotation building, client billing management, and layout designs. |
| **Operations Team** | Event Workspace Scopes | Task execution, event run-sheets check-offs, and driver coordination. |
| **Accounts Team** | Tenant Financial Ledger | Invoices, payroll reconciliation, vendor billing audits, and regional tax reviews. |
| **Warehouse Team** | Assigned Warehouse | Stock receiving, damage audits, asset scanning, and load-out checks. |
| **Kitchen Team** | Branch Kitchen Scope | Recipe preparation, batch scaling, production lists, and hot dispatch checks. |
| **Vendors** | Assigned POs / Contracts | View delivery schedules, bid on contract quotes, and upload invoices. |
| **Customers** | Private Customer Portal | View quotations, select menus, pay deposits, and track delivery countdowns. |

---

## 6. Financial Segregation & Consolidation

Operating multiple entities requires independent bookkeeping alongside rolled-up corporate reporting:

* **Independent Bookkeeping:** Every transaction (invoice, wage payment, purchase order) is assigned to a specific **Branch Cost Center**. Local sales tax is calculated and logged under the City Entity.
* **Multi-Currency Capability:** Transactions are recorded in local operational currencies, then converted to the corporate holding currency for roll-up reports.
* **Consolidated Dashboards:** Executives can review consolidated performance dashboards (Revenue, Net Profit Margin, Asset Utilization) at Branch, City, Company, or multi-company corporate levels. Inter-company transfer transactions are automatically omitted from rolled-up totals to prevent double-counting.
