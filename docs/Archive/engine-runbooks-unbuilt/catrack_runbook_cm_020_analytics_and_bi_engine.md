# Catrack Technical Runbook: CM-020 Analytics & BI Engine
**Catrack ERP Platform Component Specification (CM-020)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-020`
*   **Component Name:** Analytics & BI Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Data Warehouse Staging, Materialized Views Pipeline, Semantic Metric Model, Executive KPI Reporting, Drill-down Analytics.
*   **Target Audience:** Enterprise Software Engineers, Business Intelligence Analysts, Database Architects.

---

## 2. Objective & Functional Scope

The primary objective of `CM-020` is to implement a unified analytics and business intelligence (BI) engine that coordinates data staging, compiles materialized analytical views, resolves semantic metrics, and serves KPI dashboards across all modules of the Catrack ERP platform.

### Functional Scope
*   **Data Warehouse Staging:** Structuring analytical tables using star schema designs.
*   **Materialized Views Pipeline:** Generating pre-compiled database views for fast analytical queries.
*   **Semantic Metric Model:** Defining metrics (e.g., Gross Margin, Customer Lifetime Value) in metadata.
*   **Drill-down Analytics:** Linking KPI summaries directly to detailed transaction records.
*   **Executive Reporting:** Generating monthly, quarterly, and annual business reports.

---

## 3. Technical Architecture Expectations

The Analytics & BI Engine must conform to the following architectural design:

```
                            ANALYTICAL DATA FLOW
                            
                               Transactional Database (OLTP)
                                         |
                                         v
                            +--------------------------+
                            |     Data Staging (ETL)   |
                            |  (Asynchronous sync queue) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Materialized Views     |
                            | (Pre-compiled aggregates) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Semantic Metric Model   |
                            | (Verify calculations rule)
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   L1/L2 Redis Cache      | --(Hit)--> Return Dashboard KPIs
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Read Replica Query Exec  | --(Save)--> Populate Cache
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Tenant Scoping Guard   | --(Failed checks)--> Return 403
                            +--------------------------+
                                         |
                                      (Passed)
                                         v
                                  Returned Dashboard
```

*   **Star Schema Modeling:** Analytical databases structure data into Facts (e.g., sales transactions, linen dispatch logs) and Dimensions (e.g., customers, branches, calendar dates) to optimize query performance.
*   **Materialized View Refreshes:** Materialized views are refreshed periodically during low-traffic periods (e.g., nightly) to prevent performance issues on the live transactional database.
*   **Read Replica Routing:** Analytics and BI queries run against read replicas to protect primary database performance during active transaction hours.

---

## 4. Domain Model & Boundaries

The Analytics & BI Engine manages the following entities:

*   **MetricDefinition:** Stores metric details, semantic formulas, display formats, and permission rules.
*   **AnalyticsFactTable:** Defines the target fact tables (e.g., `FactEventRevenue`, `FactLaundryCosts`).
*   **AnalyticsDimensionTable:** Defines the target dimension tables (e.g., `DimCustomer`, `DimBranch`).
*   **MaterializedViewLog:** Tracks materialized view refresh timestamps, durations, and status updates.

---

## 5. API Contract Specifications

All endpoints under `CM-020` must reside within the versioned `/api/v1/analytics/` namespace:

### 1. Retrieve KPI Metrics
*   **Route:** `GET /api/v1/analytics/kpi/:metricCode`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Query Parameters:** `startDate`, `endDate`, `branchId` (optional).
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "metricCode": "GROSS_PROFIT_MARGIN",
        "value": 34.2,
        "comparisonValue": 31.5,
        "percentageChange": 8.57,
        "trend": "UP"
      }
    }
    ```

### 2. Request Report Drill-Down
*   **Route:** `GET /api/v1/analytics/drilldown`
*   **Query Parameters:** `metricCode`, `dimensionId`, `limit`.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "metricCode": "GROSS_PROFIT_MARGIN",
        "records": [
          {
            "transactionId": "tx-uuid-1",
            "date": "2026-06-15",
            "revenue": 5000,
            "cost": 3290,
            "profit": 1710
          }
        ]
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Analytics and BI APIs check the user's role permissions (e.g., accessing financial metrics requires the `ANALYTICS_FINANCE_VIEW` permission).
*   **Data Scoping:** Every query must automatically append `tenantId` and `branchId` filters to database requests, maintaining tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **L2 Caching:** Compiled analytical metrics and KPI values are cached in Redis with a Time to Live (TTL) of **1 hour** to prevent redundant database load.
*   **Execution Scheduling:** Materialized view refreshes are scheduled during off-peak hours using cron jobs.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-020` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Schema Views ] -> [ Phase 3: Analytics API ] -> [ Phase 4: Cache Engine ] -> [ Phase 5: Verification ]
* Create Analytics tables     * Build star schemas schema   * Implement KPI routes        * Configure Redis metric cache* Write Vitest unit tests
* Run Prisma migrations        * Implement view ref-cron     * Implement drill-down routes * Hook background refresh jobs* Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define analytical fact, dimension, and refresh log tables in the schemas. Run migrations.
*   **Phase 2: Schema Views Setup:** Create materialized views and set up scheduled cron tasks to refresh view data.
*   **Phase 3: Analytics API Integration:** Implement REST API paths for retrieving KPIs and executing drill-down queries.
*   **Phase 4: Cache Engine Integration:** Implement the Redis caching layer, and hook cron jobs to refresh metric caches.
*   **Phase 5: Verification & Tests:** Write unit tests to check KPI calculations, and write E2E tests to verify dashboard rendering and data boundaries.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Analytical query builders and metric calculation helpers must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot view metrics or access data outside their permitted scopes.
# Catrack Technical Runbook & Specification (CM-020 Analytics & BI Engine) completed successfully.
