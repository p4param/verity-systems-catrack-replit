# Event Manager Business Design & Functional Specification
**Document Code:** ERP-EMS-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal ERP Solution Architect & Event Management Domain Expert  

---

## 1. Event Workspace & Tabbed Layout Architecture

The **Event Workspace** is the central screen used by event coordinators to plan and manage events:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Event: Smith Corporate Gala 2026  |  Status: Confirmed  |  Health: 96 │
├────────────────────────────────────────────────────────────────────────┤
│  [Summary] [Functions] [Venue] [Menus] [Production] [Inventory] [Staff] │
│  [Logistics] [Documents] [Tasks] [Payments] [Comms] [Audit Logs]        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Active Tab Workspace Area (Density Grid / Detailed Forms)             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Core Workspace Tabs
1. **Summary:** High-level details, client contacts, financial totals, and readiness health meters.
2. **Functions:** Sub-event scheduler (e.g., Sangeet, Ceremony, Reception) with separate menu allocations and timelines.
3. **Venue:** Geolocation data, utility specs, and layout diagram maps.
4. **Menus:** Buffet/plated menu packages, guest counts, and dietary tags.
5. **Production:** Scaled recipe batch prep sheets for kitchens.
6. **Inventory:** Asset bookings (linens, plates, ovens) locked in local warehouses.
7. **Staff:** Rosters, roles, and timesheet check-ins.
8. **Logistics:** Vehicle scheduling, route planners, and load-out checklists.
9. **Documents:** Access to download PDF invoices, signed agreements, and permits.
10. **Tasks:** SLA-monitored checklists and task assignments.
11. **Payments:** Payment logs, receipts, and Stripe invoice links.
12. **Comms:** Chronological log of emails, SMS messages, and WhatsApp chats.

---

## 2. Multi-Function Event Operations

Large events (such as weddings and corporate conferences) are split into multiple **Sub-Functions**:

```
                       ┌───────────────────────────────┐
                       │     Parent Event Header       │
                       └───────────────┬───────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       [Function 1: Sangeet]        [Function 2: Ceremony]          [Function 3: Reception]
       - Venue: Outdoor Lawn        - Venue: Temple Hall            - Venue: Main Ballroom
       - Menu: Finger Foods         - Menu: Traditional Lunch       - Menu: Plated Dinner
       - Staff: 12 Servers          - Staff: 8 Servers              - Staff: 20 Servers
```

### 2.1. Operational Isolation
* **Timing & Venues:** Each sub-function has distinct start/end times and is assigned to specific halls or external venue locations.
* **Menus & Labor:** Menu items, guest counts, and staffing requirements are calculated separately for each sub-function.
* **Financial Roll-Up:** Costs (labor, ingredients, rentals) are tracked at the sub-function level and aggregated under the parent event record for consolidated P&L reporting.

---

## 3. Database Schema Design (12 Tables DDL)

All event records reside inside the `events` schema.

```sql
CREATE SCHEMA IF NOT EXISTS events;

-- 1. Events (Parent Header Table)
CREATE TABLE events.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    event_number VARCHAR(50) NOT NULL UNIQUE, -- Generated via sequence engine (e.g., NY-EV-2026-0012)
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- WEDDING, RECEPTION, CORPORATE, CONFERENCE, EXHIBITION
    status VARCHAR(30) NOT NULL DEFAULT 'INQUIRY', -- INQUIRY, TENTATIVE, CONFIRMED, PLANNING, COMPLETED, CLOSED
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
    sales_executive_id UUID NOT NULL,
    event_manager_id UUID,
    booking_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_guest_count INT NOT NULL,
    total_budget_amount NUMERIC(12,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_events_branch ON events.events(branch_id, status);

-- 2. Event Functions (Sub-Events)
CREATE TABLE events.event_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g., "Sangeet", "Wedding Ceremony"
    hall_id UUID, -- References masterdata.venue_halls
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    guest_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_event_func_lookup ON events.event_functions(event_id);

-- 3. Event Venues (Associated locations)
CREATE TABLE events.event_venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL, -- References masterdata.venues
    rent_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    contract_signed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Event Menus (Selected package options)
CREATE TABLE events.event_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_id UUID NOT NULL REFERENCES events.event_functions(id) ON DELETE CASCADE,
    package_version_id UUID NOT NULL, -- References menu.package_versions
    price_per_head NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Event Production Plans (Prep milestones)
CREATE TABLE events.event_production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    chef_user_id UUID NOT NULL,
    prep_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    prep_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Event Resources (Non-inventory logistics assets)
CREATE TABLE events.event_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- e.g. "AUDIO_VISUAL", "STAGE_DECOR"
    estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Event Staff Plans
CREATE TABLE events.event_staff_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_id UUID NOT NULL REFERENCES events.event_functions(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL, -- e.g. "SERVER", "COOK"
    required_staff_count INT NOT NULL,
    hourly_rate NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Event Logistics Plans (Delivery mapping)
CREATE TABLE events.event_logistics_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    vehicle_id UUID, -- References masterdata.vehicles
    driver_user_id UUID,
    dispatch_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, EN_ROUTE, DELIVERED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Event Financials
CREATE TABLE events.event_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events.events(id) ON DELETE CASCADE,
    estimated_food_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estimated_labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estimated_logistics_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estimated_margin_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    invoice_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Event Payments
CREATE TABLE events.event_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financials_id UUID NOT NULL REFERENCES events.event_financials(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL, -- CREDIT_CARD, bank_transfer, CASH
    amount NUMERIC(12,2) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Event Checklists
CREATE TABLE events.event_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    task_title VARCHAR(150) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 12. Event Timeline Records
CREATE TABLE events.event_timeline_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    summary VARCHAR(255) NOT NULL,
    details TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_event_timeline ON events.event_timeline_records(event_id, logged_at DESC);
```

---

## 4. Financial Reconciliation & Post-Event Audits

To ensure accurate P&L reporting and audit compliance:

* **Post-Event Settlement:** Within 48 hours of event completion, the finance team runs a **Settlement Process**. This calculates actual ingredient usage (waste adjustments), actual staff hours worked, and costs for broken/damaged rental assets.
* **Write-Offs & Adjustments:** Any adjustments to invoices (e.g. discounting for service issues) require write-off approvals from branch directors, logged directly under the event financials table.
* **Profitability Variance Analysis:** Displays estimated margins (calculated during quoting) against actual realized margins, identifying operational issues (e.g., kitchen wastage, staff overtime).
* **Audit Trail Closure:** Once finalized, the event financials are locked, preventing further updates to the ledger.
