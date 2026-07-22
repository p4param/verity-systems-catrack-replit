-- VS09 EWP-003: NotificationDelivery ledger schema

CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'RENDERED',
  'DISPATCHED',
  'PROVIDER_ACCEPTED',
  'DELIVERED',
  'SUPPRESSED',
  'FAILED',
  'DEAD_LETTER'
);

CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "workspace_id" UUID,
  "notification_intent_id" UUID NOT NULL,
  "correlation_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(255) NOT NULL,
  "template_id" UUID NOT NULL,
  "template_version" VARCHAR(50) NOT NULL,
  "channel_id" UUID NOT NULL,
  "provider_id" UUID,
  "recipient_user_id" UUID,
  "recipient_endpoint" VARCHAR(500) NOT NULL,
  "delivery_status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "next_attempt_at" TIMESTAMPTZ,
  "rendered_subject" VARCHAR(1000),
  "rendered_body" TEXT,
  "failure_reason" VARCHAR(2000),
  "dispatched_at" TIMESTAMPTZ,
  "accepted_at" TIMESTAMPTZ,
  "delivered_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_by" UUID,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" UUID,
  "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_delivery_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "delivery_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "provider_id" UUID,
  "status" "NotificationDeliveryStatus" NOT NULL,
  "response_code" VARCHAR(100),
  "error_details" VARCHAR(2000),
  "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_delivery_attempts_delivery_fkey"
    FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_delivery_tenant_idempotency"
  ON "notification_deliveries"("tenant_id", "idempotency_key");

CREATE INDEX "idx_delivery_tenant"
  ON "notification_deliveries"("tenant_id");

CREATE INDEX "idx_delivery_intent"
  ON "notification_deliveries"("notification_intent_id");

CREATE INDEX "idx_delivery_correlation"
  ON "notification_deliveries"("correlation_id");

CREATE INDEX "idx_delivery_tenant_status"
  ON "notification_deliveries"("tenant_id", "delivery_status");

CREATE INDEX "idx_delivery_next_attempt"
  ON "notification_deliveries"("next_attempt_at");

CREATE INDEX "idx_delivery_is_deleted"
  ON "notification_deliveries"("is_deleted");

CREATE INDEX "idx_delivery_provider"
  ON "notification_deliveries"("tenant_id", "provider_id");

CREATE UNIQUE INDEX "uq_delivery_attempt_number"
  ON "notification_delivery_attempts"("delivery_id", "attempt_number");

CREATE INDEX "idx_attempt_delivery"
  ON "notification_delivery_attempts"("delivery_id");
