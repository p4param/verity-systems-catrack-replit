-- VS08A: WorkspaceInstallation aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-015 (Runtime deployment anchor between Platform Catalog and Tenant Workspace)
--             ES-009 (WorkspaceInstallation belongs to 1 workspace and 1 package)
--             ES-010 (table: workspace_installations)

CREATE TABLE workspace_installations (
  -- Identity & Associations
  id                      UUID          NOT NULL DEFAULT gen_random_uuid(),
  workspace_id            UUID          NOT NULL,
  application_package_id  UUID          NOT NULL,

  -- Lifecycle: Installing | Installed | Suspended | Uninstalled
  status                  VARCHAR(50)   NOT NULL DEFAULT 'Installing',
  installed_at            TIMESTAMPTZ,  -- Business timestamp populated upon transition to Installed (D2)

  -- ES-001: Mandatory audit columns
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by              UUID,
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by              UUID,
  is_deleted              BOOLEAN       NOT NULL DEFAULT false,
  deleted_at              TIMESTAMPTZ,
  deleted_by              UUID,

  -- ES-001: Optimistic concurrency counter
  version                 BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT workspace_installations_pkey
    PRIMARY KEY (id),

  -- Explicit FK referential actions (ES-001 / CC-005)
  CONSTRAINT workspace_installations_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES tenant_workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT workspace_installations_package_fk
    FOREIGN KEY (application_package_id) REFERENCES platform_application_packages(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- A package can only be installed once per workspace (unique composite constraint)
  CONSTRAINT workspace_installations_workspace_package_unique
    UNIQUE (workspace_id, application_package_id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_workspace_installations_workspace_id ON workspace_installations (workspace_id);
CREATE INDEX idx_workspace_installations_package_id ON workspace_installations (application_package_id);
CREATE INDEX idx_workspace_installations_status ON workspace_installations (status);
CREATE INDEX idx_workspace_installations_is_deleted ON workspace_installations (is_deleted);
