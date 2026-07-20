-- VS08A: TenantWorkspace aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-014 (Tenant Workspace Model, operational boundary)
--             ES-009 (WorkspaceCode & WorkspaceName unique per owning tenant)
--             ES-010 (table: tenant_workspaces)

CREATE TABLE tenant_workspaces (
  -- Identity
  id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL,
  code                VARCHAR(100)  NOT NULL,
  name                VARCHAR(255)  NOT NULL,

  -- Presentation
  display_name        VARCHAR(255)  NOT NULL,
  description         TEXT,

  -- Workspace Defaults (inherits from Tenant defaults if omitted during creation)
  time_zone           VARCHAR(100)  NOT NULL DEFAULT 'UTC',
  culture             VARCHAR(50)   NOT NULL DEFAULT 'en-US',
  currency            VARCHAR(10)   NOT NULL DEFAULT 'USD',

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

  CONSTRAINT tenant_workspaces_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions: ON DELETE RESTRICT ON UPDATE RESTRICT
  CONSTRAINT tenant_workspaces_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- Workspace code & name are scoped per tenant (ES-009 / ADR-008-014)
  CONSTRAINT tenant_workspaces_tenant_code_unique
    UNIQUE (tenant_id, code),
  CONSTRAINT tenant_workspaces_tenant_name_unique
    UNIQUE (tenant_id, name)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_tenant_workspaces_tenant_id ON tenant_workspaces (tenant_id);
CREATE INDEX idx_tenant_workspaces_code ON tenant_workspaces (code);
CREATE INDEX idx_tenant_workspaces_status ON tenant_workspaces (status);
CREATE INDEX idx_tenant_workspaces_is_deleted ON tenant_workspaces (is_deleted);
