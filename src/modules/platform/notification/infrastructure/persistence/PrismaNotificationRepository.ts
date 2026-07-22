// VS09 EWP-003: PrismaNotificationRepository

import { prisma } from '@/lib/prisma';
import type { INotificationRepository } from '../../domain/notifications/INotificationRepository';
import { Notification } from '../../domain/notifications/Notification';
import type {
  DeliveryAttemptRecord,
  NotificationDeliveryRecord,
  NotificationDeliveryStatus,
} from '../../domain/notifications/NotificationModels';
import {
  DeliveryConcurrencyError,
  DuplicateIdempotencyException,
} from '../../domain/notifications/NotificationErrors';

function fromOrmAttemptRow(row: any): DeliveryAttemptRecord {
  return {
    id: row.id,
    deliveryId: row.deliveryId,
    attemptNumber: row.attemptNumber,
    providerId: row.providerId ?? null,
    status: row.status as NotificationDeliveryStatus,
    responseCode: row.responseCode ?? null,
    errorDetails: row.errorDetails ?? null,
    attemptedAt: row.attemptedAt,
    completedAt: row.completedAt ?? null,
  };
}

function fromOrmRow(row: any): NotificationDeliveryRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId ?? null,
    notificationIntentId: row.notificationIntentId,
    correlationId: row.correlationId,
    idempotencyKey: row.idempotencyKey,
    templateId: row.templateId,
    templateVersion: row.templateVersion,
    channelId: row.channelId,
    providerId: row.providerId ?? null,
    recipientUserId: row.recipientUserId ?? null,
    recipientEndpoint: row.recipientEndpoint,
    deliveryStatus: row.deliveryStatus as NotificationDeliveryStatus,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    nextAttemptAt: row.nextAttemptAt ?? null,
    renderedSubject: row.renderedSubject ?? null,
    renderedBody: row.renderedBody ?? null,
    failureReason: row.failureReason ?? null,
    dispatchedAt: row.dispatchedAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    deliveredAt: row.deliveredAt ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy ?? null,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt ?? null,
    deletedBy: row.deletedBy ?? null,
    version: row.version,
    attempts: Array.isArray(row.attempts)
      ? row.attempts.map(fromOrmAttemptRow)
      : [],
  };
}

function rethrowConstraintViolation(error: unknown, tenantId: string, idempotencyKey: string): never {
  const e = error as {
    code?: string;
    message?: string;
    cause?: { code?: string };
  };

  if (e.code === 'P2002') {
    throw new DuplicateIdempotencyException(tenantId, idempotencyKey);
  }

  const rawCode = e.cause?.code;
  const msg = (e.message ?? '').toLowerCase();
  if (rawCode === '23505' || msg.includes('23505') || msg.includes('unique_violation')) {
    throw new DuplicateIdempotencyException(tenantId, idempotencyKey);
  }

  throw error;
}

export class PrismaNotificationRepository implements INotificationRepository {
  async save(delivery: Notification): Promise<void> {
    const r = delivery.toRecord();
    const newAttempts = delivery.pullNewAttemptRecords();

    await prisma.$transaction(async (tx: any) => {
      if (r.version === BigInt(1)) {
        try {
          await tx.$executeRaw`
            INSERT INTO notification_deliveries (
              id, tenant_id, workspace_id,
              notification_intent_id, correlation_id, idempotency_key,
              template_id, template_version, channel_id, provider_id,
              recipient_user_id, recipient_endpoint,
              delivery_status, retry_count, max_retries,
              next_attempt_at, rendered_subject, rendered_body,
              failure_reason, dispatched_at, accepted_at, delivered_at,
              created_at, created_by, updated_at, updated_by,
              is_deleted, deleted_at, deleted_by, version
            ) VALUES (
              ${r.id}::uuid,
              ${r.tenantId}::uuid,
              ${r.workspaceId}::uuid,
              ${r.notificationIntentId}::uuid,
              ${r.correlationId}::uuid,
              ${r.idempotencyKey},
              ${r.templateId}::uuid,
              ${r.templateVersion},
              ${r.channelId}::uuid,
              ${r.providerId}::uuid,
              ${r.recipientUserId}::uuid,
              ${r.recipientEndpoint},
              ${r.deliveryStatus}::"NotificationDeliveryStatus",
              ${r.retryCount},
              ${r.maxRetries},
              ${r.nextAttemptAt},
              ${r.renderedSubject},
              ${r.renderedBody},
              ${r.failureReason},
              ${r.dispatchedAt},
              ${r.acceptedAt},
              ${r.deliveredAt},
              ${r.createdAt},
              ${r.createdBy}::uuid,
              ${r.updatedAt},
              ${r.updatedBy}::uuid,
              ${r.isDeleted},
              ${r.deletedAt},
              ${r.deletedBy}::uuid,
              ${r.version}
            )
          `;
        } catch (error) {
          rethrowConstraintViolation(error, r.tenantId, r.idempotencyKey);
        }
      } else {
        const expectedVersion = r.version - BigInt(1);
        const affected = await tx.$executeRaw`
          UPDATE notification_deliveries
          SET
            provider_id = ${r.providerId}::uuid,
            delivery_status = ${r.deliveryStatus}::"NotificationDeliveryStatus",
            retry_count = ${r.retryCount},
            max_retries = ${r.maxRetries},
            next_attempt_at = ${r.nextAttemptAt},
            rendered_subject = ${r.renderedSubject},
            rendered_body = ${r.renderedBody},
            failure_reason = ${r.failureReason},
            dispatched_at = ${r.dispatchedAt},
            accepted_at = ${r.acceptedAt},
            delivered_at = ${r.deliveredAt},
            updated_at = ${r.updatedAt},
            updated_by = ${r.updatedBy}::uuid,
            is_deleted = ${r.isDeleted},
            deleted_at = ${r.deletedAt},
            deleted_by = ${r.deletedBy}::uuid,
            version = ${r.version}
          WHERE
            id = ${r.id}::uuid
            AND tenant_id = ${r.tenantId}::uuid
            AND version = ${expectedVersion}
            AND is_deleted = false
        `;

        if (affected === 0) {
          throw new DeliveryConcurrencyError(r.id);
        }
      }

      if (newAttempts.length > 0) {
        await tx.deliveryAttemptRecord.createMany({
          data: newAttempts.map(attempt => ({
            id: attempt.id,
            deliveryId: attempt.deliveryId,
            attemptNumber: attempt.attemptNumber,
            providerId: attempt.providerId,
            status: attempt.status,
            responseCode: attempt.responseCode,
            errorDetails: attempt.errorDetails,
            attemptedAt: attempt.attemptedAt,
            completedAt: attempt.completedAt,
          })),
        });
      }
    });

    delivery.markAttemptsPersisted();
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE notification_deliveries
      SET
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = ${deletedBy}::uuid,
        updated_at = NOW(),
        updated_by = ${deletedBy}::uuid,
        version = version + 1
      WHERE
        id = ${id}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND is_deleted = false
    `;
  }

  async findById(id: string, tenantId: string): Promise<Notification | null> {
    const row = await prisma.notificationDelivery.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    return row ? Notification.reconstitute(fromOrmRow(row)) : null;
  }

  async findByIntentId(notificationIntentId: string, tenantId: string): Promise<Notification | null> {
    const row = await prisma.notificationDelivery.findFirst({
      where: {
        notificationIntentId,
        tenantId,
        isDeleted: false,
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    return row ? Notification.reconstitute(fromOrmRow(row)) : null;
  }

  async findByCorrelationId(correlationId: string, tenantId: string): Promise<Notification[]> {
    const rows = await prisma.notificationDelivery.findMany({
      where: {
        correlationId,
        tenantId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    return rows.map((row: any) => Notification.reconstitute(fromOrmRow(row)));
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<Notification | null> {
    const row = await prisma.notificationDelivery.findFirst({
      where: {
        tenantId,
        idempotencyKey,
        isDeleted: false,
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    return row ? Notification.reconstitute(fromOrmRow(row)) : null;
  }

  async listPendingRetries(nowTimestamp: Date, limit: number): Promise<Notification[]> {
    const rows = await prisma.notificationDelivery.findMany({
      where: {
        deliveryStatus: 'QUEUED',
        nextAttemptAt: {
          lte: nowTimestamp,
        },
        isDeleted: false,
      },
      orderBy: {
        nextAttemptAt: 'asc',
      },
      take: limit,
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    return rows.map((row: any) => Notification.reconstitute(fromOrmRow(row)));
  }

  async listDeadLetters(tenantId: string, limit: number): Promise<Notification[]> {
    const rows = await prisma.notificationDelivery.findMany({
      where: {
        tenantId,
        deliveryStatus: 'DEAD_LETTER',
        isDeleted: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });

    return rows.map((row: any) => Notification.reconstitute(fromOrmRow(row)));
  }

  async existsIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<boolean> {
    const count = await prisma.notificationDelivery.count({
      where: {
        tenantId,
        idempotencyKey,
        isDeleted: false,
      },
    });

    return count > 0;
  }
}
