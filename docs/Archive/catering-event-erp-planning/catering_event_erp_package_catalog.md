# Package, Service Catalog, & Product Configuration Framework
**Document Code:** ERP-PSC-001  
**Version:** 1.0.0  
**Status:** Draft  
**Author:** Principal Product Architect & ERP Solution Designer  

---

## 1. Product Configuration & Service Catalog Architecture

Catering event packages combine multiple services (food menus, staff labor, equipment rentals, transportation, and venue rentals) into a single, cohesive bundle:

```
                          ┌───────────────────────────┐
                          │   Dynamic Package Builder │
                          └─────────────┬─────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
    [Food Menus]                [Staff Services]               [Asset Hires]
  - Buffet Packages            - Servers, Chefs                - Tables, Linens, Ovens
  - Mandatory dietary tags     - Hours scaled to guests        - Transport truck logistics
```

### 1.1. Core Design Principles
* **Modular Composition:** Packages are built by nesting standard catalog items (e.g. food platters, linen rentals) as either **Mandatory**, **Optional**, or **Add-on** components.
* **Compatibility & Validation Rules:** Configuration rules prevent conflicting selections (e.g., booking an outdoor grill buffet without allocating a matching outdoor cooking space or fire safety permit).
* **Live Margin Calculations:** The pricing engine aggregates raw ingredient costs, labor expenses, and transport logistics in real-time, warning sales planners if proposed package margins fall below the 35% corporate baseline.

---

## 2. Dynamic Pricing Framework

To support multiple operational markets, prices are calculated using a hierarchical structure:

* **Base Catalog Price:** Standard item price set at the company level.
* **Branch-Specific Pricing:** Branches override base pricing to account for local cost of living and ingredient sourcing variances.
* **Tier & Volume Pricing:** Pricing adjusts dynamically based on the guest count (e.g., a buffet package drops from $45/head to $38/head for guest counts >250).
* **Seasonal Markups:** Automated markups (e.g. 15% increase during high-demand wedding months like December) are scheduled using effective date ranges.

---

## 3. Database Schema Design (19 Tables DDL)

All service, package catalog, and promotion tables reside in the `menu` schema.

```sql
CREATE SCHEMA IF NOT EXISTS menu;

-- 1. Service Categories
CREATE TABLE menu.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "CATERING", "RENTALS", "STAFFING", "ENTERTAINMENT"
    name VARCHAR(100) NOT NULL
);

-- 2. Service Groups
CREATE TABLE menu.service_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES menu.service_categories(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "BUFFET_SERVICES", "FLORAL_DECOR"
    name VARCHAR(100) NOT NULL
);

-- 3. Services (Core Catalog Items)
CREATE TABLE menu.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES menu.service_groups(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'UNIT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Package Types
CREATE TABLE menu.package_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., "WEDDING", "CORPORATE", "BIRTHDAY"
    name VARCHAR(100) NOT NULL
);

-- 5. Packages
CREATE TABLE menu.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    type_id UUID NOT NULL REFERENCES menu.package_types(id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. Package Versions
CREATE TABLE menu.package_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES menu.packages(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    effective_start TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_end TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_package_ver_unique ON menu.package_versions(package_id, version_number);

-- 7. Package Components
CREATE TABLE menu.package_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES menu.package_versions(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES menu.services(id),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    default_qty NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    is_price_included BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Package Templates
CREATE TABLE menu.package_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    template_config JSONB NOT NULL, -- Composition structure
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Package Pricing
CREATE TABLE menu.package_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES menu.package_versions(id) ON DELETE CASCADE,
    branch_id UUID, -- Null implies company-wide base price
    base_price_per_head NUMERIC(12,2) NOT NULL,
    minimum_guests INT NOT NULL DEFAULT 1,
    tier_discount_rate NUMERIC(5,4) DEFAULT 0.0000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Package Discounts
CREATE TABLE menu.package_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_id UUID NOT NULL REFERENCES menu.package_pricing(id) ON DELETE CASCADE,
    discount_name VARCHAR(100) NOT NULL,
    discount_rate NUMERIC(5,4) NOT NULL, -- e.g. 0.1000 (10%)
    expires_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Package Approvals
CREATE TABLE menu.package_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES menu.package_versions(id) ON DELETE CASCADE,
    approver_user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    notes TEXT,
    actioned_at TIMESTAMP WITH TIME ZONE
);

-- 12. Package Recommendations
CREATE TABLE menu.package_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_segment_id UUID NOT NULL,
    package_id UUID NOT NULL REFERENCES menu.packages(id) ON DELETE CASCADE,
    rank INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Package Profitability
CREATE TABLE menu.package_profitability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES menu.package_versions(id) ON DELETE CASCADE,
    estimated_food_cost NUMERIC(12,2) NOT NULL,
    estimated_labor_cost NUMERIC(12,2) NOT NULL,
    estimated_margin_pct NUMERIC(5,2) NOT NULL, -- computed field
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Product Configurations
CREATE TABLE menu.product_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- Matches event record
    package_version_id UUID NOT NULL REFERENCES menu.package_versions(id),
    custom_configuration_json JSONB NOT NULL, -- Configured parameters chosen
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Configuration Rules
CREATE TABLE menu.configuration_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES menu.packages(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- e.g., "COMPATIBILITY", "DEPENDENCY", "VALIDATION"
    expression TEXT NOT NULL, -- e.g. "requires service:wh-oven-3 if outdoor=false"
    error_message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Promotions
CREATE TABLE menu.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    discount_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 17. Coupons
CREATE TABLE menu.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES menu.promotions(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. "SUMMER10"
    max_redemptions INT NOT NULL DEFAULT 100,
    current_redemptions INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 18. Package Analytics
CREATE TABLE menu.package_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES menu.packages(id) ON DELETE CASCADE,
    total_sales_count INT NOT NULL DEFAULT 0,
    revenue_generated NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Package Audit Logs
CREATE TABLE menu.package_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES menu.packages(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- e.g., "PUBLISHED", "PRICING_UPDATED"
    previous_values JSONB,
    current_values JSONB,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_package_audit ON menu.package_audit_logs(package_id, changed_at DESC);
```
