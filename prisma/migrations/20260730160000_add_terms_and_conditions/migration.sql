-- QM-WP03C: Terms & Conditions section (folded into the existing
-- Commercial Terms workspace per Product Review — no separate workspace,
-- no separate status column; commercial_terms_status already covers it).
-- Idempotent, matching existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "terms_and_conditions" TEXT;
