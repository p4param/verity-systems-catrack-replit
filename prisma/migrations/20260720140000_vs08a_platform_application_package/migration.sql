-- VS08A: PlatformApplicationPackage aggregate table
-- Engine: VS08 License, Subscription & Tenant Management Engine
-- Milestone: VS08A Tenant Foundation
-- Compliance: ES-001 (UUID PK, audit columns, soft delete, optimistic concurrency)
--             ADR-008-012 (SemVer 2.0.0, version stored as string)
--             ES-009 §6 (published artifacts are immutable)
--             ES-010 (table: platform_application_packages)

CREATE TABLE platform_application_packages (
  -- Identity
  id               UUID          NOT NULL DEFAULT gen_random_uuid(),
  application_id   UUID          NOT NULL,
  package_version  VARCHAR(50)   NOT NULL,   -- SemVer 2.0.0 string; validated in domain layer

  -- Metadata (immutable after creation — no updateMetadata capability per CC-002)
  display_name     VARCHAR(255)  NOT NULL,
  description      TEXT,
  release_notes    TEXT,

  -- Lifecycle: Draft | Published | Deprecated | Archived
  status           VARCHAR(50)   NOT NULL DEFAULT 'Draft',

  -- ES-001: Mandatory audit columns
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by       UUID,
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by       UUID,
  is_deleted       BOOLEAN       NOT NULL DEFAULT false,
  deleted_at       TIMESTAMPTZ,
  deleted_by       UUID,

  -- ES-001: Optimistic concurrency
  version          BIGINT        NOT NULL DEFAULT 1,

  CONSTRAINT platform_application_packages_pkey
    PRIMARY KEY (id),
  -- Version uniqueness is scoped per PlatformApplication (ADR-008-012)
  CONSTRAINT platform_application_packages_app_version_unique
    UNIQUE (application_id, package_version),
  -- FK to PlatformApplication — application must exist before package can be created
  CONSTRAINT platform_application_packages_application_fk
    FOREIGN KEY (application_id) REFERENCES platform_applications(id)
);

-- ES-001 §8: Required indexes
CREATE INDEX idx_platform_application_packages_application_id
  ON platform_application_packages (application_id);
CREATE INDEX idx_platform_application_packages_status
  ON platform_application_packages (status);
CREATE INDEX idx_platform_application_packages_package_version
  ON platform_application_packages (package_version);
CREATE INDEX idx_platform_application_packages_is_deleted
  ON platform_application_packages (is_deleted);
