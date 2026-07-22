import { PrismaNotificationRepository } from '../PrismaNotificationRepository';
import { Notification } from '../../../domain/notifications/Notification';
import { NOTIFICATION_DELIVERY_STATUS } from '../../../domain/notifications/NotificationModels';
import {
  DeliveryConcurrencyError,
  DuplicateIdempotencyException,
} from '../../../domain/notifications/NotificationErrors';

const mockTx = {
  $executeRaw: jest.fn(),
  deliveryAttemptRecord: {
    createMany: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) => cb(mockTx)),
    $executeRaw: jest.fn(),
    notificationDelivery: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as unknown as {
  $transaction: jest.Mock;
  $executeRaw: jest.Mock;
  notificationDelivery: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';

function createAggregate(): Notification {
  return Notification.ingest({
    tenantId: TENANT_ID,
    workspaceId: '00000000-0000-0000-0000-000000000099',
    notificationIntentId: '00000000-0000-0000-0000-000000000111',
    correlationId: '00000000-0000-0000-0000-000000000222',
    idempotencyKey: 'ORDER_123_EMAIL',
    templateId: '00000000-0000-0000-0000-000000000333',
    templateVersion: '1.0.0',
    channelId: '00000000-0000-0000-0000-000000000444',
    recipientUserId: '00000000-0000-0000-0000-000000000555',
    recipientEndpoint: 'user@example.com',
    maxRetries: 3,
    actorUserId: ACTOR,
  });
}

describe('PrismaNotificationRepository', () => {
  let repo: PrismaNotificationRepository;

  beforeEach(() => {
    repo = new PrismaNotificationRepository();
    jest.clearAllMocks();
  });

  test('save inserts new aggregate via transaction', async () => {
    mockTx.$executeRaw.mockResolvedValueOnce(1);

    const delivery = createAggregate();

    await repo.save(delivery);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    const sqlCall = mockTx.$executeRaw.mock.calls[0][0].join(' ');
    expect(sqlCall).toContain('INSERT INTO notification_deliveries');
  });

  test('save throws DuplicateIdempotencyException on unique conflict', async () => {
    const dbError = new Error('Unique constraint failed');
    (dbError as any).code = 'P2002';
    mockTx.$executeRaw.mockRejectedValueOnce(dbError);

    const delivery = createAggregate();

    await expect(repo.save(delivery)).rejects.toThrow(DuplicateIdempotencyException);
  });

  test('save updates existing aggregate with OCC and throws on mismatch', async () => {
    const delivery = createAggregate();
    delivery.markProcessing(ACTOR);

    mockTx.$executeRaw.mockResolvedValueOnce(0);

    await expect(repo.save(delivery)).rejects.toThrow(DeliveryConcurrencyError);

    const sqlCall = mockTx.$executeRaw.mock.calls[0][0].join(' ');
    expect(sqlCall).toContain('UPDATE notification_deliveries');
  });

  test('findById enforces tenant + soft-delete filters', async () => {
    mockPrisma.notificationDelivery.findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000aaa',
      tenantId: TENANT_ID,
      workspaceId: null,
      notificationIntentId: '00000000-0000-0000-0000-000000000111',
      correlationId: '00000000-0000-0000-0000-000000000222',
      idempotencyKey: 'ORDER_123_EMAIL',
      templateId: '00000000-0000-0000-0000-000000000333',
      templateVersion: '1.0.0',
      channelId: '00000000-0000-0000-0000-000000000444',
      providerId: null,
      recipientUserId: null,
      recipientEndpoint: 'user@example.com',
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.Queued,
      retryCount: 0,
      maxRetries: 3,
      nextAttemptAt: null,
      renderedSubject: null,
      renderedBody: null,
      failureReason: null,
      dispatchedAt: null,
      acceptedAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      createdBy: ACTOR,
      updatedAt: new Date(),
      updatedBy: ACTOR,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
      attempts: [],
    });

    const result = await repo.findById('00000000-0000-0000-0000-000000000aaa', TENANT_ID);

    expect(result).not.toBeNull();
    expect(mockPrisma.notificationDelivery.findFirst).toHaveBeenCalledWith({
      where: {
        id: '00000000-0000-0000-0000-000000000aaa',
        tenantId: TENANT_ID,
        isDeleted: false,
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });
  });

  test('existsIdempotencyKey returns true when count > 0', async () => {
    mockPrisma.notificationDelivery.count.mockResolvedValueOnce(1);

    const exists = await repo.existsIdempotencyKey(TENANT_ID, 'ORDER_123_EMAIL');

    expect(exists).toBe(true);
  });

  test('save persists new attempts atomically on update path', async () => {
    const delivery = createAggregate();
    delivery.markProcessing(ACTOR);
    delivery.recordRenderedContent('Subject', 'Body', ACTOR);
    delivery.dispatchToProvider('00000000-0000-0000-0000-000000000666', ACTOR);
    delivery.recordDeliverySuccess(ACTOR, new Date('2026-07-22T10:00:00Z'), '200');

    mockTx.$executeRaw.mockResolvedValueOnce(1);
    mockTx.deliveryAttemptRecord.createMany.mockResolvedValueOnce({ count: 1 });

    await repo.save(delivery);

    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.deliveryAttemptRecord.createMany).toHaveBeenCalledTimes(1);
  });

  test('delete executes soft-delete update', async () => {
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);

    await repo.delete('00000000-0000-0000-0000-000000000aaa', TENANT_ID, ACTOR);

    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
    expect(sqlCall).toContain('UPDATE notification_deliveries');
    expect(sqlCall).toContain('is_deleted = true');
  });

  test('findByIntentId filters by tenant and soft-delete', async () => {
    mockPrisma.notificationDelivery.findFirst.mockResolvedValueOnce(null);

    await repo.findByIntentId('00000000-0000-0000-0000-000000000111', TENANT_ID);

    expect(mockPrisma.notificationDelivery.findFirst).toHaveBeenCalledWith({
      where: {
        notificationIntentId: '00000000-0000-0000-0000-000000000111',
        tenantId: TENANT_ID,
        isDeleted: false,
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });
  });

  test('findByCorrelationId returns mapped aggregates list', async () => {
    mockPrisma.notificationDelivery.findMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000aaa',
        tenantId: TENANT_ID,
        workspaceId: null,
        notificationIntentId: '00000000-0000-0000-0000-000000000111',
        correlationId: '00000000-0000-0000-0000-000000000222',
        idempotencyKey: 'ORDER_123_EMAIL',
        templateId: '00000000-0000-0000-0000-000000000333',
        templateVersion: '1.0.0',
        channelId: '00000000-0000-0000-0000-000000000444',
        providerId: null,
        recipientUserId: null,
        recipientEndpoint: 'user@example.com',
        deliveryStatus: NOTIFICATION_DELIVERY_STATUS.Queued,
        retryCount: 0,
        maxRetries: 3,
        nextAttemptAt: null,
        renderedSubject: null,
        renderedBody: null,
        failureReason: null,
        dispatchedAt: null,
        acceptedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        createdBy: ACTOR,
        updatedAt: new Date(),
        updatedBy: ACTOR,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        version: 1n,
        attempts: [],
      },
    ]);

    const rows = await repo.findByCorrelationId('00000000-0000-0000-0000-000000000222', TENANT_ID);

    expect(rows).toHaveLength(1);
    expect(mockPrisma.notificationDelivery.findMany).toHaveBeenCalledWith({
      where: {
        correlationId: '00000000-0000-0000-0000-000000000222',
        tenantId: TENANT_ID,
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
  });

  test('findByIdempotencyKey filters by tenant and key', async () => {
    mockPrisma.notificationDelivery.findFirst.mockResolvedValueOnce(null);

    await repo.findByIdempotencyKey(TENANT_ID, 'ORDER_123_EMAIL');

    expect(mockPrisma.notificationDelivery.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        idempotencyKey: 'ORDER_123_EMAIL',
        isDeleted: false,
      },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });
  });

  test('listPendingRetries applies queue and time filters', async () => {
    mockPrisma.notificationDelivery.findMany.mockResolvedValueOnce([]);

    await repo.listPendingRetries(new Date('2026-07-22T10:00:00Z'), 25);

    expect(mockPrisma.notificationDelivery.findMany).toHaveBeenCalledWith({
      where: {
        deliveryStatus: 'QUEUED',
        nextAttemptAt: {
          lte: new Date('2026-07-22T10:00:00Z'),
        },
        isDeleted: false,
      },
      orderBy: {
        nextAttemptAt: 'asc',
      },
      take: 25,
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });
  });

  test('listDeadLetters filters by tenant and dead-letter status', async () => {
    mockPrisma.notificationDelivery.findMany.mockResolvedValueOnce([]);

    await repo.listDeadLetters(TENANT_ID, 50);

    expect(mockPrisma.notificationDelivery.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        deliveryStatus: 'DEAD_LETTER',
        isDeleted: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
    });
  });

  test('existsIdempotencyKey returns false when no rows', async () => {
    mockPrisma.notificationDelivery.count.mockResolvedValueOnce(0);

    const exists = await repo.existsIdempotencyKey(TENANT_ID, 'ORDER_999_EMAIL');

    expect(exists).toBe(false);
  });
});
