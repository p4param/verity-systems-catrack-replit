-- QM-WP02A: Proposal Builder Shell — Executive Summary Workspace.
-- Extends the existing cat_quotations table (no new tables, no generic
-- ProposalSection table). Idempotent, matching the existing migration
-- convention for this module.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "proposal_objective" TEXT,
    ADD COLUMN IF NOT EXISTS "executive_notes" TEXT,
    ADD COLUMN IF NOT EXISTS "executive_summary_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';
