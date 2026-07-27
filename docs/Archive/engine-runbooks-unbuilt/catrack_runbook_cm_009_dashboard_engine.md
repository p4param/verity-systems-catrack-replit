# Catrack Technical Runbook: CM-009 Dashboard Engine
**Catrack ERP Platform Component Specification (CM-009)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-009`
*   **Component Name:** Dashboard Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Dynamic Dashboard Metadata, KPI Widget Compilation, Drill-down Logic, Layout Personalization.
*   **Target Audience:** Enterprise Software Engineers, UI/UX Developers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-009` is to implement a dynamic dashboard engine that compiles KPI metrics, coordinates widget placements, resolves drill-down paths, and saves layout configurations across all modules of the Catrack ERP platform.

### Functional Scope
*   **Widget & KPI Registry:** Predefining widget templates (e.g., metric cards, line charts, activity logs).
*   **Dynamic Layout Rendering:** Arranging widgets in grid structures based on layout metadata.
*   **Drill-down Resolution:** Routing users from high-level charts to specific transaction pages.
*   **User Personalization:** Saving custom widget configurations and layouts per user.

---

## 3. Technical Architecture Expectations

The Dashboard Engine must conform to the following architectural design:

```
                            DASHBOARD RENDERING PIPELINE
                            
                               Dashboard Request (User Context)
                                         |
                                         v
                            +--------------------------+
                            |   Get Layout Metadata    |
                            | (Personalized override)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   L1/L2 Redis Cache      | --(Hit)--> Return Layout Schema
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Database Fetch (Prisma)  | --(Save)--> Populate Cache
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Compile Widget Data     |
                            |  (Parallel async fetch)  |
                            +--------------------------+
                               /         |          \
                              v          v           v
                          [ KPI 1 ]  [ Chart ]   [ List ]
                               \         |          /
                                \        |         /
                                 v       v        v
                            +--------------------------+
                            |   Validation & Scoping   | --(Failed checks)--> Return 403
                            +--------------------------+
                                         |
                                      (Passed)
                                         v
                                  Render UI Grid
```

*   **Decoupled Data Fetching:** Widget data queries must run in parallel and execute independently to prevent a single slow query from blocking the entire dashboard.
*   **Client-Side Grid Layout:** The frontend uses the layout metadata JSON (defining row, column, width, and height parameters) to render responsive dashboard grids dynamically.
*   **Metadata-Driven Configuration:** Dashboard configurations are stored as JSON specifications in the database.

---

## 4. Domain Model & Boundaries

The Dashboard Engine manages these entities:

*   **DashboardDefinition:** Defines the parent dashboard context (e.g., `EXECUTIVE_OVERVIEW`).
*   **WidgetDefinition:** Stores widget templates, query types, and display settings.
*   **UserDashboardLayout:** Stores custom widget placements and user layouts.
*   **DashboardKpiLog:** Stores pre-compiled hourly or daily metrics to prevent slow database queries.

---

## 5. API Contract Specifications

All endpoints under `CM-009` must reside within the versioned `/api/v1/dashboards/` namespace:

### 1. Retrieve Dashboard Layout & Data
*   **Route:** `GET /api/v1/dashboards/:dashboardCode`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "dashboardCode": "EXECUTIVE_OVERVIEW",
        "layout": [
          {
            "widgetId": "widget-uuid-1",
            "type": "METRIC_CARD",
            "title": "Monthly Revenue",
            "position": { "row": 1, "col": 1, "width": 4, "height": 2 },
            "data": {
              "value": 45000,
              "trend": 12.5,
              "currency": "USD"
            }
          }
        ]
      }
    }
    ```

### 2. Save Custom Layout
*   **Route:** `PUT /api/v1/dashboards/:dashboardCode/layout`
*   **Request Payload:**
    ```json
    {
      "layout": [
        {
          "widgetId": "widget-uuid-1",
          "position": { "row": 1, "col": 1, "width": 6, "height": 2 }
        }
      ]
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "updated": true
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Dashboard APIs check the user's role permissions (e.g., accessing the `EXECUTIVE_OVERVIEW` dashboard requires the `DASHBOARD_EXECUTIVE_VIEW` permission).
*   **Data Scoping:** Every metric query must automatically append `tenantId` and `branchId` filters to database requests, maintaining tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **L2 Caching:** Dashboard layouts and definitions are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Pre-Compiled Metrics:** High-volume transaction aggregates (such as total monthly sales) are calculated in background jobs and cached in `DashboardKpiLog` tables to prevent slow live database queries.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-009` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Query Builders ] -> [ Phase 3: Layout APIs ] -> [ Phase 4: Cache Engine ] -> [ Phase 5: Verification ]
* Create Dashboard tables     * Build KPI query logic       * Implement layout routes     * Configure KPI caches        * Write Vitest unit tests
* Run Prisma migrations        * Implement async fetchers    * Implement custom layouts    * Hook rollup cron jobs       * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define dashboard, widget, layout, and KPI log tables in the database schemas. Run migrations.
*   **Phase 2: Query Builders Implementation:** Build the KPI query processors and implement parallel, asynchronous data fetchers.
*   **Phase 3: Layout APIs Setup:** Implement REST API paths for retrieving layouts and saving custom widget configurations.
*   **Phase 4: Cache Engine Integration:** Implement the Redis caching layer, hook cache invalidations, and setup background cron jobs to pre-compile metrics.
*   **Phase 5: Verification & Tests:** Write unit tests to check query processors, and write E2E tests to verify dashboard rendering and widget edits.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Parallel query fetchers and layout validators must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot view metrics or access dashboards without the required permissions.
