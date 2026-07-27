# Technical Architecture Document (TAD)
## Multi-City, Multi-Branch Catering & Event Management ERP System
**Document Code:** ERP-TAD-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Chief Software Architect  

---

## 1. System Design Paradigm & Justification

### 1.1. Chosen Architecture: Modular Monolith (Transitioning to Distributed Microservices)

For the initial phases (MVP to high-growth scale), we select a **Modular Monolith** architecture deployed inside a Next.js monorepo using Turborepo. 

```
                               ┌────────────────────────────────┐
                               │       Client Applications      │
                               │  (Web App / Mobile Web Views)  │
                               └───────────────┬────────────────┘
                                               │ HTTP / WebSockets
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │       Next.js Gateway / Routing Layer        │
                        └──────────────────────┬───────────────────────┘
                                               │ In-process calls / Hooks
                                               ▼
         ┌───────────────────────────────────────────────────────────────────────────┐
         │                          Modular Core Engine                              │
         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
         │  │  CRM Module  │  │ Event Module │  │Kitchen Module│  │Inventory Mod.│   │
         │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
         └─────────────────────────────────────┬─────────────────────────────────────┘
                                               │ Prisma ORM / Direct Queries
                                               ▼
                               ┌────────────────────────────────┐
                               │    PostgreSQL Database (DB)    │
                               │  (Multi-tenant Isolated Schemas)│
                               └────────────────────────────────┘
```

#### Rationale for Modular Monolith over Pure Microservices
1. **Low Operational Overhead:** Avoids managing complex network configurations, service mesh proxies, and distributed transactions (Saga pattern) during initial scale.
2. **Strict Module Boundaries:** Enforced via TypeScript path aliases, clean interface abstraction, and linting rules. This allows isolated modules to be decoupled and split into standalone microservices easily when needed.
3. **Transactional Integrity:** Allows database transactions (`Prisma.$transaction`) across modules (e.g., locking inventory when invoicing) without needing two-phase commits.

---

## 2. Technology Stack & Justification

| Layer | Recommended Technology | Justification |
|---|---|---|
| **Frontend** | Next.js (latest App Router), React 19, TypeScript | Provides Server-Side Rendering (SSR) for initial loads, static optimization for reports, and React Server Components (RSC) to minimize client-side bundle size. |
| **Styling** | Tailwind CSS + ShadCN UI | Clean utility styling. Easy light/dark mode implementations using CSS variable tokens. |
| **State Management** | TanStack React Query + React Context | Client state is minimized. Server state is synchronized, cached, and refetched using React Query, reducing unnecessary API payloads. |
| **Backend Engine** | Next.js API Routes (Route Handlers) | Simplifies infrastructure. Provides edge/serverless scaling patterns while maintaining Next.js routing paradigms. |
| **Database** | PostgreSQL (Neon.tech or self-hosted) | Support for relational structure, custom schemas for multi-tenancy, raw JSONB fields for audit logging, and transactional consistency. |
| **ORM** | Prisma | Strong typing, easy migration management, database schema generation, and support for multi-schema execution. |
| **Cache Layer** | Redis | Caching session states, heavy database query results, and running rate-limiter tokens. |
| **Queue Engine** | BullMQ (Node-Redis based) | Asynchronous task management (BEO document compilation, email blasts, WhatsApp alerts) with automated retries. |

---

## 3. Application Directory Structure

To maintain strict boundaries in our Modular Monolith, we implement a **feature-sliced, modular directory structure**:

```
/apps
  └── /web
        ├── /src
        │     ├── /app                  # Next.js App Router (pages and api routes)
        │     │     ├── /api            # API gateway routing and routes
        │     │     └── /(dashboard)    # Unified layouts for ERP dashboard
        │     ├── /components           # Global shared UI components (buttons, inputs)
        │     ├── /lib                  # Shared modules (auth, logger, DB client)
        │     └── /modules              # Core business modules containing business logic
        │           ├── /crm
        │           ├── /events
        │           ├── /kitchen
        │           │     ├── /components # Module-specific components
        │           │     ├── /services   # Business logic (e.g., scaling recipes)
        │           │     ├── /actions.ts # Server Actions / Handlers
        │           │     └── /types.ts   # TS Interfaces
        │           └── /inventory
        ├── tsconfig.json
        └── tailwind.config.js
/packages
  ├── /database                         # Shared Prisma Schema and DB clients
  ├── /config                           # Shared ESLint, Prettier config
  └── /tsconfig                         # Base tsconfig rules
```

---

## 4. Multi-Tenant & Multi-City Database Architecture

To isolate tenants (e.g., distinct catering companies) while tracking data cleanly across cities and branches:

### 4.1. Multi-Tenancy Strategy: Schema-Based Isolation
* **Holding Database Instance:** A single PostgreSQL cluster manages multiple client schemas (one schema per tenant).
* **Security Isolation:** Database users are assigned to specific tenant schemas. This prevents tenant A from running queries against tenant B's schema.
* **Shared Routing DB:** A highly secure `global_admin` schema tracks active tenants, billing status, domain mapping, and database routing configurations.

### 4.2. City & Branch Entity Schema Design
Within a tenant's isolated schema, we structure branches and inventory locations:

```
                      ┌──────────────────┐
                      │    Tenant        │
                      └────────┬─────────┘
                               │ 1
                               │
                               ▼ *
                      ┌──────────────────┐
                      │    City          │
                      └────────┬─────────┘
                               │ 1
                               │
                               ▼ *
                      ┌──────────────────┐
                      │    Branch        │
                      └────────┬─────────┘
                               │ 1
                               ├──────────────────────────┐
                               │ *                        │ *
                               ▼                          ▼
                      ┌──────────────────┐       ┌──────────────────┐
                      │   Warehouse      │       │    Department    │
                      │ (Stocks/Assets)  │       │ (Kitchen/Sales)  │
                      └──────────────────┘       └──────────────────┘
```

---

## 5. Security & Authentication Architecture

### 5.1. Authentication Flow
* **Protocol:** JWT Access Token (15-minute lifespan) paired with a secure, HTTP-only, SameSite Cookie Refresh Token (7-day lifespan).
* **MFA:** Mandatory Multi-Factor Authentication (TOTP via Google Authenticator/Authy) for Admin and Finance personas.
* **IP/Geofence Controls:** Branch operations managers and inventory supervisors are geofenced—only allowed to log in or edit stock from verified warehouse IP ranges.

### 5.2. Audit Logging Design
To guarantee complete accountability, **all write actions** must write to an immutable audit ledger:

```sql
CREATE TABLE "AuditLog" (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL, -- e.g., "INVENTORY.DISPATCH_CREATE"
    entity_name VARCHAR(50) NOT NULL, -- e.g., "Event"
    entity_id INT NOT NULL,
    tenant_id INT NOT NULL,
    branch_id INT,
    previous_state JSONB, -- Diff calculations
    current_state JSONB,  -- Diff calculations
    ip_address VARCHAR(45) NOT NULL
);
CREATE INDEX idx_audit_entity ON "AuditLog"(entity_name, entity_id);
```

---

## 6. Asynchronous Jobs & Integration Architecture

To keep frontend response times low, all operations that do not require immediate UI feedback are offloaded to background workers:

```
[Next.js API Handler]
       │
       ▼ Push Job to Redis Queue
  [BullMQ Queue]
       │
       ├─► Job 1: Render BEO PDF (Chrome-Puppeteer instance)
       ├─► Job 2: WhatsApp Dispatch Alert (Twilio/WhatsApp Business API)
       ├─► Job 3: Sync Payment Ledger (QuickBooks/Xero API Integration)
       └─► Job 4: Recalculate Dashboard SNAPSHOT KPI (Prisma DB View)
```

### 6.1. Third-Party Integration Points
* **Payments:** Stripe & local options (e.g., Razorpay, Adyen) via webhooks to update invoice payments instantly.
* **Communications:** Twilio for transactional SMS, WhatsApp Business API for dispatch alerts, SendGrid/Postmark for transactional emails.
* **Accounting:** QuickBooks Online / Xero double-entry ledger synchronization.

---

## 7. Observability, Monitoring & Disaster Recovery

### 7.1. Observability Stack
* **Log Aggregation:** Winston or Pino logging to Console (std-out), parsed by **Grafana Loki** or **Datadog**.
* **Metrics:** Prometheus endpoint tracking Next.js performance and database query latencies.
* **Tracing:** OpenTelemetry instrumentation to monitor complex requests spanning API routes, database transactions, and background queues.

### 7.2. Backup & Recovery Strategy
1. **Continuous Backups:** Daily snapshots + point-in-time recovery (PITR) up to 30 days (supported natively by Neon/AWS RDS).
2. **Offsite Replication:** Encrypted database backups are copied to a secondary, geographically isolated object storage bucket (e.g., AWS S3 glacier / Backblaze B2) every 6 hours.
3. **Chaos Testing:** Run monthly restoration drills to verify backup files are correct and RTO limits (4 hours) are met.

---

## 8. Scaling and Deployment Architecture

### 8.1. Hosting Strategy Evolution

```
[Startup Scale (Vercel + Neon DB)]
     ├── Next.js Apps hosted on Vercel Serverless
     └── Database on Neon Serverless PostgreSQL
     
[Mid-Tier / Self-Hosted Scale (Hetzner / Proxmox VM)]
     ├── PM2 cluster running Next.js Server builds on VMs
     └── PostgreSQL running on dedicated VM with NVMe disks
     
[Enterprise Scale (Kubernetes / AWS)]
     ├── Next.js Pods managed by Kubernetes HPA (Horizontal Pod Autoscaler)
     └── Dedicated RDS Aurora PostgreSQL cluster
```

### 8.2. Horizontal Scaling Roadmap
* **Step 1:** Decouple standard reads from writes. Route all analytical reports and dashboards to a read-only database replica.
* **Step 2:** Offload memory-heavy jobs (e.g., PDF generation, AI scheduling models) from API pods into isolated, autoscaling Kubernetes worker pods.
* **Step 3:** Use a content delivery network (CDN) to cache static assets (menu images, template structures, reports) at edge locations close to users.
