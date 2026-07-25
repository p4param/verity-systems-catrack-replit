# BWP-001 — Relationship Foundation

**Business Work Package:** BWP-001  
**Application:** Catrack Catering ERP (CAT)  
**Capability:** Relationship Foundation  
**Status:** Approved for Engineering  
**Version:** 1.0  

---

# Context

**Application Context**
* APP-001 — Loaded

**Product Principles**
* PX-001 Product Vision — Assumed
* PX-002 Experience Framework — Assumed
* PX-003 Workspace Design Principles — Assumed

**Engineering Standards**
* VAP Bootstrap — Assumed
* Engineering Library — Assumed

This document defines only the Relationship Foundation capability.

---

# 1. Business Objective

Provide a single, authoritative business relationship for every person or organization that interacts with the business.

The Relationship Foundation establishes the lifecycle from Prospect to Customer and becomes the starting point for every future business interaction.

This capability focuses on building trusted business relationships rather than maintaining customer records.

---

# 2. Scope

## Included
* Relationship
* Contact
* Relationship Workspace
* Relationship Search
* Prospect Lifecycle
* Customer Conversion
* Notes
* Documents

## Excluded
* Inquiry
* Quotation
* Booking
* Event
* Finance
* Operations
* Workflow Automation

These capabilities will be delivered through subsequent BWPs.

---

# 3. Business Workflow

```text
Business Interaction
        │
        ▼
Search Relationship
        │
 ┌──────┴──────┐
 │             │
Found       Not Found
 │             │
 ▼             ▼
Open      Create Relationship
Workspace
 │
 ▼
Manage Relationship
 │
 ▼
Prospect
 │
 ▼
Convert to Customer
```

The application must always attempt to locate an existing Relationship before creating a new one.

---

# 4. Domain Model

```text
Relationship
│
├── Contacts
├── Notes
├── Documents
└── Timeline (Placeholder)
```

## Relationship
Represents the master business identity.

Supported Types:
* Individual
* Organization

Supported Lifecycle:
* Prospect
* Customer
* Inactive
* Blacklisted

---

## Contact
Represents an individual associated with a Relationship.

Examples:
* Owner
* Event Coordinator
* Finance Contact
* Accounts Contact
* Purchase Contact

A Relationship may contain multiple Contacts.

---

# 5. Business Rules

### BR-001
Every business interaction belongs to one Relationship.

---

### BR-002
Prospect and Customer share the same Relationship record.

---

### BR-003
Converting a Prospect into a Customer updates the lifecycle state only.
No duplicate records shall be created.

---

### BR-004
All history shall remain attached to the Relationship throughout its lifecycle.

---

### BR-005
Contacts belong to Relationships.
Contacts do not exist independently.

---

### BR-006
Relationships may represent either Individuals or Organizations.

---

### BR-007
Relationship search shall occur before creating a new Relationship.
The objective is to minimize duplicate business identities.

---

### BR-008
Business users work with Prospects and Customers.
The underlying implementation may use a single Relationship entity.

---

# 6. Workspace Experience

The Relationship is managed through a **Relationship Workspace**.

The workspace provides context before maintenance.

## Initial Workspace Sections
* Summary
* Relationship Status
* Contacts
* Notes
* Documents
* Timeline (Placeholder)
* Recommended Actions

Future sections (Inquiries, Events, Financial Summary, etc.) will be introduced by later BWPs.

---

# 7. User Experience Expectations

The implementation shall:
* Open directly into the Relationship Workspace after creation.
* Prioritize business context over raw data.
* Minimize navigation.
* Avoid duplicate information entry.
* Present clear lifecycle transitions.
* Keep the interface clean and uncluttered.

---

# 8. Acceptance Criteria

This work package is complete when:
* Relationships can be created.
* Existing Relationships can be searched.
* Duplicate prevention workflow is implemented.
* Contacts can be managed.
* Prospect can be converted into Customer.
* Relationship Workspace is operational.
* Notes can be maintained.
* Documents can be attached.
* Timeline placeholder is available.
* Backend, frontend, validation, and automated tests are complete.
* Product review is approved.

---

# 9. Future Integration Points

The following capabilities will extend the Relationship Foundation:
* BWP-002 — Inquiry Management
* BWP-003 — Quotation Management
* BWP-004 — Booking
* BWP-005 — Event Workspace

No implementation for these capabilities is included in this work package.

---

# 10. Design Intent

The Relationship Foundation should make every person or organization feel like a long-term business relationship rather than a database record.

Users should always understand:
* Who this relationship is.
* Where the relationship stands.
* What should happen next.

The Relationship Workspace establishes the first implementation of Catrack's Workspace-First philosophy and serves as the foundation for every future business capability.
