# Reporting, BI, & Data Warehouse Framework
**Document Code:** ERP-BIW-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Data Architect & Business Intelligence Consultant  

---

## 1. OLTP vs. OLAP Separation Architecture

To prevent heavy analytical reports from degrading the transactional database during event seasons, the ERP implements a **decoupled data warehousing architecture**:

```
[OLTP Transactional DB]
          │
          ▼ Change Data Capture (CDC / Debezium)
   [ETL Kafka Bus]
          │
          ▼ Incremental Micro-Batches
[OLAP Analytical Data Warehouse (PostgreSQL-OLAP / Snowflake)]
          │
          ├─► [Finance Data Mart] ──► Financial Reports / P&L
          └─► [Operations Data Mart] ─► Kitchen Yields / Staff Util.
```

### 1.1. Core Architectural Pillars
* **Real-Time CDC Pipelines:** Uses Change Data Capture (CDC) to stream updates from OLTP tables to the Data Warehouse (OLAP) asynchronously, preventing performance impact on database writes.
* **Star Schema Design:** OLAP structures are optimized into Star and Snowflake schemas using dedicated **Fact** and **Dimension** tables for fast aggregations.
* **Slowly Changing Dimensions (SCD Type 2):** Changes to master records (e.g. menu pricing updates or customer transfers) are versioned with `valid_from` and `valid_to` timestamps, preserving historical transaction accuracy.

---

## 2. Business Intelligence (BI) Star Schema Design

Analytical reporting is driven by structured fact and dimension tables inside the `analytics` schema:

### 2.1. Dimensional Model Overview
* **Dimensions (Ref Tables):** `dim_dates`, `dim_times`, `dim_companies`, `dim_cities`, `dim_branches`, `dim_customers`, `dim_event_types`, `dim_vendors`, `dim_employees`, `dim_items`, `dim_menus`, `dim_departments`.
* **Fact Tables (Transaction Records):**
  * `fact_sales_transactions` (Stores revenue, totals, and invoices).
  * `fact_inventory_movements` (Stores item intakes, scrap logs, and transfer counts).
  * `fact_kitchen_production` (Stores batch ingredient prep and wastage metrics).
  * `fact_staff_utilization` (Stores shift hours, wage rates, and check-in variances).

---

## 3. Database Schema Design (16 Tables DDL)

All BI configurations, scheduling rules, and DW metadata tables reside in the `reports` schema.

```sql
CREATE SCHEMA IF NOT EXISTS reports;

-- 1. Report Categories
CREATE TABLE reports.report_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "FINANCIAL", "OPERATIONAL"
    name VARCHAR(100) NOT NULL
);

-- 2. Report Definitions
CREATE TABLE reports.report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES reports.report_categories(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "MONTHLY_P_AND_L"
    name VARCHAR(150) NOT NULL,
    query_template TEXT NOT NULL, -- Parametrizable SQL query
    output_formats VARCHAR(10)[] NOT NULL, -- PDF, EXCEL, CSV
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dashboard Definitions
CREATE TABLE reports.dashboard_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g. "EXECUTIVE_CORP"
    name VARCHAR(150) NOT NULL,
    layout_config_json JSONB NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. KPI Definitions
CREATE TABLE reports.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g. "FOOD_COST_PERCENT"
    name VARCHAR(150) NOT NULL,
    description TEXT,
    target_value NUMERIC(12,4) NOT NULL,
    calculation_expression TEXT NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. KPI Results (Historical trends)
CREATE TABLE reports.kpi_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL REFERENCES reports.kpi_definitions(id) ON DELETE CASCADE,
    branch_id UUID,
    recorded_value NUMERIC(12,4) NOT NULL,
    recorded_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_kpi_history ON reports.kpi_results(kpi_id, recorded_date);

-- 6. Data Warehouse Jobs
CREATE TABLE reports.data_warehouse_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL, -- e.g. "ETL_DAILY_SNAP"
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    records_processed INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_log TEXT
);

-- 7. Data Mart Definitions
CREATE TABLE reports.data_mart_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "FINANCE_MART", "OPS_MART"
    name VARCHAR(100) NOT NULL,
    target_schema_name VARCHAR(50) NOT NULL
);

-- 8. Fact Tables Registry
CREATE TABLE reports.fact_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mart_id UUID NOT NULL REFERENCES reports.data_mart_definitions(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- 9. Dimension Tables Registry
CREATE TABLE reports.dimension_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mart_id UUID NOT NULL REFERENCES reports.data_mart_definitions(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL UNIQUE,
    type_scd VARCHAR(20) NOT NULL DEFAULT 'TYPE_1' -- TYPE_1, TYPE_2
);

-- 10. Data Snapshots (Frozen historical metrics)
CREATE TABLE reports.data_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    metric_value_numeric NUMERIC(15,4),
    metric_value_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_snapshot_key ON reports.data_snapshots(company_id, snapshot_date, metric_key);

-- 11. Report Schedules
CREATE TABLE reports.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports.report_definitions(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL, -- e.g. "0 6 * * 1" (Every Mon at 6AM)
    recipient_emails VARCHAR(255)[] NOT NULL,
    output_format VARCHAR(10) NOT NULL DEFAULT 'PDF',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Report Subscriptions
CREATE TABLE reports.report_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    report_id UUID NOT NULL REFERENCES reports.report_definitions(id) ON DELETE CASCADE,
    frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY
    output_format VARCHAR(10) NOT NULL DEFAULT 'PDF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_user_report_sub ON reports.report_subscriptions(user_id, report_id);

-- 13. Report Executions
CREATE TABLE reports.report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports.report_definitions(id) ON DELETE CASCADE,
    executed_by UUID, -- NULL for system scheduler
    format_generated VARCHAR(10) NOT NULL,
    execution_duration_ms INT NOT NULL,
    status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Analytics Configurations
CREATE TABLE reports.analytics_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Forecast Models
CREATE TABLE reports.forecast_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL, -- e.g., "DEMAND_HOLT_WINTERS"
    target_metric VARCHAR(100) NOT NULL, -- e.g., "EVENT_COUNT"
    hyperparameters_json JSONB,
    trained_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Forecast Results
CREATE TABLE reports.forecast_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES reports.forecast_models(id) ON DELETE CASCADE,
    branch_id UUID,
    forecast_date DATE NOT NULL,
    predicted_value NUMERIC(12,4) NOT NULL,
    confidence_lower_bound NUMERIC(12,4),
    confidence_upper_bound NUMERIC(12,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_forecast_time ON reports.forecast_results(model_id, forecast_date);
```

---

## 4. Reporting Access Control & Row-Level Security

To protect sensitive financial and operational metrics, the reporting engine enforces strict security:

* **Regional/Branch RLS Scopes:** Report query executors append security filters automatically (e.g. `WHERE branch_id IN (SELECT user_branch_id FROM user_branch_mapping WHERE user_id = :active_user_id)`). This restricts Branch Managers to reviewing only their local P&L and utilization reports.
* **Sensitive Data Masking:** Column-level filters mask or omit sensitive financial rows (such as profit margins or payroll records) unless the executing session's role possesses explicit approval permissions (e.g., CFO, Corporate Finance).
* **Export Restrictions:** PDF/Excel exports are audited. The system logs the user ID, export format, record count, and filters used for every export action, preventing unauthorized bulk data downloads.
