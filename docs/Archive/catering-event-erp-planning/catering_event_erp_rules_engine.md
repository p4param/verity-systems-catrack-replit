# Rules Engine & Business Configuration Framework
**Document Code:** ERP-RUL-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Rules Engine Architect & Business Process Automation Consultant  

---

## 1. Rules Engine & Formula Architecture

To allow business users to modify application behaviors (pricing, validation, discounts) without code changes, the ERP uses a **Logic Rules Engine** and an **Abstract Syntax Tree (AST) Formula Engine**:

```
[System Trigger Event]
         │
         ▼ Parse Payload into AST Context
  [Rules Engine Evaluator] ──► [Evaluate Conditions (e.g., AND/OR)]
                                         │
                                         ▼ Execute Actions
                        [Adjust Pricing / Send Alerts / Blocks]
```

### 1.1. Core Architectural Pillars
* **Configuration Over Customization:** Business logic (such as tax rates, regional pricing multipliers, and BEO approvals) is stored as JSON metadata configurations, not hardcoded.
* **Effective Date Range & Versioning:** Rules are versioned and include `effective_start` and `effective_end` dates, allowing admins to schedule seasonal rules (e.g. holiday surcharge) in advance.
* **High Performance Parsing:** Expressions are compiled into AST structures and cached in Redis, guaranteeing execution latencies under 5ms.

---

## 2. Configuration Hierarchy & Inheritance Model

Configurations cascade down from corporate levels to local operations. Lower levels can override parent settings:

```
[Global Level Configurations] 
       └── [Company / Tenant Level Overrides] 
                 └── [City / Regional Level Overrides] 
                           └── [Branch Facility Overrides] 
                                     └── [Department Overrides] 
                                               └── [User Settings]
```

### 2.1. Override Resolution Priority
When evaluating a configuration key (e.g., `default_tax_rate` or `lead_response_sla`):
1. The engine checks for a **User-level** override. If found, it returns this value.
2. If none, it checks the **Department** level, then **Branch**, **City**, **Company**, and finally falls back to the **Global** default setting.
3. Overrides can be locked at the parent level to prevent branches from changing critical policies (e.g., locking minimum event profit margins).

---

## 3. Database Schema Design (15 Tables DDL)

All configuration and rules tables are placed inside the `workflow` schema.

```sql
-- 1. Rule Definitions
CREATE TABLE workflow.rule_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "PRICE.SEASONAL_MARKUP"
    name VARCHAR(150) NOT NULL,
    category_id UUID, -- References rule_categories
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rule Versions
CREATE TABLE workflow.rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES workflow.rule_definitions(id),
    version_number INT NOT NULL,
    effective_start TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_rule_ver_num ON workflow.rule_versions(definition_id, version_number);

-- 3. Rule Conditions
CREATE TABLE workflow.rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.rule_versions(id),
    parameter_name VARCHAR(100) NOT NULL, -- e.g., "guest_count", "event_date"
    operator VARCHAR(20) NOT NULL, -- e.g., "GREATER_THAN", "BETWEEN", "EQUALS"
    value_expression TEXT NOT NULL, -- JSON formatted value or code
    logical_join VARCHAR(10) NOT NULL DEFAULT 'AND' -- AND, OR
);

-- 4. Rule Actions
CREATE TABLE workflow.rule_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.rule_versions(id),
    action_type VARCHAR(50) NOT NULL, -- e.g., "APPLY_DISCOUNT", "BLOCK_TRANSACTION"
    parameters_json JSONB NOT NULL
);

-- 5. Rule Groups
CREATE TABLE workflow.rule_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    priority INT NOT NULL DEFAULT 100
);

-- 6. Rule Categories
CREATE TABLE workflow.rule_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "PRICING", "VALIDATION"
    name VARCHAR(100) NOT NULL
);

-- 7. Rule Executions (Audit Logs)
CREATE TABLE workflow.rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.rule_versions(id),
    entity_id UUID NOT NULL, -- e.g. target Event ID
    is_triggered BOOLEAN NOT NULL,
    input_payload JSONB NOT NULL,
    output_actions JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rule_exec_entity ON workflow.rule_executions(entity_id);

-- 8. Formulas
CREATE TABLE workflow.formulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "EVENT.HEALTH_SCORE"
    expression TEXT NOT NULL, -- Math syntax formula string
    compiled_ast JSONB, -- Pre-compiled cache
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Configurations
CREATE TABLE workflow.configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "KITCHEN.LEAD_TIME_HOURS"
    name VARCHAR(150) NOT NULL,
    data_type VARCHAR(20) NOT NULL, -- INT, DECIMAL, STRING, BOOLEAN, JSON
    default_value TEXT NOT NULL,
    is_overridable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Configuration Values (Inheritance Table)
CREATE TABLE workflow.configuration_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID NOT NULL REFERENCES workflow.configurations(id),
    level VARCHAR(20) NOT NULL, -- GLOBAL, COMPANY, CITY, BRANCH, USER
    level_id UUID, -- Matching Entity UUID (e.g. Branch ID or User ID)
    value_text TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_config_inheritance ON workflow.configuration_values(configuration_id, level, level_id);

-- 11. Feature Flags
CREATE TABLE workflow.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "AI_DEMAND_FORECAST"
    name VARCHAR(150) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Feature Assignments
CREATE TABLE workflow.feature_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id UUID NOT NULL REFERENCES workflow.feature_flags(id),
    target_type VARCHAR(20) NOT NULL, -- COMPANY, BRANCH, USER
    target_id UUID NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_feature_assignment ON workflow.feature_assignments(flag_id, target_type, target_id);

-- 13. Business Policies
CREATE TABLE workflow.business_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "MINIMUM_MARGIN_POLICY"
    description TEXT,
    threshold_value NUMERIC(12,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Validation Rules
CREATE TABLE workflow.validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_table VARCHAR(100) NOT NULL, -- e.g. "orders"
    column_name VARCHAR(100) NOT NULL,
    regex_pattern VARCHAR(255) NOT NULL,
    error_message_template VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Configuration Audit Logs
CREATE TABLE workflow.configuration_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_value_id UUID,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    previous_value TEXT,
    current_value TEXT,
    updated_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Rule Types & Formula Examples

* **Validation Rules:** E.g., `guest_count` must be a positive integer, or `event_date` must be at least 7 days in the future for standard catering bookings.
* **Pricing & Dynamic Markups:**
  * If *Event Date = December 24-25* AND *City = New York*, apply Holiday Markup of 15%.
  * If *Guest Count > 500*, apply volume discount of 5%.
* **SLA & Routing Calculations:**
  * If *Lead Value > $50,000*, route to Senior Sales Consultant immediately and reduce first-response SLA from 4 hours to 30 minutes.
