# Enterprise Notification Framework Specification
**Document Code:** ERP-NTF-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Communication Architect & Workflow Automation Consultant  

---

## 1. Architectural Principles & Event-Driven Topology

The Enterprise Notification Framework is built around a decoupled, asynchronous, **event-driven architecture**. High-volume transactions within ERP modules generate domain events that are published to a central message bus, processed by a notification routing engine, and queued for delivery across various channels.

```
[ERP Module Action]
        │
        ▼ Publish Domain Event
  [Event Router] ──────► [Evaluates Subscriptions & User Preferences]
                                    │
                                    ▼ Push Job to Target Queue
                     [Target Delivery Queues (BullMQ / Redis)]
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                    ▼
         [Email Worker]       [SMS Worker]       [WhatsApp Worker]
          (SendGrid)            (Twilio)         (Meta Cloud API)
```

### 1.1. Core Design Principles
* **Asynchronous Execution:** All message formatting, rendering, and API deliveries are handled outside the main request cycle via background workers.
* **Tenant & Branch Isolation:** Notification queues, preferences, templates, and delivery logs must segment data by company, city, and branch identifiers.
* **Strict Delivery Guarantees:** Critical notifications (e.g., payment confirmations, event alerts) must support "At-Least-Once" delivery, backed by retry logic and dead-letter queues (DLQ).

---

## 2. Notification Channels & Integrated Providers

The framework supports seven communication channels:

| Channel | Core Provider | Primary Operational Purpose |
|---|---|---|
| **In-App** | PostgreSQL + WebSockets | Renders notifications directly in the user interface (e.g., BEO approvals, task updates). |
| **Email** | SendGrid / Postmark | Delivers formal documents (e.g., invoices, contracts, proposals). |
| **SMS** | Twilio / Plivo | Delivers time-sensitive updates to operations and logistics staff. |
| **WhatsApp** | Meta Cloud API | Sends delivery ETAs, menu updates, and contract sign reminders. |
| **Push** | Firebase Cloud Messaging (FCM) | Sends alerts to mobile applications (e.g., driver route changes, check-ins). |
| **Browser** | W3C Web Push Protocol | Delivers browser notifications for inactive tabs. |
| **Webhooks** | Custom HTTP Delivery | Delivers event payload alerts to external customer systems (e.g., CRM sync). |

---

## 3. Engine Architecture & Verification Lifecycles

### 3.1. Escalation Engine Flow
If a critical approval notification (e.g., a high-discount quote) is not addressed within a defined SLA window, the escalation engine routes the task to the next management level:

```
[Approval Request Created] ──► [Wait SLA: 4 Hours] ──► [Check Status: Pending?]
                                                             │
[Escalate to Regional Mgr] ◄── [Send Alert to Manager] ◄─────┘
```

1. **Trigger:** An approval task is created with a designated SLA window (e.g., 4 hours).
2. **SLA Monitor:** A cron-based monitor evaluates outstanding tasks.
3. **Escalation Stage 1:** If the task is unaddressed after the SLA window, the system updates the task assignee to the next supervisor in the hierarchy and sends an urgent WhatsApp/SMS alert.
4. **Escalation Stage 2:** If the task is still unaddressed after 8 hours, the system alerts regional operations leads.

---

## 4. Database Schema Design (14 Tables DDL)

All notification tables reside within the `notifications` schema.

```sql
CREATE SCHEMA IF NOT EXISTS notifications;

-- 1. Notification Definitions
CREATE TABLE notifications.notification_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "EVENT.CONFIRMED"
    name VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL, -- e.g., "EVENTS", "FINANCE"
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notification Events
CREATE TABLE notifications.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES notifications.notification_definitions(id),
    payload JSONB NOT NULL, -- Context variables
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Notification Templates
CREATE TABLE notifications.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES notifications.notification_definitions(id),
    channel VARCHAR(20) NOT NULL, -- EMAIL, SMS, WHATSAPP, IN_APP
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    subject_template VARCHAR(255),
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Notification Preferences
CREATE TABLE notifications.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    definition_id UUID NOT NULL REFERENCES notifications.notification_definitions(id),
    channel VARCHAR(20) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_user_pref_def ON notifications.notification_preferences(user_id, definition_id, channel);

-- 5. Notification Subscriptions
CREATE TABLE notifications.notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES notifications.notification_definitions(id),
    subscriber_type VARCHAR(50) NOT NULL, -- "ROLE", "USER", "DEPARTMENT"
    subscriber_id UUID NOT NULL,
    branch_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notification Queue
CREATE TABLE notifications.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES notifications.notification_events(id),
    recipient_user_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notif_queue_status ON notifications.notification_queue(status, scheduled_for);

-- 7. Notification History
CREATE TABLE notifications.notification_history (
    id UUID PRIMARY KEY, -- Uses same UUID from queue to maintain reference
    event_id UUID NOT NULL REFERENCES notifications.notification_events(id),
    recipient_user_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- SENT, FAILED, UNDELIVERABLE
    error_message TEXT
);
CREATE INDEX idx_notif_hist_recipient ON notifications.notification_history(recipient_user_id, sent_at);

-- 8. Email Queue
CREATE TABLE notifications.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES notifications.notification_queue(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    attachments JSONB, -- Array of document IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. SMS Queue
CREATE TABLE notifications.sms_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES notifications.notification_queue(id),
    recipient_phone VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. WhatsApp Queue
CREATE TABLE notifications.whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES notifications.notification_queue(id),
    recipient_phone VARCHAR(30) NOT NULL,
    template_name VARCHAR(100),
    template_parameters JSONB, -- Variable values
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Push Queue
CREATE TABLE notifications.push_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES notifications.notification_queue(id),
    recipient_device_token VARCHAR(255) NOT NULL,
    title VARCHAR(150) NOT NULL,
    body VARCHAR(255) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Scheduled Notifications
CREATE TABLE notifications.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES notifications.notification_definitions(id),
    recipient_user_id UUID NOT NULL,
    payload JSONB NOT NULL,
    send_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence_rule VARCHAR(100), -- CRON expression or NULL for one-off
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TRIGGERED, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sched_notif_time ON notifications.scheduled_notifications(send_at, status);

-- 13. Escalation Rules
CREATE TABLE notifications.escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES notifications.notification_definitions(id),
    sla_minutes INT NOT NULL, -- Time before trigger
    escalation_step INT NOT NULL DEFAULT 1,
    action_type VARCHAR(50) NOT NULL, -- e.g., "ASSIGN_ROLE", "SEND_SMS"
    action_target UUID NOT NULL, -- Role ID or User ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Communication Logs (System Delivery Receipts)
CREATE TABLE notifications.communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    history_id UUID REFERENCES notifications.notification_history(id),
    external_provider_message_id VARCHAR(100), -- SendGrid Message ID, Twilio SID
    status VARCHAR(20) NOT NULL, -- DELIVERED, BOUNCED, SPAM_REPORT, OPENED, CLICKED
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comm_log_ext ON notifications.communication_logs(external_provider_message_id);
```

---

## 5. Performance, Scalability & Deliverability Policies

To support peak transaction seasons and guarantee delivery:

* **Rate Limiting & Backpressure:** Integration workers must monitor provider rate limits (e.g. WhatsApp limits limits to 80 messages per second). If thresholds are exceeded, the worker pauses the queue to prevent API lockouts.
* **Partitioning & Archiving Strategy:** The `communication_logs` and `notification_history` tables are partitioned by month. Records older than 180 days are automatically archived to cold object storage (AWS S3) to keep tables small.
* **Bulk Processing:** Bulk transactional emails (like billing run updates or notifications to multiple vendors) are batched into a single API call to minimize network overhead.
