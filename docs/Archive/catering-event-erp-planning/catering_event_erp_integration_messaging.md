# Integration, Messaging, & Event Bus Framework
**Document Code:** ERP-INT-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Enterprise Integration Architect & Distributed Systems Consultant  

---

## 1. Integration & Messaging Design Principles

To support high transaction volumes, loose coupling, and reliable communication with third-party APIs (Stripe, Twilio, WhatsApp, QuickBooks), the ERP implements an **API-First, Event-Driven Integration Platform**:

```
                       ┌───────────────────────────────┐
                       │       ERP Domain Engine       │
                       └───────────────┬───────────────┘
                                               │ Publish Domain Event
                                               ▼
                       ┌───────────────────────────────┐
                       │           Event Bus           │
                       └───────┬───────────────┬───────┘
                               │               │
        Internal Subscriptions │               │ External Webhook Trigger
                               ▼               ▼
                       ┌───────────────┐┌───────────────┐
                       │   In-Memory   ││   Outbox      │
                       │   Handlers    ││   Processor   │
                       └───────────────┘└───────┬───────┘
                                                │ Sign & Deliver Payload
                                                ▼
                                        ┌───────────────┐
                                        │  Third-Party  │
                                        │  Webhook URL  │
                                        └───────────────┘
```

### 1.1. Core Integration Principles
* **Loose Coupling (Outbox Pattern):** Rather than calling external APIs directly during database transactions, modules write events to an "Outbox" table in the database. A background processor picks up these events and delivers them asynchronously. This prevents external API latency or outages from blocking database transactions.
* **Idempotency Safeguards:** Every message and webhook delivery payload must include a unique `idempotency_key`. Integration handlers verify this key against a Redis cache before processing requests to prevent duplicate transactions (e.g., duplicate credit card charges).
* **Circuit Breakers & Resiliency:** External API clients are protected by **Circuit Breakers**. If an external provider (like Twilio) fails repeatedly (e.g., 5 consecutive errors), the circuit opens and redirects subsequent messages to a retry queue, preventing thread starvation.

---

## 2. Event Bus & Webhook Architecture

* **Domain Events:** Used to coordinate logic internally between modules (e.g., `PaymentReceived` updates invoice statuses and registers the event on the executive dashboard).
* **Webhook Subscriptions:** Third-party partners and client systems can subscribe to specific event codes (e.g., `EventConfirmed`, `DispatchCompleted`).
* **Webhook Signatures:** To prevent spoofing attacks, Webhook payloads are signed using a SHA256 Hash-based Message Authentication Code (HMAC). The receiving system verifies the signature in the `X-Hub-Signature-256` header using a shared secret.

---

## 3. Database Schema Design (16 Tables DDL)

All messaging, queue, and webhook logs are housed inside the `integration` schema.

```sql
CREATE SCHEMA IF NOT EXISTS integration;

-- 1. Integration Definitions
CREATE TABLE integration.integration_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "STRIPE.PAYMENTS"
    name VARCHAR(150) NOT NULL,
    provider_name VARCHAR(100) NOT NULL, -- e.g., "Stripe", "Xero"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Integration Endpoints
CREATE TABLE integration.integration_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integration.integration_definitions(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- INBOUND, OUTBOUND
    url_endpoint VARCHAR(512) NOT NULL,
    auth_config JSONB NOT NULL, -- Encryption keys, tokens
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Event Definitions
CREATE TABLE integration.event_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "CRM.LEAD_CREATED", "FINANCE.PAYMENT_RECEIVED"
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255)
);

-- 4. Event Schemas (JSON Schema validations)
CREATE TABLE integration.event_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES integration.event_definitions(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL, -- e.g., "v1.0.0"
    schema_json JSONB NOT NULL, -- JSON Schema format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_event_schema_ver ON integration.event_schemas(event_id, version);

-- 5. Event Publishers
CREATE TABLE integration.event_publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES integration.event_definitions(id) ON DELETE CASCADE,
    publisher_service VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Event Subscribers
CREATE TABLE integration.event_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES integration.event_definitions(id) ON DELETE CASCADE,
    subscriber_service VARCHAR(100) NOT NULL,
    routing_key VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. Message Queues
CREATE TABLE integration.message_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g. "email_delivery_queue"
    routing_key VARCHAR(100) NOT NULL,
    dead_letter_queue_name VARCHAR(100) NOT NULL,
    max_retries INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Queue Messages
CREATE TABLE integration.queue_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES integration.message_queues(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'READY', -- READY, DELIVERING, COMPLETED, POISON
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_queue_msg_status ON integration.queue_messages(status, scheduled_at);

-- 9. Webhook Subscriptions (External systems)
CREATE TABLE integration.webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES integration.event_definitions(id) ON DELETE CASCADE,
    target_url VARCHAR(512) NOT NULL,
    signing_secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Webhook Deliveries (Audit Trail)
CREATE TABLE integration.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES integration.webhook_subscriptions(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    latency_ms INT,
    status VARCHAR(20) NOT NULL, -- SENT, FAILED
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_webhook_delivery_sub ON integration.webhook_deliveries(subscription_id, status);

-- 11. API Consumers
CREATE TABLE integration.api_consumers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    app_name VARCHAR(100) NOT NULL,
    client_id VARCHAR(100) NOT NULL UNIQUE,
    client_secret_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. API Contracts
CREATE TABLE integration.api_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id UUID NOT NULL REFERENCES integration.api_consumers(id) ON DELETE CASCADE,
    api_version VARCHAR(20) NOT NULL,
    rate_limit_rpm INT NOT NULL DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Integration Logs
CREATE TABLE integration.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integration.integration_definitions(id) ON DELETE SET NULL,
    direction VARCHAR(10) NOT NULL, -- INBOUND, OUTBOUND
    url VARCHAR(512) NOT NULL,
    payload_size_bytes INT NOT NULL,
    status_code INT,
    is_success BOOLEAN NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Message Retries
CREATE TABLE integration.message_retries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES integration.queue_messages(id) ON DELETE CASCADE,
    retry_number INT NOT NULL,
    error_message TEXT,
    retry_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Dead Letter Messages (Poison Messages)
CREATE TABLE integration.dead_letter_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES integration.queue_messages(id) ON DELETE CASCADE,
    original_queue VARCHAR(100) NOT NULL,
    failure_reason TEXT NOT NULL,
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Integration Configurations
CREATE TABLE integration.integration_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integration.integration_definitions(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_integration_config_key ON integration.integration_configurations(integration_id, config_key);
```

---

## 4. Saga & Distributed Transaction Workflows

When coordinating long-running workflows across multiple business domains (e.g., executing a booking requires locking inventory, reserving staff, and charging a deposit), the system implements a **Choreography-based Saga Pattern**:

* **Action Event:** The Sales module publishes `EventConfirmed`.
* **Saga Step 1 (Inventory):** The Inventory module subscribes to the event and reserves stock. If successful, it publishes `InventoryReserved`. If it fails (e.g., stockout), it publishes `InventoryReservationFailed`.
* **Saga Step 2 (Staffing):** The Staffing module subscribes to `InventoryReserved` and reserves staff. If successful, it publishes `StaffReserved`. If it fails, it publishes `StaffReservationFailed`.
* **Compensating Actions:** If any downstream step fails (e.g., a credit card charge fails at step 3), the system triggers compensating actions. The Staffing module releases reserved staff, the Inventory module releases locked stock, and the Event status reverts to `Negotiation`.
