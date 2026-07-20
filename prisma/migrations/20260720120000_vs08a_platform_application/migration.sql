-- VS08A: PlatformApplication aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)

CREATE TABLE platform_applications (
  -- Identity
  id            UUID          NOT NULL DEFAULT gen_random_uuid(),
  code          VARCHAR(255)  NOT NULL,
  name          VARCHAR(255)  NOT NULL,
  display_name  VARCHAR(255)  NOT NULL,
  description   TEXT,
  category      VARCHAR(255)  NOT NULL,
  icon_url      TEXT,
  website_url   TEXT,

  -- Lifecycle: Draft | Published | Deprecated | Retired
  status        VARCHAR(50)   NOT NULL DEFAULT 'Draft',

  -- ES-001: Mandatory audit columns
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by    UUID,
  is_deleted    BOOLEAN       NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,

  -- ES-001: Optimistic concurrency
  version       BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT platform_applications_pkey PRIMARY KEY (id),
  CONSTRAINT platform_applications_code_unique UNIQUE (code),
  CONSTRAINT platform_applications_name_unique UNIQUE (name)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_platform_applications_status    ON platform_applications (status);
CREATE INDEX idx_platform_applications_category  ON platform_applications (category);
CREATE INDEX idx_platform_applications_is_deleted ON platform_applications (is_deleted);
