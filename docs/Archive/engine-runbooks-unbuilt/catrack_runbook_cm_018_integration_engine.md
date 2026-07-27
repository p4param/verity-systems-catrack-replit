# Catrack Technical Runbook: CM-018 Integration Engine
**Catrack ERP Platform Component Specification (CM-018)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-018`
*   **Component Name:** Integration Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Webhook Subscriptions, REST Connector Framework, Payment Gateway Handlers, Communication API Wrappers, Queue Retry Orchestrator.
*   **Target Audience:** Enterprise Software Engineers, DevOps Engineers, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-018` is to implement a unified, secure integration platform that coordinates external REST connections, webhook events, payment processes, accounting link runs, and communication APIs across all modules of the Catrack ERP platform.

### Functional Scope
*   **Generic REST Connector Framework:** Standardizing connections to external REST services.
*   **Webhook Dispatch System:** Triggering HTTP events to subscriber endpoints upon database changes.
*   **Payment Gateway Handlers:** Managing Stripe, PayPal, or local banking API integrations.
*   **Communication API Wrappers:** Routing messages to Twilio (SMS), Meta API (WhatsApp), and SendGrid (Email).
*   **Accounting System Linkages:** Synchronizing ledger invoices and payments with external ERP platforms.
*   **Queue Retry Orchestration:** Automatically retrying failed external calls.

---

## 3. Technical Architecture Expectations

The Integration Engine must conform to the following architectural design:

```
                            EXTERNAL INTEGRATION PIPELINE
                            
                               Integration Request (Action Trigger)
                                         |
                                         v
                            +--------------------------+
                            |    API Payload Parser    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Secure Secrets Fetch   |
                            | (Inject credentials vars)|
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Dispatch Queueing      |
                            |   (BullMQ / Redis)       |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Worker Dispatcher     |
                            +--------------------------+
                             /         |             \
                            /          |              \
                           v           v               v
                    [ Webhooks ]  [ Payments ]    [ Messaging ]
                           \           |              /
                            \          |             /
                             v         v            v
                            +--------------------------+
                            |     Response Check       |
                            +--------------------------+
                             /                        \
                        (Success 2xx)               (Fail 4xx/5xx)
                          /                            \
                         v                              v
            +--------------------+             +--------------------+
            | Update Log History |             |   Retry Handler    |
            |   (Record success) |             | (Check back-off)   |
            +--------------------+             +--------------------+
                                                        |
                                                  (Retry Limit)
                                                        |
                                                        v
                                               +--------------------+
                                               | Trigger Alert Log  |
                                               |     (Failed)       |
                                               +--------------------+
```

*   **BullMQ Integration:** External API calls and webhooks must run asynchronously in background workers using BullMQ.
*   **Encryption of Credentials:** Client API keys, access tokens, and webhook secrets are encrypted at rest using AES-256 keys.
*   **Idempotency Key Guard:** Financial operations must include client-generated idempotency keys in payload schemas.

---

## 4. Domain Model & Boundaries

The Integration Engine manages these entities:

*   **IntegrationConnector:** Stores connector details, base URLs, credentials, driver types, and statuses.
*   **WebhookSubscription:** Stores subscriber URLs, event scopes, custom headers, and signature verification keys.
*   **IntegrationExecutionHistory:** Stores execution timestamps, payload histories, response codes, and retries.

---

## 5. API Contract Specifications

All endpoints under `CM-018` must reside within the versioned `/api/v1/integrations/` namespace:

### 1. Register Webhook Subscription
*   **Route:** `POST /api/v1/integrations/webhooks`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "url": "https://client-erp.com/api/v1/events-receiver",
      "events": [
        "event.status.confirmed",
        "booking.invoice.generated"
      ],
      "secret": "webhook-secret-key-12"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "subscriptionId": "sub-uuid-1234",
        "status": "ACTIVE"
      }
    }
    ```

### 2. Query Integration Logs
*   **Route:** `GET /api/v1/integrations/jobs/:jobId/logs`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "jobId": "job-uuid-123",
        "status": "FAILED",
        "responseCode": 503,
        "retryCount": 3,
        "errorDetail": "Service Unavailable: Stripe API timeout."
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Managing scheduled jobs (creating, disabling, or trigger runs) requires the `ADMIN_ACCESS` permission scope.
*   **Data Scoping:** Background jobs must run within a designated tenant context (`tenantId`), preventing data leakage.

---

## 7. Caching & Performance Guidelines

*   **Secrets Caching (L2):** Configuration details and API keys are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Performance Optimization:** Outgoing webhooks are batched, restricting concurrent requests to a maximum of 50 per domain.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-018` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Queue Builder ] -> [ Phase 3: Connector Driver ] -> [ Phase 4: Webhook Dispatch ] -> [ Phase 5: Verification ]
* Create Integration tables   * Setup BullMQ Redis queues   * Build Stripe driver         * Build payload signers       * Write Vitest unit tests
* Run Prisma migrations        * Implement retry handlers    * Build Messaging drivers     * Setup webhook retry cron    * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define integration connector, webhook subscription, and execution history log tables in the schemas. Run migrations.
*   **Phase 2: Queue Builder Setup:** Implement BullMQ queues and configure exponential back-off retry handlers.
*   **Phase 3: Connector Driver Integration:** Build Stripe payment interfaces and Twilio/SendGrid wrappers.
*   **Phase 4: Webhook Dispatch Implementation:** Build payload signers and setup cron workers to retry failed webhook calls.
*   **Phase 5: Verification & Tests:** Write unit tests to check payload signers, and write E2E tests to verify payment processing and retry pipelines.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Payload signature calculators and connector handlers must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that secrets are encrypted and webhooks enforce tenant scoping rules.
# Catrack Technical Runbook & Specification (CM-018 Integration Engine) completed successfully.
