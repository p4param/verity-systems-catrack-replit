# Catrack Business Domain Model & Ubiquitous Language Handbook
**Catrack ERP Platform Ubiquitous Language Constitution**
**Document Version:** 1.0.0  
**Classification:** Business Architecture Standard  
**Status:** Approved Reference Standard  

> [!NOTE]
> **Source Lineage:** Migrated verbatim from AG Brain `catrack_domain_model_and_ubiquitous_language.md` as part of the docs/ repository migration — see `docs/project-governance/MIGRATION-LOG.md`. Phase 1 review recommended splitting this into a stable terminology glossary vs. a domain-boundary map (which evolves per Business Work Package); that split was not performed in this migration pass — tracked in `docs/project-governance/FOLLOW-UP-GOVERNANCE-ITEMS.md` §7.

---

## 1. Introduction

### What is Ubiquitous Language?
Ubiquitous Language is a core practice of Domain-Driven Design (DDD). It is a unified, shared language developed by software engineers, product managers, quality assurance analysts, and business domain experts. This language is used consistently across all forms of communication—from business requirement documents and user interface designs to API specifications, database tables, and variable names in the source code.

### Importance of Terminology Consistency
In a complex ERP ecosystem like Catrack, terminology confusion can lead to bugs and operational issues. For example:
*   If sales reps refer to a customer booking as an "Order," warehouse coordinators call it a "Job," and developers name it a "Booking," trace integration becomes difficult.
*   By enforcing a strict 1-to-1 relationship between a business concept and its name, we eliminate duplicate definitions and ensure that all contributors consume the same data constructs.

### How to Use This Document
*   **Developers:** Must match database tables, columns, API routes, type interfaces, and variables to the defined terminology.
*   **Product Owners:** Must write all feature tickets and system requirements using this language.
*   **QA Teams:** Must design test scenarios and verification cases using these terms.
*   **AI Coding Assistants:** Must follow the naming standards outlined in this guide.

---

## 2. Business Domains

The Catrack platform is organized into decoupled business domains:

### 1. CRM
*   **Purpose:** Manages the initial prospect relationship lifecycle.
*   **Responsibilities:** Tracks contacts, records sales activities, and manages follow-ups.
*   **Inputs:** Prospect inquiries, lead forms, and referral data.
*   **Outputs:** Qualified leads and validated customer records.
*   **Dependencies:** None.

### 2. Sales & Quotation
*   **Purpose:** Governs event pricing, proposal compilation, and client contracting.
*   **Responsibilities:** Computes event costs, applies discount rates, and generates PDF proposals.
*   **Inputs:** Lead parameters, menu scale counts, and resource specifications.
*   **Outputs:** Active quotations, pricing estimates, and customer-signed contracts.
*   **Dependencies:** CRM, Event Management, Kitchen, Inventory.

### 3. Event Management
*   **Purpose:** Coordinates the setup, management, and operational execution of events.
*   **Responsibilities:** Schedules function timelines, manages venue plans, and coordinates checklists.
*   **Inputs:** Customer-signed contracts, scheduling choices, and customer requests.
*   **Outputs:** Banquet Event Orders (BEO), checklist schedules, and task assignments.
*   **Dependencies:** Sales & Quotation, CRM.

### 4. Kitchen & Menu Planning
*   **Purpose:** Coordinates recipe production, ingredient scaling, and prep schedules.
*   **Responsibilities:** Scales recipe metrics, schedules food preparation, and routes tasks to kitchen stations.
*   **Inputs:** BEO specifications, guest counts, and master recipe datasets.
*   **Outputs:** Ingredient lists, production orders, and kitchen schedules.
*   **Dependencies:** Event Management, Inventory.

### 5. Procurement & Supplier Management
*   **Purpose:** Controls raw material and equipment purchasing.
*   **Responsibilities:** Tracks purchase requisitions, manages supplier rates, and processes purchase orders.
*   **Inputs:** Raw material requests, inventory stock alerts, and supplier pricing contracts.
*   **Outputs:** Active purchase orders, Goods Receipt Notes (GRN), and supplier bills.
*   **Dependencies:** Inventory, Finance.

### 6. Inventory & Warehouse Management
*   **Purpose:** Manages physical assets, including tableware, raw ingredients, and uniforms.
*   **Responsibilities:** Controls stock-in/stock-out movements, tracks stock counts, and handles missing items.
*   **Inputs:** GRN receipts, event dispatch sheets, and stock counts.
*   **Outputs:** Real-time stock levels and stock adjustment histories.
*   **Dependencies:** Procurement.

### 7. Laundry & Logistics
*   **Purpose:** Manages the washing, repair, and replacement lifecycle of linens and uniforms.
*   **Responsibilities:** Tracks laundry dispatches, records damages, and validates vendor bills.
*   **Inputs:** Soiled asset dispatches and vendor delivery receipts.
*   **Outputs:** Verified return logs, damage updates, and vendor invoices.
*   **Dependencies:** Inventory, Finance.

### 8. Fleet & Transport Operations
*   **Purpose:** Manages vehicle dispatching, routing, and workforce deliveries.
*   **Responsibilities:** Plans delivery routes, assigns vehicles, and tracks fuel logs.
*   **Inputs:** Event schedules and dispatch lists.
*   **Outputs:** Completed vehicle trips and delivery confirmations.
*   **Dependencies:** Event Management.

### 9. Finance & General Ledger
*   **Purpose:** Consolidates financial transactions, ledger entries, and vendor bills.
*   **Responsibilities:** Handles accounts payable/receivable, records journal entries, and tracks payments.
*   **Inputs:** Quotations, vendor invoices, and cash receipts.
*   **Outputs:** General ledger records, balance sheets, and tax reports.
*   **Dependencies:** Sales, Procurement, Laundry.

---

## 3. Core Business Entities

Every core business entity is defined below:

| Entity | Domain | Business Meaning | Purpose | Lifecycle | Relationships |
|---|---|---|---|---|---|
| **Lead** | CRM | A prospective customer who has shown interest in services. | Tracks early-stage sales inquiries. | Draft -> Qualified -> Closed | 1-to-1 with Customer |
| **Customer** | CRM | An individual or company that enters into contracts. | The primary billing and contract entity. | Active -> Inactive | 1-to-many with Events |
| **Event** | Events | A scheduled gathering hosted by a Customer. | The root container for scheduling and resource use. | Tentative -> Confirmed -> Execution -> Settlement -> Completed -> Archived | 1-to-many with Functions |
| **Function** | Events | A sub-activity within an Event (e.g., Dinner). | Coordinates specific schedules, venues, and menus. | Planned -> Active -> Done | Many-to-1 with Event |
| **Venue** | Events | A physical location where a Function takes place. | Prevents scheduling conflicts at venues. | Available -> Booked | Many-to-1 with Function |
| **Recipe** | Kitchen | A standard formula of ingredients and prep steps. | Standardizes menu items and scales quantities. | Draft -> Active -> Archived | Many-to-1 with Menu |
| **Purchase Order** | Procurement | An official order sent to a Supplier. | Legally authorizes raw material purchases. | Draft -> Approved -> Dispatched -> Completed | 1-to-many with Items |
| **Laundry Batch** | Laundry | A group of soiled linens sent for cleaning. | Tracks linen quantities and losses with vendors. | Outbound -> Processing -> Returned | 1-to-many with Items |
| **Vehicle Trip** | Fleet | A planned transit route for a driver and vehicle. | Tracks event logistics and delivery tasks. | Draft -> Dispatched -> Arrived | Many-to-1 with Event |

---

## 4. Event Management Terminology

*   **Event:** A scheduled gathering hosted by a Customer (e.g., Wedding, Corporate Conference).
*   **Function:** A specific, scheduled sub-activity within an Event (e.g., Sangeet Ceremony, Main Cocktail Hour).
*   **Occasion:** The thematic classification of an Event (e.g., Birthday, Anniversary, Wedding).
*   **Guest Count (Pax):** The number of expected attendees for a Function. This serves as the multiplier for recipe scaling, table setup, and pricing.
*   **VIP Guest:** An attendee requiring special service protocols, security, or dietary tracking.
*   **Tentative Booking:** An event hold placed in the calendar before a deposit payment is processed.
*   **Confirmed Booking:** An event locked in the schedule after a signed contract and deposit payment are verified.
*   **Event Timeline:** A sequence of scheduled milestones, tasks, and alerts mapped to an Event.
*   **Captain:** The operational lead responsible for executing a specific Function on-site.
*   **Supervisor:** The field manager coordinating transport logistics and service teams.

---

## 5. CRM Terminology

*   **Lead:** A prospect showing interest in services, before qualification.
*   **Prospect:** A qualified contact who is actively considering a proposed quote.
*   **Opportunity:** A potential sales deal associated with a Customer.
*   **Contact:** The individual profile (e.g., phone, email) linked to a Customer.
*   **Quotation:** A formal proposal detailing estimated event costs and terms.
*   **Conversion:** The transition of a Lead into a Confirmed Customer.

---

## 6. Inventory Terminology

*   **Item:** Any physical asset tracked within a warehouse.
*   **Raw Material:** Unprocessed ingredients or supplies (e.g., raw chicken, napkins).
*   **Semi-Finished Good:** Prepared food elements requiring further steps (e.g., pre-made base gravy).
*   **Finished Good:** Complete assets ready for use or delivery (e.g., clean linens, plated desserts).
*   **Stock:** The current physical quantity of an Item in a specific warehouse.
*   **Batch:** A group of items received or processed together to track quality and expiration.

---

## 7. Procurement Terminology

*   **Indent:** An internal request for raw materials or assets, triggered by inventory alerts or recipe needs.
*   **RFQ (Request for Quotation):** An inquiry sent to suppliers requesting rates for raw materials.
*   **GRN (Goods Receipt Note):** A document verifying the quantity and quality of goods received at the warehouse.

---

## 8. Laundry Terminology

*   **Laundry Batch:** A group of soiled linens sent to a commercial laundry vendor.
*   **Soiled Linen:** Dirty table linens or uniforms returning from an event.
*   **Clean Linen:** Washed, ironed, and verified linens returning to the warehouse.
*   **Damaged Linen:** Linens returned from an event or laundry vendor in a torn, stained, or unusable state.

---

## 9. Finance Terminology

*   **Invoice:** An official bill sent to a Customer requesting payment.
*   **Receipt:** A document verifying a payment received from a Customer.
*   **Journal Entry:** A double-entry record capturing debits and credits in the general ledger.
*   **Voucher:** An internal document authorizing a cash disbursement or payment.

---

## 10. Relationship Diagrams

The relationships and data flow between core business entities are mapped below:

```
+--------------+        * +--------------+        * +--------------+
|   Customer   |--------->|    Event     |--------->|   Function   |
+--------------+          +--------------+          +--------------+
                                                          |
                                                          | *
                                                          v
+--------------+        * +--------------+        * +--------------+
|   Billing    |<---------|   Dispatch   |<---------|     Menu     |
+--------------+          +--------------+          +--------------+
```

---

## 11. Domain Rules

The platform enforces the following core business rules:

1.  **Event Ownership:** Every Event must belong to exactly one Customer. A Customer can book multiple Events.
2.  **Function Hierarchies:** An Event must contain at least one Function. Each Function can have a unique start time, guest count, and menu selection.
3.  **Linen Verification:** A Laundry Batch must be verified against its original dispatch count upon return. Discrepancies automatically generate a pending liability charge for the vendor.
4.  **Costing Validation:** Quotation proposals cannot be generated with margins lower than 15% without administrative override approvals.

---

## 12. Bounded Contexts

To isolate business operations and prevent data overlap, the system defines strict boundary contexts:

```
+-------------------------------------------------------------------------+
|                           BOUNDED CONTEXTS                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  [ CRM Context ]          [ Event Context ]        [ Kitchen Context ]  |
|  * Lead                   * Event                  * Recipe             |
|  * Prospect               * Function               * Kitchen Station    |
|  * Customer               * Venue                  * Prep Schedules     |
|                                                                         |
|  [ Inventory Context ]    [ Laundry Context ]      [ Finance Context ]  |
|  * Item                   * Laundry Batch          * Invoice            |
|  * Stock Level            * Soiled Linen           * Ledger Entries     |
|  * GRN                    * Damage Liabilities     * Payments           |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 13. Shared Entities

These entities are shared across multiple modules and must retain consistent structures:

*   **Customer:** Referenced by CRM for pipeline leads, Event Management for bookings, and Finance for tax invoices.
*   **Document:** Used for file attachments, contracts, and safety certificates across all modules.
*   **User:** Represents internal employees, tracking permissions and assignments.
*   **Branch:** Scopes multi-location inventory, logs, and branch-level overrides.

---

## 14. Terminology Naming Conventions

Developers and writers must follow these naming rules to ensure clarity:

*   **Always Use:** `Customer`  
    **Never Use:** `Client`, `Party`, `Account`, `Guest`
*   **Always Use:** `Event`  
    **Never Use:** `Booking`, `Order`, `Job`, `Reservation`
*   **Always Use:** `Linen`  
    **Never Use:** `Cloth`, `Fabric`, `Sheet`
*   **Always Use:** `Supplier`  
    **Never Use:** `Merchant`, `Distributor`, `Seller`

---

## 15. Glossary

*   **Advance:** A deposit payment made by a Customer to secure an event booking.
*   **Banquet Event Order (BEO):** The master document outlining menus, staff needs, and setup steps for an Event.
*   **Conversion:** The transition of a qualified Lead into a Confirmed Customer.
*   **Linen Shrinkage:** Linens lost or damaged during laundry and event cycles.
*   **Opportunity:** A potential sales deal linked to a Customer.
*   **Pax:** The guest count for an event or function.
*   **Quotation:** A formal proposal detailing estimated costs and terms.

---

## 16. Future Extensibility

To introduce new business terms and maintain consistency over time:

1.  **Architecture Review:** Proposed additions to the business terminology must be reviewed by the Domain Architect before database updates occur.
2.  **Glossary Updates:** New terms must be registered in this document with their business meanings, lifecycles, and owning modules.
3.  **Strict Linting:** Automated checks reject code modifications using non-standard entity names (e.g., rejecting classes using the term `Client`).
