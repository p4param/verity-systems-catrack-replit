# Application Layout, Navigation, & Design System Handbook
**Document Code:** ERP-DSN-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Product Designer & UX Architect  

---

## 1. Core ERP Product Design Principles

ERP systems must prioritize productivity, speed, and data density over blank whitespace. We define these core principles for our design system:

* **High Data Density:** Use tight grid layouts, small padding (e.g., `py-1.5` instead of `py-3` on table rows), and standard font sizes (13px/14px baseline) to maximize visible information.
* **Keyboard-First Design:** All forms, tables, and searches must be navigable without a mouse (e.g., `Tab` focus rings, `Enter` to submit, `Esc` to close modals, and keybindings for quick actions).
* **Minimal Clicks Philosophy:** Users should be able to complete main actions (like adding an item, editing a price, or updating a status) directly from table rows or contextual menus without full page reloads.

### 1.1. Standard Keyboard Shortcuts Map

| Shortcut | Scope | Action |
|---|---|---|
| `Ctrl + K` or `Cmd + K` | Global | Open Global Command Palette |
| `Alt + N` | Global | Create New Event / Lead |
| `Alt + I` | Global | Quick Search Inventory Stock |
| `Esc` | Modal / Dropdown | Close active modal, dropdown, or search list |
| `Arrow Keys` / `Tab` | Form / Table | Move focus across inputs and table fields |

---

## 2. Application Shell Architecture

The application shell provides the framing layout for the ERP. It is divided into five main areas:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Top Header: Company/Branch Switcher | Global Search | Notifications   │
├─────────────┬──────────────────────────────────────────────────────────┤
│             │  Workspace Header: Breadcrumbs | Action Buttons          │
│             ├──────────────────────────────────────────────────────────┤
│             │                                                          │
│  Sidebar    │                                                          │
│  Navigation │  Work Area (High Density Grid / Form Views)              │
│             │                                                          │
│             │                                                          │
│             ├──────────────────────────────────────────────────────────┤
│             │  Footer: Status Indicator | System Log Streams           │
└─────────────┴──────────────────────────────────────────────────────────┘
```

### 2.1. Core Application Shell Components
1. **Top Header:** House for company/branch dropdown switchers, global search bar, alerts and notifications trigger, theme toggler, and user avatar dropdown menu.
2. **Left Sidebar:** Collapsible navigation containing parent modules, sub-menus, favorites, and recently visited records.
3. **Workspace Area:** Dynamic container where application routes, tables, and dashboards render.
4. **Footer:** Displays app version, branch status indicators, and active database connection state.

---

## 3. Navigation & Information Architecture

The main menu sidebar is dynamically generated based on user permissions:

### 3.1. Main Sidebar Navigation Map

* **Dashboard** (Permission: `dashboard:view`)
  * Executive Overview, Sales Metrics, Operations Hub, Kitchen Output, Warehouse Stock.
* **CRM** (Permission: `crm:view`)
  * Leads (inboxes, pipeline), Accounts, Inquiries, Active Client Contracts.
* **Calendar** (Permission: `calendar:view`)
  * Month/Week Views (filters: city, branch, event category, kitchen load).
* **Events** (Permission: `events:view`)
  * Event Workspace (all operations), Banquet Event Orders (BEOs), Post-Event Reconciliation lists.
* **Operations & Production** (Permission: `operations:view`)
  * Kitchen Scaling sheets, Kitchen Dispatch lists, Recipe Database.
* **Inventory & Resource Management** (Permission: `inventory:view`)
  * Warehouses, Stock Ledgers, Internal Transfer Orders, Purchase Requisitions.
* **Vendors** (Permission: `vendors:view`)
  * Vendor Profiles, Vendor Rate Cards, Purchase Orders, Vendor Invoices.
* **Staff & HR** (Permission: `staff:view`)
  * Shift Rosters, Freelance Gig Portal, Timesheets.
* **Finance & Accounting** (Permission: `finance:view`)
  * Client Invoices, Payments Registry, General Ledger, Tax Configurations.
* **Logistics** (Permission: `logistics:view`)
  * Vehicle Fleet, Route Planner, Dispatch Checklists.
* **Reports & Analytics** (Permission: `reports:view`)
  * Standard Exports (Sales, Waste, P&L summaries).
* **Administration** (Permission: `admin:view`)
  * Tenant Settings, Role Perm Setup, Audit Logs.

---

## 4. Operational Dashboard Architectures

The system uses **8 distinct, persona-specific dashboards** to display relevant metrics to different roles:

```
                                ┌───────────────────────────┐
                                │   1. Executive Dashboard  │ -- Total Revenue, Branch Margins,
                                │                           │    Corporate P&L
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │    2. Sales Dashboard     │ -- Leads Pipeline, Quote Status,
                                │                           │    Sales Target Gauges
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │   3. Operations Dashboard │ -- Upcoming Events, Staff Ratios,
                                │                           │    Readiness Scores
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │    4. Finance Dashboard   │ -- AR Days, Invoice Overdues,
                                │                           │    Expense Summaries
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │    5. Branch Dashboard    │ -- Local Kitchen Outputs, Local Fleet,
                                │                           │    Local Rosters
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │    6. Kitchen Dashboard   │ -- Ingredient Prep Scales, Scaling lists,
                                │                           │    Recipe Scaling
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │   7. Warehouse Dashboard  │ -- Stock Deficits, Return Checklists,
                                │                           │    Delivery dispatches
                                └───────────────────────────┘
                                ┌───────────────────────────┐
                                │    8. Personal Dashboard  │ -- Assigned Tasks, Shift Schedules,
                                │                           │    Timesheet check-ins
                                └───────────────────────────┘
```

### 4.1. Dashboard Specifications

#### 1. Executive Dashboard
* **Primary Target:** CEOs, COOs, VPs.
* **Core Widgets:** Company Revenue comparison charts, Local branch margin rankings, Inventory value indicators, Overall operational readiness metrics, Corporate P&L comparisons.

#### 2. Sales Dashboard
* **Primary Target:** Sales Managers, Event Planners.
* **Core Widgets:** Open leads pipeline funnel, Quotation versions awaiting approval, Estimated vs. actual sales metrics, Deposit tracking logs, Conversion metrics.

#### 3. Operations Dashboard
* **Primary Target:** Director of Operations, Regional Event Coordinators.
* **Core Widgets:** Event countdown list, BEO status tracking, Event Health Score meters, Staff scheduling ratios, Third-party vendor booking alerts.

#### 4. Kitchen Dashboard
* **Primary Target:** Executive Chefs, Prep Cooks.
* **Core Widgets:** Cumulative culinary prep weights (KG/Liters), Recipe scaling calculators, Kitchen dispatch status boards, Cold/prep/hot line schedules, Perishable ingredient expiry alerts.
