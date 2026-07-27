# Venue Management & Venue Intelligence Framework
**Document Code:** ERP-VNM-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Venue Management Consultant, Event Operations Architect, & Enterprise Solution Architect  

---

## 1. Venue-Centric Planning & Logistics Intelligence

To optimize event costing, kitchen scaling, and delivery logistics, the ERP treats **Venues** as a primary operational coordinate:

```
                          ┌───────────────────────────┐
                          │    Venue Master Record    │
                          └─────────────┬─────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
  [Utility Capacities]         [Logistics Profiling]         [Restrictions Matrix]
  - Power: 100kW, 3-Phase       - Distance: 12.4 Miles        - Noise limit: 10:00 PM
  - Water hooks, Prep Kitchen   - Loading Dock: Max 10T       - Outside Catering: Banned
```

### 1.1. Core Architectural Pillars
* **Logistic Distance Matrix:** The system automatically calculates the transit distance and travel time between branch kitchens and venues using geolocation coordinates, which dynamically adjusts transport fees on quotations.
* **Utility & Capacity Bounds:** Venue records define utility constraints (e.g., maximum electrical power in kW, water accessibility, loading elevator weight limits) to prevent planners from booking menus or equipment that cannot be supported on-site.
* **Venue Restrictions Profile:** Details time constraints (e.g., sound limits starting at 10:00 PM), liquor license rules, and load-in windows, which are automatically added to BEO sheets and logistics run plans.

---

## 2. Database Schema Design (21 Tables DDL)

All venue profiling, commercial, and constraint logs reside in the `masterdata` schema.

```sql
CREATE SCHEMA IF NOT EXISTS masterdata;

-- 1. Venue Categories
CREATE TABLE masterdata.venue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. "BANQUET_HALL", "OPEN_GROUND", "HOTEL"
    name VARCHAR(100) NOT NULL
);

-- 2. Venue Types
CREATE TABLE masterdata.venue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES masterdata.venue_categories(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. "LUXURY_HALL", "RUSTIC_FARM"
    name VARCHAR(100) NOT NULL
);

-- 3. Venues
CREATE TABLE masterdata.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    type_id UUID NOT NULL REFERENCES masterdata.venue_types(id),
    name VARCHAR(255) NOT NULL,
    is_preferred_partner BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Venue Contacts
CREATE TABLE masterdata.venue_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'COORDINATOR', -- COORDINATOR, SECURITY, ACCOUNTS, OWNER
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Venue Addresses
CREATE TABLE masterdata.venue_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL UNIQUE REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Venue Halls (Specific rooms or sub-areas inside a venue)
CREATE TABLE masterdata.venue_halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g., "Grand Ballroom", "South Terrace"
    is_outdoor BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Venue Layouts
CREATE TABLE masterdata.venue_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID NOT NULL REFERENCES masterdata.venue_halls(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g. "Round Table Seating for 200"
    layout_diagram_path VARCHAR(512) NOT NULL, -- S3 URL to floor plan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Venue Utilities
CREATE TABLE masterdata.venue_utilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    power_capacity_kw NUMERIC(6,2),
    has_three_phase_power BOOLEAN NOT NULL DEFAULT FALSE,
    has_water_hookup BOOLEAN NOT NULL DEFAULT TRUE,
    has_prep_kitchen BOOLEAN NOT NULL DEFAULT FALSE,
    gas_type VARCHAR(30) DEFAULT 'NONE', -- NONE, NATURAL_GAS, PROPANE
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Venue Capacities
CREATE TABLE masterdata.venue_capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID NOT NULL REFERENCES masterdata.venue_halls(id) ON DELETE CASCADE,
    setup_style VARCHAR(50) NOT NULL, -- BUFFET, BANQUET_ROUNDS, THEATER, COCKTAIL
    max_capacity INT NOT NULL,
    seating_capacity INT,
    standing_capacity INT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_hall_setup_capacity ON masterdata.venue_capacities(hall_id, setup_style);

-- 10. Venue Pricing
CREATE TABLE masterdata.venue_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID NOT NULL REFERENCES masterdata.venue_halls(id) ON DELETE CASCADE,
    rental_amount NUMERIC(12,2) NOT NULL,
    seasonal_markup_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    security_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_rate NUMERIC(5,4) DEFAULT 0.0000, -- Commission paid to ERP tenant
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Venue Restrictions
CREATE TABLE masterdata.venue_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL, -- NOISE_LIMIT_PM, CATERING_LOCK, ALCOHOL_POLICY
    restriction_value TEXT NOT NULL,
    is_hard_rule BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Venue Documents
CREATE TABLE masterdata.venue_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    document_name VARCHAR(150) NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- S3 link to licenses, permits, etc.
    expires_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Venue Media
CREATE TABLE masterdata.venue_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    media_url VARCHAR(512) NOT NULL,
    media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE', -- IMAGE, VIDEO
    is_primary_photo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Venue Partnerships
CREATE TABLE masterdata.venue_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    partner_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, EXPIRED
    revenue_share_pct NUMERIC(5,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Venue Preferred Vendors
CREATE TABLE masterdata.venue_preferred_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL, -- Links to crm.vendors or masterdata.vendors
    relationship_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_venue_pref_vendor ON masterdata.venue_preferred_vendors(venue_id, vendor_id);

-- 16. Venue Event History
CREATE TABLE masterdata.venue_event_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    guest_count INT NOT NULL,
    net_profitability_amount NUMERIC(12,2) NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Venue Ratings
CREATE TABLE masterdata.venue_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Venue Scores (Readiness and Quality metrics)
CREATE TABLE masterdata.venue_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    logistics_accessibility_score INT NOT NULL DEFAULT 100, -- 0-100 ease of entry
    operational_rating INT NOT NULL DEFAULT 100, -- internal score based on incidents
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Venue Recommendations
CREATE TABLE masterdata.venue_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL, -- Target inquiry UUID
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    recommendation_rank INT NOT NULL DEFAULT 1,
    reason_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Venue Distances (Pre-calculated matrix)
CREATE TABLE masterdata.venue_distances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    distance_miles NUMERIC(8,2) NOT NULL,
    estimated_travel_minutes INT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_branch_venue_distance ON masterdata.venue_distances(branch_id, venue_id);

-- 21. Venue Audit Logs
CREATE TABLE masterdata.venue_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES masterdata.venues(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE_CAPACITY, BLOCK_DATE
    previous_state JSONB,
    current_state JSONB,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_venue_audit_time ON masterdata.venue_audit_logs(venue_id, changed_at DESC);
```

---

## 4. Logistics Access & Load-In Mapping
* **Access Level Categorization:** Tracks vehicle load-in parameters (e.g. height clearance limit, loading elevator capacity, street parking constraints) to prevent planners from routing vehicles (like 10-ton flatbeds) to restricted spaces.
* **Prep Kitchen Profiling:** Identifies whether the venue has preparation kitchens or if operations must dispatch mobile cooking setups.
* **Pre-Calculated Travel Times:** The `venue_distances` matrix is checked before routing delivery runs, automatically calculating timing safety margins during rush hours.
