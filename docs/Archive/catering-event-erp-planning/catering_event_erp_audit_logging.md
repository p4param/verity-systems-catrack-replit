# Activity Logging & Audit Framework
**Document Code:** ERP-AUD-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Audit Architect, Compliance Consultant, & Observability Expert  

---

## 1. Audit Security & Immutability Strategy

To guarantee absolute compliance (SOX, GDPR, and ISO 27001 readiness) and prevent internal data tampering:

```
[System Event / Write Action]
             │
             ▼ Auto-Intercept (Prisma Middleware / DB Trigger)
  [Format Log Payload (JSONB Diffs)]
             │
             ├───► Write to Local DB: [audit.audit_logs] (Append-Only)
             └───► Stream to External Cloud Store (WORM: Write Once Read Many)
```

### 1.1. Core Architectural Pillars
* **Append-Only Immutability:** The database user profile used by the application server has read/write permissions for transaction tables, but is restricted to **INSERT-only** permissions on tables in the `audit` schema. Update and Delete operations are blocked at the database level.
* **Write Once Read Many (WORM):** In addition to database logging, critical security and financial audit records are streamed in real-time to a secure, write-once object storage bucket (e.g., AWS S3 with Object Lock enabled). This prevents even database administrators (DBAs) from altering audit trails.
* **Cryptographic Tamper Detection:** Audit log chains are hashed sequentially. Each log row contains a hash representing the cumulative state of previous logs, ensuring that any deletions or alterations of historical logs immediately break the chain.

---

## 2. Field-Level Change Tracking (Diffs)

To track changes precisely, the system records modifications at the individual field level:

* **Before & After Snapshots:** Log payloads record the precise state change in a JSONB structure:
  ```json
  {
    "changed_fields": {
      "grand_total_amount": {
        "before": 25000.00,
        "after": 22500.00
      },
      "discount_rate": {
        "before": 0.00,
        "after": 0.10
      }
    },
    "reason_code": "DISCOUNT_APPROVED_BY_BRANCH_DIR"
  }
  ```
* **Reason Codes:** The application layer prompts users to select a reason code (e.g., `CORRECTION`, `CLIENT_NEGOTIATION`) when making sensitive modifications (such as price overrides or deleting reservation items).

---

## 3. Database Schema Design (16 Tables DDL)

All logging and audit tables are housed inside the `audit` schema.

```sql
CREATE SCHEMA IF NOT EXISTS audit;

-- 1. Activity Logs (High-level business trail)
CREATE TABLE audit.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL, -- e.g., "EVENT.CREATE"
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Entity Activity Logs (Link logs to specific records)
CREATE TABLE audit.entity_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES audit.activity_logs(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- e.g., "Event", "Invoice"
    entity_id UUID NOT NULL
);
CREATE INDEX idx_entity_act_lookup ON audit.entity_activity_logs(entity_type, entity_id);

-- 3. Audit Logs (Low-level database triggers)
CREATE TABLE audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit Snapshots (State history cache)
CREATE TABLE audit.audit_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    state_snapshot JSONB NOT NULL, -- Full row representation
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_snapshot_record ON audit.audit_snapshots(table_name, record_id);

-- 5. Change History (Field-level Diffs)
CREATE TABLE audit.change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NOT NULL REFERENCES audit.audit_logs(id) ON DELETE CASCADE,
    column_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT
);

-- 6. User Activity Logs
CREATE TABLE audit.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID,
    event_type VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, PAGE_VIEW
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Security Logs
CREATE TABLE audit.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code VARCHAR(100) NOT NULL, -- e.g., "MFA.FAILED", "BRUTE_FORCE"
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. API Logs
CREATE TABLE audit.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(100),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_headers JSONB,
    response_status INT NOT NULL,
    latency_ms INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_api_logs_time ON audit.api_logs(created_at DESC);

-- 9. Integration Logs
CREATE TABLE audit.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name VARCHAR(100) NOT NULL, -- e.g., "QuickBooks"
    direction VARCHAR(10) NOT NULL, -- INBOUND, OUTBOUND
    payload JSONB,
    status VARCHAR(20) NOT NULL, -- SUCCESS, ERROR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Workflow Logs
CREATE TABLE audit.workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL,
    from_state VARCHAR(50),
    to_state VARCHAR(50) NOT NULL,
    triggered_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Notification Logs
CREATE TABLE audit.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(255) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- EMAIL, SMS, WHATSAPP
    status VARCHAR(20) NOT NULL, -- SENT, FAILED
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Performance Logs
CREATE TABLE audit.performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_name VARCHAR(150) NOT NULL, -- e.g. db query, render time
    duration_ms NUMERIC(10,2) NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Error Logs
CREATE TABLE audit.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Export Logs
CREATE TABLE audit.export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    export_type VARCHAR(50) NOT NULL, -- e.g., "EXCEL", "PDF"
    record_count INT NOT NULL,
    filters_used JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Import Logs
CREATE TABLE audit.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    records_processed INT NOT NULL,
    records_failed INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. System Health Logs
CREATE TABLE audit.system_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(100) NOT NULL,
    cpu_usage_pct NUMERIC(5,2),
    memory_usage_bytes BIGINT,
    disk_usage_pct NUMERIC(5,2),
    is_healthy BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Operational Retention & Compliance Policies

To support billions of log records without degrading system performance:

* **Database Partitioning:** The `audit_logs`, `change_history`, `api_logs`, and `user_activity_logs` tables are partitioned by year (or by month at larger volumes) on the `created_at` timestamp.
* **Audit Data Retention:** Financial audit and security logs are kept in active database partitions for 2 years, after which they are archived to cold object storage (S3 WORM) for an additional 5 years to meet regulatory retention requirements.
* **Data Masking (PII Protection):** Before writing to `activity_logs` or `api_logs`, sensitive information (such as password inputs, tax IDs, credit card numbers, and client telephone numbers) must be scrubbed or masked using custom middleware filters.
