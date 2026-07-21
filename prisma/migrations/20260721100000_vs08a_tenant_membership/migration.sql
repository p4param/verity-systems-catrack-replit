-- VS08A: TenantMembership aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-016 (Tenant Membership Model — identity separate from organizational participation)
--             ES-009 (TenantMembership belongs to 1 tenant and 1 user)
--             ES-010 (table: tenant_memberships)

CREATE TABLE tenant_memberships (
  -- Identity & Associations
  id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL,
  user_id             UUID          NOT NULL,

  -- Role within Tenant: Owner | Admin | Member | Guest
  tenant_role         VARCHAR(50)   NOT NULL DEFAULT 'Member',

  -- Lifecycle: Invited | Active | Suspended | Removed
  status              VARCHAR(50)   NOT NULL DEFAULT 'Invited',

  -- ES-001: Mandatory audit columns
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by          UUID,
  is_deleted          BOOLEAN       NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID,

  -- ES-001: Optimistic concurrency counter
  version             BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT tenant_memberships_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions (ES-001 / CC-006)
  CONSTRAINT tenant_memberships_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT tenant_memberships_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- Only one active membership per (tenant_id, user_id)
  CONSTRAINT tenant_memberships_tenant_user_unique
    UNIQUE (tenant_id, user_id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_tenant_memberships_tenant_id ON tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_user_id ON tenant_memberships (user_id);
CREATE INDEX idx_tenant_memberships_status ON tenant_memberships (status);
CREATE INDEX idx_tenant_memberships_is_deleted ON tenant_memberships (is_deleted);
