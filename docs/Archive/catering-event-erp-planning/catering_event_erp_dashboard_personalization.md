# Dashboard, Widgets, & User Personalization Framework
**Document Code:** ERP-DBF-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Product Designer & Enterprise Solution Architect  

---

## 1. Dashboard Specifications by Persona

To support specialized operational roles, the ERP defines specific dashboard structures:

### 1.1. Core Dashboard Configs

```
┌────────────────────────────────────────────────────────┐
│  Role Dashboard Engine                                 │
│  ├── CEO Dashboard ──► Revenue, EBITDA, Regional P&Ls  │
│  ├── Procurement  ───► PO Approvals, Stock Deficits   │
│  ├── HR Dashboard ───► Open Shifts, Labor Cost Ratios  │
│  └── Finance      ───► Accounts Receivable, Tax Logs   │
└────────────────────────────────────────────────────────┘
```

#### 1. CEO / Executive Dashboard
* **Objectives:** Monitor overall company profitability, EBITDA, and branch growth metrics.
* **KPI Cards:** Consolidated Revenue, EBITDA Margin (%), Net Profit ($), Client Acquisition Cost, Guest Satisfaction Index.
* **Primary Widgets:** Year-over-Year (YoY) revenue charts, Branch profitability comparison grids, Real-time cash flow forecast charts.
* **Critical Alerts:** Budget overruns (>10% variance), Invoices overdue by >60 days.
* **Quick Actions:** Create regional operational reviews, Adjust annual sales budgets.

#### 2. Procurement Dashboard
* **Objectives:** Monitor purchase requisitions, supplier delivery performance, and stock levels.
* **KPI Cards:** Outstanding PO value ($), Supplier Order Fill Rate (%), Average Lead Time (Days), Critical stockout risks.
* **Primary Widgets:** Pending Purchase Requisitions queue, Active Supplier Delivery maps, Material Price Fluctuations list.
* **Critical Alerts:** Urgent ingredient deficits for upcoming events (Event Date < 5 days).
* **Quick Actions:** Approve pending purchase requisitions, Issue emergency Purchase Order (PO).

#### 3. HR / Staffing Dashboard
* **Objectives:** Oversee payroll budgets, manage shift coverage ratios, and coordinate gig portal listings.
* **KPI Cards:** Labor Cost Ratio (%), Shift Fill Rate (%), Active Freelance Count, Open shifts (Event Date < 48 hours).
* **Primary Widgets:** Shift scheduling grid, Freelance roster list, Timesheet exception approval table.
* **Critical Alerts:** Unscheduled event shifts (Event Date < 24 hours), Staff overtime alerts.
* **Quick Actions:** Publish emergency shifts to gig portal, Approve timesheet exceptions.

---

## 2. Event Command Center (Flagship Operational View)

The **Event Command Center** is the primary operational dashboard used by event managers to coordinate and run events:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Health: 94/100] Event Command Center: Smith Wedding 2026            │
├────────────────────────────────────────────────────────────────────────┤
│  Payment Status: 80%  |  Staffing: 100%  |  Inventory: 92%  |  Prep: 100%  │
├────────────────────────────────┬───────────────────────────────────────┤
│                                │  Operational Alerts Queue             │
│  Event Timeline & Checklists   │  - Vendor Delays: Baker Late (30m)    │
│  - 08:00 AM: Load out S1       │  - Weather: Rain forecasted (60% risk)│
│  - 10:00 AM: Truck Arrival     ├───────────────────────────────────────┤
│  - 12:00 PM: Prep Kitchen live │  Financial Margins Dashboard          │
│  - 02:00 PM: Guest Check-in    │  - Total Contract Value: $25,000      │
│                                │  - Estimated Margin: 42%              │
└────────────────────────────────┴───────────────────────────────────────┘
```

### 2.1. Critical Readiness Panels
* **Event Health Score:** Live composite readiness score (0-100) calculated by the Event Health Engine.
* **Status Monitors:** Financial indicators (percentage of contract value paid), staffing ratios (positions rostered / positions required), inventory allocations, and kitchen prep milestones.
* **Operational Alerts Queue:** Critical system notifications (e.g., driver delays, missing permits, weather risks, ingredient deficits).
* **Run-Sheet Timeline:** Live chronological checklist showing milestones, checklist items, and dispatch logs.

---

## 3. Shared Resource Calendar Dashboard

The calendar provides a unified view of asset allocations:

* **Monthly/Weekly Event Calendars:** Standard calendar views displaying event allocations, filtered by branch, city, and client account.
* **Roster Schedules:** Chronological view of staff assignments, showing shifts, roles, and branch check-ins.
* **Fleet Schedules:** Delivery truck routes, driver allocations, and maintenance blocks.
* **Equipment Schedules:** Asset bookings (e.g., ovens, cold storage, premium tables) to prevent double-bookings.
* **Event Heat Maps:** Visual grid highlighting peak booking days to help planners manage event capacity.

---

## 4. Extensible Widget Framework

Dashboards are built using modular, data-driven widgets configured via JSON schemas:

```json
{
  "widgetId": "w_kpi_total_revenue",
  "widgetType": "KPI_CARD",
  "title": "Total Revenue",
  "dataSourceUrl": "/api/dashboard/widgets/revenue",
  "refreshIntervalSeconds": 300,
  "cachePolicy": "REDIS_WITH_TTL",
  "defaultFilters": {
    "dateRange": "THIS_MONTH",
    "branchId": "ACTIVE_BRANCH"
  },
  "permissions": ["finance:view", "executive:view"],
  "layout": {
    "w": 3,
    "h": 2
  }
}
```

* **Data Refresh Strategies:** Widgets support three refresh modes: **Push** (WebSocket triggers for operational dashboards), **Poll** (Interval fetches every 5 minutes for general cards), and **On-Demand** (Manual refresh button).
* **Mobile Responsiveness:** Layouts collapse from multi-column grids on desktop to a single-column layout on mobile, automatically hiding non-critical charts and summaries.

---

## 5. Personalization Engine

Users can configure their workspaces to match their day-to-day tasks:

* **Grid Customization:** Drag-and-drop dashboard grids (built on standard grid libraries) allow users to move, resize, add, or delete widgets.
* **Saved Filter Templates:** Users can save custom table configurations (e.g., search keywords, column selections, sort orders, and filters) and pin them as custom sidebar links.
* **Dashboard Layout Profiles:** Settings are stored in the user profile database schema, allowing users to sync their personalized dashboard layouts across desktop, tablet, and mobile devices.
