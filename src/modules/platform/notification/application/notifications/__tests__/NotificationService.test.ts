import { NotificationService } from '../NotificationService';
import type { INotificationRepository } from '../../../domain/notifications/INotificationRepository';
import { Notification } from '../../../domain/notifications/Notification';
import { NOTIFICATION_DELIVERY_STATUS } from '../../../domain/notifications/NotificationModels';
import {
  DeliveryValidationError,
  DuplicateIdempotencyException,
  NotificationDeliveryNotFoundError,
} from '../../../domain/notifications/NotificationErrors';

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';
const DELIVERY_ID = '00000000-0000-0000-0000-000000000020';

function createAggregate(): Notification {
  const delivery = Notification.ingest({
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

  const record = delivery.toRecord();
  return Notification.reconstitute({
    ...record,
    id: DELIVERY_ID,
    attempts: [],
  });
}

function makeMockRepo(
  overrides: Partial<Record<keyof INotificationRepository, jest.Mock>> = {},
): jest.Mocked<INotificationRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByIntentId: jest.fn().mockResolvedValue(null),
    findByCorrelationId: jest.fn().mockResolvedValue([]),
    findByIdempotencyKey: jest.fn().mockResolvedValue(null),
    listPendingRetries: jest.fn().mockResolvedValue([]),
    listDeadLetters: jest.fn().mockResolvedValue([]),
    existsIdempotencyKey: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as any;
}

const mockPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
};

describe('NotificationService', () => {
  let repo: jest.Mocked<INotificationRepository>;
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = makeMockRepo();
    service = new NotificationService(repo, mockPublisher);
  });

  test('ingestNotificationIntent creates and persists aggregate', async () => {
    const result = await service.ingestNotificationIntent({
      tenantId: TENANT_ID,
      notificationIntentId: '00000000-0000-0000-0000-000000000111',
      correlationId: '00000000-0000-0000-0000-000000000222',
      idempotencyKey: 'ORDER_123_EMAIL',
      templateId: '00000000-0000-0000-0000-000000000333',
      templateVersion: '1.0.0',
      channelId: '00000000-0000-0000-0000-000000000444',
      recipientEndpoint: 'user@example.com',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publishAll).toHaveBeenCalledTimes(1);
  });

  test('ingestNotificationIntent throws on duplicate idempotency key', async () => {
    repo.existsIdempotencyKey.mockResolvedValueOnce(true);

    await expect(
      service.ingestNotificationIntent({
        tenantId: TENANT_ID,
        notificationIntentId: '00000000-0000-0000-0000-000000000111',
        correlationId: '00000000-0000-0000-0000-000000000222',
        idempotencyKey: 'ORDER_123_EMAIL',
        templateId: '00000000-0000-0000-0000-000000000333',
        templateVersion: '1.0.0',
        channelId: '00000000-0000-0000-0000-000000000444',
        recipientEndpoint: 'user@example.com',
        actorUserId: ACTOR,
      }),
    ).rejects.toThrow(DuplicateIdempotencyException);
  });

  test('markProcessing throws NotificationDeliveryNotFoundError when missing', async () => {
    await expect(
      service.markProcessing({
        deliveryId: DELIVERY_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR,
      }),
    ).rejects.toThrow(NotificationDeliveryNotFoundError);
  });

  test('recordDeliveryFailure schedules retry for transient errors', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.recordDeliveryFailure({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      failureReason: 'Transient network timeout',
      isTransient: true,
      nextAttemptAt: new Date('2026-07-22T10:00:00Z'),
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
    expect(result.retryCount).toBe(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  test('recordDeliveryFailure moves to dead letter when non-transient', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.recordDeliveryFailure({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      failureReason: 'Hard bounce',
      isTransient: false,
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.DeadLetter);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  test('markProcessing updates delivery when found', async () => {
    const aggregate = createAggregate();
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.markProcessing({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Processing);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  test('recordRenderedContent updates content and state', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.recordRenderedContent({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      renderedSubject: 'Subject',
      renderedBody: 'Body',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Rendered);
    expect(result.renderedSubject).toBe('Subject');
  });

  test('dispatchToProvider updates provider and state', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    aggregate.recordRenderedContent('Subject', 'Body', ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.dispatchToProvider({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      providerId: '00000000-0000-0000-0000-000000000666',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Dispatched);
    expect(result.providerId).toBe('00000000-0000-0000-0000-000000000666');
  });

  test('recordProviderAcceptance updates state', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    aggregate.recordRenderedContent('Subject', 'Body', ACTOR);
    aggregate.dispatchToProvider('00000000-0000-0000-0000-000000000666', ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.recordProviderAcceptance({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      providerReceiptId: 'provider-receipt-1',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.ProviderAccepted);
  });

  test('recordDeliverySuccess updates state', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    aggregate.recordRenderedContent('Subject', 'Body', ACTOR);
    aggregate.dispatchToProvider('00000000-0000-0000-0000-000000000666', ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.recordDeliverySuccess({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      responseCode: '200',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Delivered);
  });

  test('recordDeliveryFailure requires nextAttemptAt for transient retries', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    await expect(
      service.recordDeliveryFailure({
        deliveryId: DELIVERY_ID,
        tenantId: TENANT_ID,
        failureReason: 'Transient network timeout',
        isTransient: true,
        actorUserId: ACTOR,
      }),
    ).rejects.toThrow(DeliveryValidationError);
  });

  test('scheduleRetry updates failed delivery', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    aggregate.recordDeliveryFailure('Timeout', ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.scheduleRetry({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      nextAttemptAt: new Date('2026-07-22T10:00:00Z'),
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
  });

  test('moveToDeadLetter updates failed delivery', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    aggregate.recordDeliveryFailure('Timeout', ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.moveToDeadLetter({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      failureReason: 'permanent',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.DeadLetter);
  });

  test('replayDeadLetter requeues delivery', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    aggregate.recordDeliveryFailure('Timeout', ACTOR);
    aggregate.moveToDeadLetter(ACTOR, 'permanent');
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.replayDeadLetter({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
  });

  test('recordSuppression sets suppressed state', async () => {
    const aggregate = createAggregate();
    aggregate.markProcessing(ACTOR);
    repo.findById.mockResolvedValueOnce(aggregate);

    const result = await service.recordSuppression({
      deliveryId: DELIVERY_ID,
      tenantId: TENANT_ID,
      reason: 'opt-out',
      actorUserId: ACTOR,
    });

    expect(result.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Suppressed);
  });

  test('query methods return records from repository', async () => {
    const aggregate = createAggregate();
    repo.findById.mockResolvedValueOnce(aggregate);
    repo.findByIntentId.mockResolvedValueOnce(aggregate);
    repo.findByIdempotencyKey.mockResolvedValueOnce(aggregate);
    repo.listPendingRetries.mockResolvedValueOnce([aggregate]);
    repo.listDeadLetters.mockResolvedValueOnce([aggregate]);

    const byId = await service.getById(DELIVERY_ID, TENANT_ID);
    const byIntent = await service.getByIntentId('00000000-0000-0000-0000-000000000111', TENANT_ID);
    const byIdempotency = await service.getByIdempotencyKey(TENANT_ID, 'ORDER_123_EMAIL');
    const retries = await service.listPendingRetries(new Date('2026-07-22T10:00:00Z'), 10);
    const deadLetters = await service.listDeadLetters(TENANT_ID, 10);

    expect(byId?.id).toBe(DELIVERY_ID);
    expect(byIntent?.id).toBe(DELIVERY_ID);
    expect(byIdempotency?.id).toBe(DELIVERY_ID);
    expect(retries).toHaveLength(1);
    expect(deadLetters).toHaveLength(1);
  });
});
