# Monitoring, Observability, & Operational Intelligence Framework
**Document Code:** ERP-OPS-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Site Reliability Engineer (SRE) & Observability Architect  

---

## 1. Observability & Telemetry Pipelines

To monitor thousands of operations and guarantee 99.9% uptime, the ERP implements a **Three-Pillar Telemetry Pipeline** (Metrics, Logs, and Traces):

```
                       ┌───────────────────────────────┐
                       │     Application Server Pod    │
                       └───────┬───────────────┬───────┘
                               │               │
            Collect Logs (Pino)│               │ Collect Traces (OpenTelemetry)
                               ▼               ▼
                       ┌───────────────┐┌───────────────┐
                       │  Vector Agent ││  OTel Collec. │
                       └───────┬───────┘└───────┬───────┘
                               │                │
            Stream to Grafana  ▼                ▼ Stream to APM
                       ┌───────────────┐┌───────────────┐
                       │  Loki Engine  ││ Tempe Engine  │
                       └───────────────┘└───────────────┘
```

### 1.1. Core Architectural Pillars
* **Structured Logging:** All application logs are written in structured JSON (Pino format) containing correlation IDs (`trace_id`, `span_id`).
* **Distributed Tracing:** Implemented via OpenTelemetry SDKs, tracing requests across API endpoints, database transactions, background workers, and external API requests.
* **Metric Collection:** Prometheus pulls metrics from target endpoints every 15 seconds, tracking system, database, and business performance.

---

## 2. Alerting & Incident Response Policies

Alert triggers prevent outages by identifying issues before they affect users:

### 2.1. Incident Severity Definitions

| Severity | Definition | Target Response (SLA) | Primary Notification Path |
|---|---|---|---|
| **P1 (Critical)** | Core system down (e.g., checkout offline, database down). | 15 Minutes | PagerDuty, SMS, and WhatsApp alerts to on-call engineers. |
| **P2 (High)** | Major features degraded (e.g., BEO generation failing). | 1 Hour | Slack alert channel + email notifications. |
| **P3 (Medium)** | Non-blocking bugs (e.g., dashboard widget load delays). | 8 Hours | Jira ticket created automatically. |
| **P4 (Low)** | UI adjustments or minor logs. | 3 Days | Backlog entry created. |

---

## 3. Database Schema Design (17 Tables DDL)

All telemetry, metrics, and incident tables reside in the `reports` schema.

```sql
CREATE SCHEMA IF NOT EXISTS reports;

-- 1. System Metrics
CREATE TABLE reports.system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(100) NOT NULL,
    cpu_utilization_pct NUMERIC(5,2) NOT NULL,
    memory_usage_bytes BIGINT NOT NULL,
    network_in_bytes BIGINT NOT NULL,
    network_out_bytes BIGINT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Application Metrics
CREATE TABLE reports.application_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id VARCHAR(100) NOT NULL,
    active_requests INT NOT NULL,
    http_error_rate_pct NUMERIC(5,2) NOT NULL,
    heap_used_bytes BIGINT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. API Metrics
CREATE TABLE reports.api_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INT NOT NULL,
    status_code INT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_api_metrics_time ON reports.api_metrics(endpoint, captured_at DESC);

-- 4. Database Metrics
CREATE TABLE reports.database_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_connections INT NOT NULL,
    deadlocks_count INT NOT NULL,
    slow_queries_count INT NOT NULL,
    cache_hit_rate_pct NUMERIC(5,2) NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Infrastructure Metrics
CREATE TABLE reports.infrastructure_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id VARCHAR(100) NOT NULL, -- e.g., S3 Bucket, Redis
    disk_usage_pct NUMERIC(5,2),
    io_ops_count BIGINT,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Business Metrics
CREATE TABLE reports.business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    active_events_count INT NOT NULL,
    revenue_today_amount NUMERIC(12,2) NOT NULL,
    missed_slas_count INT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Alert Definitions
CREATE TABLE reports.alert_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "CPU_USAGE_HIGH"
    metric_source VARCHAR(50) NOT NULL, -- e.g., "SYSTEM_METRICS"
    condition_operator VARCHAR(20) NOT NULL, -- e.g. "GREATER_THAN"
    threshold_value NUMERIC(12,2) NOT NULL,
    evaluation_period_seconds INT NOT NULL DEFAULT 60,
    severity VARCHAR(20) NOT NULL, -- P1, P2, P3
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Alert History
CREATE TABLE reports.alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES reports.alert_definitions(id),
    actual_value NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'TRIGGERED', -- TRIGGERED, RESOLVED
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_alert_history_status ON reports.alert_history(status, triggered_at);

-- 9. Incidents
CREATE TABLE reports.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_history_id UUID REFERENCES reports.alert_history(id),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL, -- P1, P2, P3, P4
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, RESOLVED
    assigned_team VARCHAR(100),
    assigned_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 10. Incident Activities (Audit trail)
CREATE TABLE reports.incident_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES reports.incidents(id) ON DELETE CASCADE,
    actor_user_id UUID,
    action_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Incident Post-Mortems
CREATE TABLE reports.incident_post_mortems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL UNIQUE REFERENCES reports.incidents(id) ON DELETE CASCADE,
    root_cause TEXT NOT NULL,
    corrective_actions TEXT[] NOT NULL,
    compiled_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. SLA Definitions
CREATE TABLE reports.sla_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL, -- e.g. "API", "Database"
    target_metric VARCHAR(100) NOT NULL, -- e.g. "ResponseTime"
    sla_threshold_value NUMERIC(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. SLO Definitions
CREATE TABLE reports.slo_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sla_id UUID NOT NULL REFERENCES reports.sla_definitions(id),
    target_percentage NUMERIC(5,2) NOT NULL DEFAULT 99.90, -- e.g. 99.9%
    measurement_window_days INT NOT NULL DEFAULT 30
);

-- 14. Error Budgets
CREATE TABLE reports.error_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id UUID NOT NULL REFERENCES reports.slo_definitions(id),
    remaining_budget_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Monitoring Configurations
CREATE TABLE reports.monitoring_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Health Checks
CREATE TABLE reports.health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, DEGRADED, DOWN
    latency_ms INT NOT NULL,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Telemetry Logs
CREATE TABLE reports.telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(100) NOT NULL,
    span_id VARCHAR(100) NOT NULL,
    log_level VARCHAR(10) NOT NULL, -- INFO, WARN, ERROR
    message TEXT NOT NULL,
    payload JSONB,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_telemetry_trace ON reports.telemetry_logs(trace_id);
```

---

## 4. Operational SRE Runbooks

Our Site Reliability Engineering (SRE) playbook defines procedures for system recovery:

### 4.1. Incident Remediation Steps
1. **P1 database connections spike:** If connection counts exceed 90% of pool limits, trigger step: terminate idle query connections using the Postgres admin script:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < current_timestamp - interval '5 minutes';
   ```
2. **Kubernetes worker pod memory leak:** If a Next.js web application pod triggers an Out-Of-Memory (OOM) alarm, the Kubernetes container engine automatically restarts the container. The SRE team checks the OpenTelemetry logs to identify the memory leak pattern.
3. **Webhook queue delays:** If WhatsApp/SMS webhook queues exceed 5,000 pending items, spin up additional queue worker pods to clear the queue.
