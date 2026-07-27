# Customer 360, Loyalty, & Relationship Management Framework
**Document Code:** ERP-C360-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal CRM Architect, Customer Experience Consultant, & Relationship Management Specialist  

---

## 1. Customer 360 Design Principles & Profiles

To maximize customer lifetime value (CLV) and coordinate repeat business (birthdays, weddings, corporate events), the ERP uses a **Single Customer View** mapping relationships, preferences, and financial histories:

```
                          ┌───────────────────────────┐
                          │   Customer 360 Profile    │
                          └─────────────┬─────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
  [Loyalty Account]             [Family & Household]          [Preference Matrix]
  - Points Balance: 1,250       - Spouse & Kids mappings      - Vegan, Nut-Allergy
  - Membership Tier: Gold       - Corporate Affiliations      - Preferred Outdoor Venue
```

### 1.1. Core Customer Profile Dimensions
* **Profile Aggregations:** Displays contact records, household links, communication logs (emails, calls, WhatsApp history), past event listings, financial totals (total spend, average booking margin), and active loyalty statuses.
* **Customer Health Score:** Calculated dynamically (0-100) based on event feedback ratings, payment history delays, and cancellation rates.

---

## 2. Family & Relationship Graph Architecture

Catering and event planning are highly relationship-driven. The ERP models social networks dynamically:

* **Household Groupings:** Groups families under a single "Household" record to track collective event budgets and send unified holiday reminders.
* **Semantic Relationship Mapping:** Links customers using self-referencing relationship pairs (e.g. `Spouse`, `Parent/Child`, `Corporate Secretary/Executive`).
* **Multi-Level Referrals:** Tracks client referrals using an affiliate model, rewarding both the referrer and referee with loyalty points or invoice discount vouchers.

---

## 3. Database Schema Design (20 Tables DDL)

All customer profiling, loyalty, and feedback tables reside inside the `crm` schema.

```sql
-- 1. Customer Profiles (Extended details)
CREATE TABLE crm.customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    date_of_birth DATE,
    wedding_anniversary DATE,
    company_position VARCHAR(100), -- For corporate buyers
    lifetime_revenue NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    lifetime_profitability NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_profile_customer ON crm.customer_profiles(customer_id);

-- 2. Customer Households
CREATE TABLE crm.customer_households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    household_name VARCHAR(150) NOT NULL, -- e.g., "The Miller Family"
    primary_contact_id UUID NOT NULL REFERENCES crm.customers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Relationships (Semantic links)
CREATE TABLE crm.customer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    target_customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- SPOUSE, CHILD, CORPORATE_PARTNER
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_self_relationship CHECK (source_customer_id <> target_customer_id)
);
CREATE INDEX idx_cust_rel_source ON crm.customer_relationships(source_customer_id);

-- 4. Customer Preferences
CREATE TABLE crm.customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    preference_category VARCHAR(50) NOT NULL, -- DIETARY, CUISINE, VENUE, SEATING
    preference_value TEXT NOT NULL,
    is_critical_allergy BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customer Timelines
CREATE TABLE crm.customer_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- INQUIRY, EVENT_COMPLETED, CALL_LOGGED, FEEDBACK
    reference_id UUID, -- Link to event_id or activity_id
    timeline_summary VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cust_timeline ON crm.customer_timelines(customer_id, occurred_at DESC);

-- 6. Customer Milestones (Aniversaries, Birthdays, Corporate dates)
CREATE TABLE crm.customer_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g., "Founder's Day", "Silver Anniversary"
    milestone_date DATE NOT NULL,
    is_recurring_yearly BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Loyalty Programs
CREATE TABLE crm.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    points_to_currency_ratio NUMERIC(6,4) NOT NULL DEFAULT 0.0100, -- e.g. 1 point = $0.01
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Membership Tiers
CREATE TABLE crm.membership_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES crm.loyalty_programs(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- Silver, Gold, Platinum
    min_spend_required NUMERIC(12,2) NOT NULL,
    discount_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000, -- e.g. 0.0500 (5% off)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Customer Loyalty Accounts
CREATE TABLE crm.customer_loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES crm.customers(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES crm.membership_tiers(id) ON DELETE SET NULL,
    current_points_balance INT NOT NULL DEFAULT 0,
    cumulative_points_earned INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Loyalty Transactions
CREATE TABLE crm.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES crm.customer_loyalty_accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- EARNED, REDEEMED, ADJUSTED, EXPIRED
    points_amount INT NOT NULL,
    reference_entity VARCHAR(50), -- "Invoice", "Referral"
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Rewards Catalog
CREATE TABLE crm.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES crm.loyalty_programs(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    points_required INT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 12. Reward Redemptions
CREATE TABLE crm.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES crm.customer_loyalty_accounts(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES crm.rewards(id),
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, FULFILLED, CANCELLED
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Referrals
CREATE TABLE crm.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    referee_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- SENT, REGISTERED, CONVERTED
    converted_customer_id UUID REFERENCES crm.customers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Referral Rewards
CREATE TABLE crm.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES crm.referrals(id) ON DELETE CASCADE,
    reward_type VARCHAR(20) NOT NULL, -- POINTS, VOUCHER
    reward_value NUMERIC(12,2) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE
);

-- 15. Customer Segments
CREATE TABLE crm.customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g., "High-Value Repeat Corporate"
    segment_rule_expression TEXT NOT NULL, -- DSL or JSON Rule check
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Customer Scores (RFM, Churn, Potential)
CREATE TABLE crm.customer_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    rfm_score VARCHAR(10) NOT NULL, -- Recency, Frequency, Monetary (e.g. 555)
    health_score INT NOT NULL, -- 0-100
    churn_probability NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_health ON crm.customer_scores(customer_id, health_score);

-- 17. Customer Feedback (Ratings)
CREATE TABLE crm.customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    event_id UUID, -- Link to Event
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Customer Surveys
CREATE TABLE crm.customer_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    survey_questions JSONB NOT NULL, -- Dynamic question formats
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Customer Communications
CREATE TABLE crm.customer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL, -- CALL, EMAIL, WHATSAPP, SMS
    direction VARCHAR(10) NOT NULL, -- INBOUND, OUTBOUND
    subject VARCHAR(255),
    content TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Customer Recommendations
CREATE TABLE crm.customer_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL, -- MENU_ITEM, UPSELL_UPGRADE
    entity_id UUID NOT NULL, -- Target Menu Item or Package ID
    confidence_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. RFM Segmentation & Customer Lifetime Value (CLV)

To segment and target customers effectively:

* **RFM Scores:** Calculated monthly by analyzing **Recency** (days since last booking), **Frequency** (number of events booked in the past 12 months), and **Monetary Value** (total spent). Values are scored from 1-5, resulting in segment codes (e.g. `555` represents a high-value active client).
* **Loyalty Reward Redemption:** Points earned from event spending are logged in the `loyalty_transactions` ledger. Planners can redeem these points during quotation setups to apply invoice discounts.
