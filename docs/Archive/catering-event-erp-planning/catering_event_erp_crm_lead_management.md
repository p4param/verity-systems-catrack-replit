# CRM & Lead Management Framework
**Document Code:** ERP-CRM-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal CRM Architect, Sales Process Consultant, & Enterprise Solution Architect  

---

## 1. Customer Acquisition Lifecycle

The ERP manages the complete customer journey from initial lead capture to event completion and repeat business:

```
 [Lead Captured] ──► [Inquiry Created] ──► [Qualified Opportunity]
                                                 │
 [Deposit/Booking] ◄── [Negotiated Quote] ◄──────┴──► [Lost (with Reason Code)]
```

### 1.1. Lifecycle Stages & Targets
1. **Lead Capture:** Basic contact info is captured from marketing sources (website, social campaigns, walk-ins). Lead scoring is calculated immediately.
2. **Inquiry Qualification:** Sales team checks date availability, venue specifications, estimated guest count, and budget ranges.
3. **Opportunity & Quoting:** Multiple versions of a quotation are generated. Profit margins are calculated using ingredient cost formulas.
4. **Booking / Conversion:** The deposit is paid, assets are reserved in the database, and the lead is converted into a confirmed Event record.
5. **Repeat & Referral:** Automated follow-ups run post-event to capture reviews and prompt repeat bookings for annual events (e.g., corporate galas).

---

## 2. Lead Routing & Assignment Engine

To ensure prompt follow-up times (SLA < 15 minutes for high-value leads):

* **Round-Robin Routing:** Evaluates active sales agents by city and branch, assigning new incoming leads sequentially.
* **Territory & Branch Rules:** Leads are routed to the branch closest to the client's requested event location.
* **Skill-Based Assignment:** High-value corporate inquiries (>500 guests or >$50k budget) bypass standard routing rules and are assigned to senior corporate event consultants.

---

## 3. Database Schema Design (20 Tables DDL)

All CRM and Lead management tables are housed inside the `crm` schema.

```sql
CREATE SCHEMA IF NOT EXISTS crm;

-- 1. Customer Groups
CREATE TABLE crm.customer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g. "VIP Corporate", "Wholesale Partners"
    discount_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers (Master Profile)
CREATE TABLE crm.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    group_id UUID REFERENCES crm.customer_groups(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL', -- INDIVIDUAL, CORPORATE
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Contacts (Individual Contact Persons)
CREATE TABLE crm.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PRIMARY', -- PRIMARY, BILLING, LOGISTICS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Lead Sources
CREATE TABLE crm.lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "WEBSITE", "FACEBOOK", "COLD_CALL"
    name VARCHAR(100) NOT NULL
);

-- 5. Campaigns
CREATE TABLE crm.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    source_id UUID NOT NULL REFERENCES crm.lead_sources(id),
    budget_allocated NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Leads
CREATE TABLE crm.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    source_id UUID REFERENCES crm.lead_sources(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'NEW', -- NEW, ASSIGNED, NURTURING, CONVERTED, LOST
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Campaign Leads (Link table)
CREATE TABLE crm.campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES crm.campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_campaign_lead_unique ON crm.campaign_leads(campaign_id, lead_id);

-- 8. Lead Assignments
CREATE TABLE crm.lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- 9. Lead Scores
CREATE TABLE crm.lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
    raw_score INT NOT NULL,
    grade VARCHAR(5) NOT NULL, -- A, B, C, D
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Inquiries
CREATE TABLE crm.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES crm.customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm.leads(id) ON DELETE SET NULL,
    requested_event_date DATE NOT NULL,
    estimated_guests INT NOT NULL,
    estimated_budget NUMERIC(12,2),
    venue_preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Sales Pipelines
CREATE TABLE crm.sales_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 12. Pipeline Stages
CREATE TABLE crm.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES crm.sales_pipelines(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    win_probability_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00
);

-- 13. Opportunities
CREATE TABLE crm.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES crm.inquiries(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES crm.pipeline_stages(id),
    deal_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    assigned_user_id UUID NOT NULL,
    expected_close_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Activities
CREATE TABLE crm.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES crm.opportunities(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL, -- CALL, MEETING, EMAIL, NOTES
    notes TEXT NOT NULL,
    logged_by_user_id UUID NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Follow-Ups
CREATE TABLE crm.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES crm.opportunities(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_user_id UUID NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 16. Customer Preferences
CREATE TABLE crm.customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL, -- e.g. "CUISINE_VEGAN", "VENUE_OUTDOOR"
    preference_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Customer Relationships
CREATE TABLE crm.customer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_a_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    customer_b_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- e.g. "SPOUSE", "SUBSIDIARY"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Customer Tags
CREATE TABLE crm.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 19. Sales Forecasts
CREATE TABLE crm.sales_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    forecast_month DATE NOT NULL,
    predicted_value NUMERIC(12,2) NOT NULL,
    confidence_rate_pct NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Lost Reasons
CREATE TABLE crm.lost_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES crm.opportunities(id) ON DELETE CASCADE,
    reason_code VARCHAR(50) NOT NULL, -- e.g., "PRICE_HIGH", "DATE_UNAVAILABLE", "COMPETITOR"
    additional_notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Catering-Specific CRM Enhancements

The CRM is optimized specifically for food service and event planning workflows:

* **Dietary & Preference Tracking:** Customer profiles include custom arrays detailing allergen requirements (e.g. Nut-Free, Dairy-Free) and cuisine preferences (e.g., Asian Fusion, Mediterranean Buffet), which automatically load when planners generate menu quotes.
* **History-Based Recommender:** When an inquiry is logged for an existing client (e.g., annual corporate dinner), the system reads historical booking sizes, budgets, and preferred venues, suggesting matching menu packages.
* **Lost Opportunity Reasons:** Opportunities closed as "lost" require selecting a standardized reason code (e.g., `LOST.BUDGET`, `LOST.VENUE_UNAVAILABLE`) which automatically updates the pipeline analytics dashboard.
