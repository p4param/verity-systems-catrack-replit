# Task Management, Workflow Engine, & SLA Framework
**Document Code:** ERP-WFE-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Workflow Architect & Business Process Automation Consultant  

---

## 1. Workflow Engine Architecture

The ERP uses an event-driven **Finite State Machine (FSM)** workflow engine to coordinate operations. Workflows are defined via templates, instantiated per event, and run sequentially or in parallel based on conditions:

```
[Event Trigger] ──► [Evaluate Rules] ──► [Route to Task Assignments]
                                                │
[Auto-Escalate] ◄── [SLA Timer Breached] ◄──────┴──► [Parallel Tasks Spawned]
```

### 1.1. Execution Patterns
* **Sequential Workflows:** Tasks must be executed in a strict chronological order. For example, a credit card transaction must settle before logistics packing can begin.
* **Parallel Workflows:** Multiple tasks run concurrently. For example, during event planning, the kitchen scales recipes while the logistics coordinator maps delivery routes.
* **Conditional Branching:** Rules evaluate database variables dynamically (e.g., if guest count > 500, spawn task: *"Request health safety inspector review"*).

---

## 2. Task Lifecycle State Machine

Tasks transition through ten operational states to guarantee visibility and enforce SLAs:

| State | Entry Criteria | Exit Criteria | SLA Behavior |
|---|---|---|---|
| **Draft** | Template instantiated. | Task definition finalized. | SLA clock inactive. |
| **Pending** | Awaiting predecessor task completion. | Predecessors marked as completed. | SLA clock inactive. |
| **Assigned** | Task active. Assignee designated. | Assignee accepts task. | Response SLA clock runs. |
| **Accepted** | Assignee accepts task. | Assignee marks task as started. | Response SLA satisfied. |
| **In Progress** | Assignee starts task. | Task submitted for verification. | Resolution SLA clock runs. |
| **Waiting** | Task blocked by external dependency. | Block resolved by system. | SLA clock paused. |
| **Completed** | Verifier signs off on task. | None (terminal state). | SLA clocks satisfied. |
| **Cancelled** | Event cancelled or task bypassed. | None (terminal state). | Clocks cancelled. |
| **Rejected** | Verifier rejects submission. | Returned to In Progress. | Resolution SLA resumes. |
| **Overdue** | SLA time threshold breached. | Task completed or escalated. | Trigger Escalation Rules. |

---

## 3. SLA & Escalation Framework

* **Response SLA:** The maximum time allowed for an assignee to accept an assigned task (e.g., 2 hours for urgent kitchen orders).
* **Resolution SLA:** The maximum time allowed to complete a task (e.g., 24 hours to scale recipes).
* **SLA Pauses & Business Hours:** Clocks are paused outside of configured business working hours (e.g., 08:00 AM - 06:00 PM) and national holiday calendars.
* **Escalation Triggers:** When a threshold is breached, the engine reassigns the task, logs the SLA breach in the database, and alerts managers via SMS/WhatsApp.

---

## 4. Workflow Schema & DDL Models

All task and workflow tables reside within the `workflow` schema.

```sql
CREATE SCHEMA IF NOT EXISTS workflow;

-- 1. Workflow Definitions
CREATE TABLE workflow.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "EVENT_CLOSURE_FLOW"
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workflow Versions
CREATE TABLE workflow.workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES workflow.workflow_definitions(id),
    version_number INT NOT NULL,
    definition_json JSONB NOT NULL, -- Visual layout nodes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_wf_version_num ON workflow.workflow_versions(definition_id, version_number);

-- 3. Workflow Templates
CREATE TABLE workflow.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.workflow_versions(id),
    name VARCHAR(150) NOT NULL,
    target_entity VARCHAR(50) NOT NULL, -- e.g., "Event", "PurchaseOrder"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Workflow Instances
CREATE TABLE workflow.workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES workflow.workflow_templates(id),
    entity_id UUID NOT NULL, -- Target Event ID or PO ID
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, SUSPENDED
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Workflow States
CREATE TABLE workflow.workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.workflow_versions(id),
    code VARCHAR(50) NOT NULL, -- e.g., "BEO_APPROVAL"
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL -- START, END, TASK, DECISION
);

-- 6. Workflow Transitions
CREATE TABLE workflow.workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.workflow_versions(id),
    from_state_id UUID NOT NULL REFERENCES workflow.workflow_states(id),
    to_state_id UUID NOT NULL REFERENCES workflow.workflow_states(id),
    condition_expression VARCHAR(255) -- e.g., "event.guest_count > 500"
);

-- 7. Workflow Rules
CREATE TABLE workflow.workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES workflow.workflow_versions(id),
    state_id UUID NOT NULL REFERENCES workflow.workflow_states(id),
    rule_type VARCHAR(50) NOT NULL, -- e.g., "AUTO_APPROVE", "ROUTING"
    rule_expression TEXT NOT NULL
);

-- 8. Workflow Actions
CREATE TABLE workflow.workflow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES workflow.workflow_states(id),
    action_type VARCHAR(50) NOT NULL, -- e.g., "SEND_EMAIL", "GENERATE_TASK"
    parameters_json JSONB
);

-- 9. Tasks
CREATE TABLE workflow.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow.workflow_instances(id),
    branch_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, ASSIGNED, COMPLETED, OVERDUE, etc.
    version_no INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 10. Task Assignments
CREATE TABLE workflow.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    assignee_type VARCHAR(20) NOT NULL, -- USER, ROLE, DEPARTMENT, TEAM
    assignee_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- 11. Task Dependencies
CREATE TABLE workflow.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    dependency_task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    dependency_type VARCHAR(20) NOT NULL DEFAULT 'FINISH_TO_START'
);

-- 12. Task Comments
CREATE TABLE workflow.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    author_user_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Task Attachments
CREATE TABLE workflow.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Task Reminders
CREATE TABLE workflow.task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    notification_channel VARCHAR(20) NOT NULL, -- EMAIL, SMS, WHATSAPP, IN_APP
    is_sent BOOLEAN NOT NULL DEFAULT FALSE
);

-- 15. SLA Definitions
CREATE TABLE workflow.sla_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    task_code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "KITCHEN.RECIPE_SCALE"
    response_sla_minutes INT,
    resolution_sla_minutes INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. SLA Instances
CREATE TABLE workflow.sla_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id),
    definition_id UUID NOT NULL REFERENCES workflow.sla_definitions(id),
    response_deadline TIMESTAMP WITH TIME ZONE,
    resolution_deadline TIMESTAMP WITH TIME ZONE,
    is_response_breached BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolution_breached BOOLEAN NOT NULL DEFAULT FALSE,
    elapsed_active_minutes INT NOT NULL DEFAULT 0
);

-- 17. Escalation Rules
CREATE TABLE workflow.escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sla_definition_id UUID NOT NULL REFERENCES workflow.sla_definitions(id),
    breach_type VARCHAR(20) NOT NULL, -- RESPONSE, RESOLUTION
    trigger_delay_minutes INT NOT NULL DEFAULT 0,
    escalation_action VARCHAR(50) NOT NULL, -- REASSIGN, NOTIFY_MANAGER
    action_parameters JSONB
);

-- 18. Holiday Calendars
CREATE TABLE workflow.holiday_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    holiday_date DATE NOT NULL,
    description VARCHAR(150) NOT NULL
);
CREATE UNIQUE INDEX idx_holiday_date ON workflow.holiday_calendars(company_id, holiday_date);

-- 19. Working Calendars (Business Hours)
CREATE TABLE workflow.working_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    day_of_week INT NOT NULL, -- 0 (Sunday) to 6 (Saturday)
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '18:00:00'
);

-- 20. Approval Workflows
CREATE TABLE workflow.approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- e.g., "QUOTE_DISCOUNT", "PROCUREMENT_LIMIT"
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. Approval Instances
CREATE TABLE workflow.approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow.approval_workflows(id),
    entity_id UUID NOT NULL, -- Target Event ID or PO ID
    current_step INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Workflow Automation & Triggers

To automate coordination across modules, the engine monitors system hooks:

* **Trigger W-001 (Automated Task Generation):** When `crm.leads.status` transitions to `QUALIFIED`, trigger step: instantiate `workflow_templates.inquiry_qualification` which automatically generates discovery tasks for the Sales Manager.
* **Trigger W-002 (Inventory Allocation):** When `workflow.approval_instances.status` transitions to `APPROVED` for a BEO quote, trigger step: lock and reserve required stock items in `inventory.warehouse_stocks`.
* **Trigger W-003 (SLA Check):** Check the SLA status of all active tasks hourly. If `sla_instances.resolution_deadline` is past the current timestamp AND `tasks.status` is not `COMPLETED`, trigger the escalation path to reassign the task.
