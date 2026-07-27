# Customer Self-Service Portal & Engagement Framework
**Document Code:** ERP-CSP-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Customer Experience Architect & Portal Solution Architect  

---

## 1. Portal Architecture & Authentication

The Customer Self-Service Portal is designed as a **Progressive Web Application (PWA)**, providing a responsive experience across web and mobile:

```
[Customer Mobile / Web PWA]
            │
            ▼ Pre-Signed Link / Secure OTP Login
   [Portal Gateway (API)] ──► [Scoped Access Layer (Read-Only DB Replica)]
            │
            ▼ Action: Digital Signature / Deposit Payment
   [Secure Stripe & DocuSign Integrations]
```

### 1.1. Access & Security Controls
* **Pre-Signed Guest Access Links:** For ease of use, clients receive unique, secure links (with embedded tokens) via Email/WhatsApp (e.g. `portal.platform.com/events/smith-wedding-2026?token=abc123xyz`). These links grant scoped, read-only access to their specific event checklist, menu plans, and invoices without requiring password setups.
* **OTP & Passwordless Login:** Return users log in using mobile OTP or social logins (Google, Apple).
* **Multi-User Family Scopes:** Allows multiple contacts (e.g., Bride, Groom, and Wedding Planner) to access the same event details. The event owner can delegate permissions (e.g., allowing the planner to submit menu modifications but restricting payment views to the bride).

---

## 2. Interactive Customer Dashboard

Once logged in, the client's home dashboard displays event progress and action items:

* **Event Countdown Tracker:** Live calendar countdown showing days remaining until the event.
* **Outstanding Actions List:** Prompts users to complete outstanding tasks (e.g. *"Confirm final guest count"*, *"Approve menu quotation version 2"*).
* **Payment Progress Meter:** Displays paid deposits, next payment dates, and outstanding balances with a primary "Pay Now" Stripe checkout button.
* **Document Explorer:** Access to download proposals, invoices, BEO run-sheets, and upload venue licenses.

---

## 3. Database Schema Design (16 Tables DDL)

All customer portal and self-service tables are housed inside the `crm` schema.

```sql
-- 1. Portal Users (Credentials and Auth)
CREATE TABLE crm.portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(30),
    password_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Portal Sessions
CREATE TABLE crm.portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_portal_sessions_token ON crm.portal_sessions(token);

-- 3. Portal Devices (For push notifications)
CREATE TABLE crm.portal_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL UNIQUE, -- Firebase FCM device token
    device_type VARCHAR(20) NOT NULL, -- IOS, ANDROID, WEB
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customer Portal Profiles (User settings)
CREATE TABLE crm.customer_portal_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    avatar_url VARCHAR(512),
    language_preference VARCHAR(10) NOT NULL DEFAULT 'en-US',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Portal Preferences
CREATE TABLE crm.portal_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES crm.customer_portal_profiles(id) ON DELETE CASCADE,
    notify_email BOOLEAN NOT NULL DEFAULT TRUE,
    notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
    notify_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
    notify_push BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Portal Notifications (In-App inbox for client)
CREATE TABLE crm.portal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_portal_notif_user ON crm.portal_notifications(user_id, is_read);

-- 7. Portal Messages (Chat logs with event manager)
CREATE TABLE crm.portal_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    manager_user_id UUID NOT NULL,
    message_text TEXT NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- CLIENT, STAFF
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Portal Tickets (Help desk requests)
CREATE TABLE crm.portal_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    assigned_staff_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Portal Announcements (Corporate bulletins)
CREATE TABLE crm.portal_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    target_tier VARCHAR(50), -- Option to target membership tiers
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Portal Documents (Files visible to client)
CREATE TABLE crm.portal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    document_name VARCHAR(150) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Portal Payments (Client-facing invoice log)
CREATE TABLE crm.portal_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- CREDIT_CARD, ACH
    stripe_charge_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Portal Feedback (Post-event surveys)
CREATE TABLE crm.portal_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    food_rating INT NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
    service_rating INT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Portal Recommendations
CREATE TABLE crm.portal_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    recommendation_title VARCHAR(150) NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- e.g., "Menu", "DecorationPackage"
    entity_id UUID NOT NULL,
    discount_offered NUMERIC(5,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Portal Referrals
CREATE TABLE crm.portal_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    referee_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- SENT, REGISTERED, CONVERTED
    converted_customer_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Portal Activities (Audit logs of client actions)
CREATE TABLE crm.portal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- e.g., "DOWNLOAD_BEO", "APPROVE_QUOTE"
    ip_address VARCHAR(45),
    details TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_portal_act_user ON crm.portal_activities(user_id, logged_at DESC);

-- 16. Portal Access Permissions (Granular multi-user share rules)
CREATE TABLE crm.portal_access_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES crm.portal_users(id) ON DELETE CASCADE,
    allowed_route VARCHAR(100) NOT NULL, -- e.g., "/billing", "/menu-planning"
    is_write_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_user_route_perm ON crm.portal_access_permissions(user_id, allowed_route);
```
