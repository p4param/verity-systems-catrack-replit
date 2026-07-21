-- VS08A: WorkspaceMembership aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-017 (Workspace Membership Model — operational access boundary)
--             ES-009 (WorkspaceMembership belongs to 1 workspace and 1 tenant membership)
--             ES-010 (table: workspace_memberships)

CREATE TABLE workspace_memberships (
  -- Identity & Associations
  id                    UUID          NOT NULL DEFAULT gen_random_uuid(),
  workspace_id          UUID          NOT NULL,
  tenant_membership_id  UUID          NOT NULL,

  -- Role within Workspace: WorkspaceAdmin | Contributor | Viewer | Guest
  workspace_role        VARCHAR(50)   NOT NULL DEFAULT 'Contributor',

  -- Lifecycle: Invited | Active | Suspended | Removed
  status                VARCHAR(50)   NOT NULL DEFAULT 'Invited',

  -- ES-001: Mandatory audit columns
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by            UUID,
  is_deleted            BOOLEAN       NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID,

  -- ES-001: Optimistic concurrency counter
  version               BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT workspace_memberships_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions (ES-001 / CC-007)
  CONSTRAINT workspace_memberships_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES tenant_workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT workspace_memberships_tenant_membership_fk
    FOREIGN KEY (tenant_membership_id) REFERENCES tenant_memberships(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- Only one active workspace membership per (workspace_id, tenant_membership_id)
  CONSTRAINT workspace_memberships_workspace_tenant_mem_unique
    UNIQUE (workspace_id, tenant_membership_id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_workspace_memberships_workspace_id ON workspace_memberships (workspace_id);
CREATE INDEX idx_workspace_memberships_tenant_mem_id ON workspace_memberships (tenant_membership_id);
CREATE INDEX idx_workspace_memberships_status ON workspace_memberships (status);
CREATE INDEX idx_workspace_memberships_is_deleted ON workspace_memberships (is_deleted);
