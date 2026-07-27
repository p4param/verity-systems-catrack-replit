# Organization Structure, User Management, & Security Policies Handbook
**Document Code:** ERP-OSP-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Security Architect & Enterprise Org Design Consultant  

---

## 1. Enterprise Organization Hierarchy & Matrix Reporting

To scale operations across multiple cities while maintaining control, the ERP supports a matrix organizational hierarchy:

```
[Holding Company] 
       └── [Region (e.g., East Coast)] 
                 └── [City Hub (e.g., New York)] 
                           └── [Branch Facility (e.g., Manhattan Central Kitchen)] 
                                     └── [Departments (Sales, Kitchen, Logistics)] 
                                               └── [Teams (Cold Prep, Hot Prep, Delivery)] 
                                                         └── [Employees (Line Cooks, Drivers)] 
```

### 1.1. Complex Reporting Workflows
* **Dotted-Line Reporting:** Employees can report to both a functional manager (e.g., Executive Chef for cooking standards) and a local manager (e.g., Branch Manager for roster schedules).
* **Acting Managers:** Supervisors can assign acting management coverage (with matching database permissions) for defined windows (e.g., during vacation leaves) which auto-expire.
* **Cross-Branch Resource Pools:** Staff (like servers or cooks) can be shared across branches during peak times, with the system tracking labor costs back to the host branch.

---

## 2. Department Governance Framework

Each department has defined operational scopes, KPIs, and approval authority limits:

| Department | Primary Responsibilities | Target KPI Metric | Approval Authority |
|---|---|---|---|
| **Sales** | Capture inquiries, draft quotes, convert accounts, manage layout details. | Quotation conversion rate. | Offers discounts up to 5%. |
| **Kitchen Production** | Meal prep, recipe execution, yield audits, kitchen hygiene. | Food cost variance & wastage. | Ingredient recipe adjustments. |
| **Stores & Inventory** | Stock counts, stock intake checks, returns logging, scrap reports. | Inventory count accuracy. | Stock write-offs up to $250. |
| **Procurement** | Purchase requisitions, vendor negotiations, purchase orders. | Supplier lead times. | Issue POs up to $5,000. |
| **Finance & Accounts** | Invoicing, ledger entries, tax filings, vendor payouts, staff payroll. | Accounts Receivable days. | Process payments up to $1,000. |
| **Logistics** | Fleet tracking, run-sheet execution, driver schedules, BEO checks. | On-time delivery rate. | Vehicle route changes. |
| **IT & Admin** | User setups, access review, backups, system updates, error tracking. | API latency and system uptime. | System configurations. |

---

## 3. User Lifecycle Management Workflows

Access control transitions are strictly managed throughout an employee's employment cycle:

```
[Onboarding] ──► [HR Roster Entry] ──► [Auto-Provisioning based on Role]
                                                │
[Offboarding] ◄── [Deactivate Account] ◄── [Revoke Active Access Tokens]
```

* **User Onboarding:** HR creates the employee record. The ERP automatically generates a secure identity profile and assigns default read-only permissions based on role and branch.
* **Employee Promotion/Transfer:** When an employee transfers, the branch manager submits an Access Modification Request. The ERP updates the active branch scopes and revokes access to the previous branch.
* **Offboarding & Access Revocation:** Upon termination, the account is immediately suspended. All active session tokens in Redis are deleted, database access is blocked, and access credentials are deleted.

---

## 4. Access Governance & Privileged Access Management (PAM)

To protect sensitive information, access reviews are conducted systematically:

* **Privileged Access Management (PAM):** Super Administrator and database console accesses require session tracking, mandatory MFA, and temporary permissions (time-locked to a maximum of 4 hours).
* **Emergency Access ("Firecall"):** In operational emergencies, temporary elevated access can be requested. This action requires approval from the Branch Director and generates automated alerts to the Security Audit team.
* **Access Reviews:** The system prompts administrators to perform access reviews for administrative and financial accounts every 90 days.

---

## 5. Segregation of Duties (SoD) Control Matrix

To prevent internal fraud, the ERP enforces strict Segregation of Duties. Employees cannot hold conflicting roles or perform incompatible actions:

```
                          ┌───────────────────────────┐
                          │    Sales Manager Quote    │
                          └─────────────┬─────────────┘
                                        │
                                        ▼ CANNOT APPROVE OWN QUOTE
                          ┌───────────────────────────┐
                          │    Branch Director Review   │
                          └─────────────┬─────────────┘
                                        │
                                        ▼ CANNOT PAY OWN PURCHASE
                          ┌───────────────────────────┐
                          │    Finance Payout Run     │
                          └───────────────────────────┘
```

### 5.1. Segregation of Duties (SoD) Incompatible Scopes

| User Function | Incompatible Role | Operational Control |
|---|---|---|
| **Sales & Quotations** | Billing & Invoicing | Sales managers cannot generate invoices or log client payments. |
| **Procurement & POs** | Receiving & Stock Counts | Staff creating purchase orders cannot check in those deliveries at warehouses. |
| **Payments** | Bank Account Settings | Accounts staff processing vendor payouts cannot modify vendor bank account details. |
| **System Admin** | Financial Transactions | IT administrators cannot post ledger entries, create invoices, or adjust prices. |
| **Credit Adjustments** | Customer Inquiries | Accounts staff handling invoice adjustments cannot manage sales lead cycles. |
