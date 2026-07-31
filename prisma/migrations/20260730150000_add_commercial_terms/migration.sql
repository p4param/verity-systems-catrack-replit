-- QM-WP03B: Payment & Commercial Terms Workspace.
-- All fields stored directly on cat_quotations, per the frozen engineering
-- package: no child entities, no generic commercial abstractions.
-- Idempotent, matching existing convention.

ALTER TABLE "cat_quotations"
    ADD COLUMN IF NOT EXISTS "valid_until" DATE,
    ADD COLUMN IF NOT EXISTS "validity_notes" TEXT,
    ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "advance_required" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "advance_type" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "advance_value" NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS "balance_payment" TEXT,
    ADD COLUMN IF NOT EXISTS "commercial_notes" TEXT,
    ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(10) NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS "commercial_terms_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';
