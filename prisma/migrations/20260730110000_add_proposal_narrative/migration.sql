-- QM-WP02B-02: Proposal Narrative Workspace.
-- Extends the existing cat_quotations table with the workspace's own
-- content fields and status column, same convention as Executive Summary
-- (QM-WP02A) and Scope of Services (QM-WP02B-01). No generic document
-- engine, no new table. Idempotent, matching existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "proposal_narrative" TEXT,
    ADD COLUMN IF NOT EXISTS "internal_author_notes" TEXT,
    ADD COLUMN IF NOT EXISTS "proposal_narrative_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';
