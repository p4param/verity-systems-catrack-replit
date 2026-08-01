-- EM-WP02: Event Planning.
-- The Event Workspace's first editable operational area. Normalized
-- tables only (no JSON document): one 1:1 table for the singular
-- Operational Summary / Operational Notes fields, and four repeatable
-- list tables (Collection Authoring Pattern, matching the convention
-- established by cat_quotation_proposal_assumptions/exclusions) for
-- Event Timeline, Key Contacts, Risks & Special Instructions, and the
-- Planning Checklist. No status/workflow columns anywhere here — EM-WP02
-- is explicitly editable-only: no revision history, no workflow, no
-- approvals, no publish. Idempotent, matching existing convention.

CREATE TABLE IF NOT EXISTS "cat_event_planning" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "operations_owner" VARCHAR(255),
    "operations_contact_phone" VARCHAR(50),
    "operations_contact_email" VARCHAR(255),
    "operational_summary" TEXT,
    "operational_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_planning" PRIMARY KEY ("id"),
    CONSTRAINT "uq_cat_event_planning_event" UNIQUE ("event_id"),
    CONSTRAINT "fk_cat_event_planning_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_planning_tenant" ON "cat_event_planning" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_timeline_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "time_label" VARCHAR(100) NOT NULL,
    "activity" TEXT NOT NULL,
    "responsible_party" VARCHAR(255),
    "notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_timeline_items" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_timeline_items_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_timeline_items_event"
    ON "cat_event_timeline_items" ("event_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_timeline_items_tenant" ON "cat_event_timeline_items" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_key_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "contact_name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "notes" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_key_contacts" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_key_contacts_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_key_contacts_event"
    ON "cat_event_key_contacts" ("event_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_key_contacts_tenant" ON "cat_event_key_contacts" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_risks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "statement" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_risks" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_risks_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_risks_event" ON "cat_event_risks" ("event_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_risks_tenant" ON "cat_event_risks" ("tenant_id");

CREATE TABLE IF NOT EXISTS "cat_event_planning_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "item_text" TEXT NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "pk_cat_event_planning_checklist_items" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cat_event_planning_checklist_items_event"
        FOREIGN KEY ("event_id") REFERENCES "cat_events"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_cat_event_planning_checklist_items_event"
    ON "cat_event_planning_checklist_items" ("event_id", "display_order");
CREATE INDEX IF NOT EXISTS "idx_cat_event_planning_checklist_items_tenant"
    ON "cat_event_planning_checklist_items" ("tenant_id");
