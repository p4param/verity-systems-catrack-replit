-- VS08A: Tenant aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-013 (Tenant Lifecycle: Provisioning -> Active <-> Suspended -> Archived)
--             ES-009 (TenantCode & TenantName globally unique)
--             ES-010 (table: tenants)

DROP TABLE IF EXISTS tenants CASCADE;

CREATE TABLE tenants (
  -- Identity
  id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  code                VARCHAR(100)  NOT NULL,
  name                VARCHAR(255)  NOT NULL,

  -- Presentation
  display_name        VARCHAR(255)  NOT NULL,
  description         TEXT,
  logo_url            VARCHAR(1024),

  -- Platform Defaults
  default_time_zone   VARCHAR(100)  NOT NULL DEFAULT 'UTC',
  default_culture     VARCHAR(50)   NOT NULL DEFAULT 'en-US',
  default_currency    VARCHAR(10)   NOT NULL DEFAULT 'USD',

  -- Lifecycle: Provisioning | Active | Suspended | Archived
  status              VARCHAR(50)   NOT NULL DEFAULT 'Provisioning',

  -- ES-001: Mandatory audit columns
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by          UUID,
  is_deleted          BOOLEAN       NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID,

  -- ES-001: Optimistic concurrency
  version             BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_code_unique UNIQUE (code),
  CONSTRAINT tenants_name_unique UNIQUE (name)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_tenants_code ON tenants (code);
CREATE INDEX idx_tenants_name ON tenants (name);
CREATE INDEX idx_tenants_status ON tenants (status);
CREATE INDEX idx_tenants_is_deleted ON tenants (is_deleted);
