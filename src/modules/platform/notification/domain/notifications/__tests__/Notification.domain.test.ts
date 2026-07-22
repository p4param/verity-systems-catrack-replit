import { Notification } from '../Notification';
import {
  DeliveryValidationError,
  InvalidDeliveryStatusTransitionError,
  RenderedContentImmutableError,
} from '../NotificationErrors';
import { NOTIFICATION_DELIVERY_STATUS } from '../NotificationModels';

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';

function createQueuedNotification(): Notification {
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

function createRenderedNotification(): Notification {
  const delivery = createQueuedNotification();
  delivery.markProcessing(ACTOR);
  delivery.recordRenderedContent('Subject', 'Body', ACTOR);
  return delivery;
}

function createDispatchedNotification(): Notification {
  const delivery = createRenderedNotification();
  delivery.dispatchToProvider('00000000-0000-0000-0000-000000000666', ACTOR);
  return delivery;
}

function createProviderAcceptedNotification(): Notification {
  const delivery = createDispatchedNotification();
  delivery.recordProviderAcceptance('provider-receipt-1', ACTOR);
  return delivery;
}

describe('NotificationDelivery Aggregate', () => {
  test('ingests notification in QUEUED state and emits NotificationIngested', () => {
    const delivery = createQueuedNotification();

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
    expect(delivery.retryCount).toBe(0);
    expect(delivery.correlationId).toBe('00000000-0000-0000-0000-000000000222');

    const events = delivery.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('NotificationIngested');
  });

  test('legal transition QUEUED -> PROCESSING', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Processing);
  });

  test('legal transition PROCESSING -> RENDERED emits NotificationRendered', () => {
    const delivery = createQueuedNotification();
    delivery.pullDomainEvents();

    delivery.markProcessing(ACTOR);
    delivery.recordRenderedContent('Subject', 'Body', ACTOR);

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Rendered);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationRendered')).toBe(true);
  });

  test('legal transition RENDERED -> DISPATCHED emits NotificationDispatched', () => {
    const delivery = createRenderedNotification();
    delivery.pullDomainEvents();

    delivery.dispatchToProvider('00000000-0000-0000-0000-000000000666', ACTOR);

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Dispatched);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationDispatched')).toBe(true);
  });

  test('legal transition DISPATCHED -> PROVIDER_ACCEPTED emits NotificationAcceptedByProvider', () => {
    const delivery = createDispatchedNotification();
    delivery.pullDomainEvents();

    delivery.recordProviderAcceptance('provider-receipt-1', ACTOR);

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.ProviderAccepted);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationAcceptedByProvider')).toBe(true);
  });

  test('legal transition PROVIDER_ACCEPTED -> DELIVERED emits NotificationDelivered', () => {
    const delivery = createProviderAcceptedNotification();
    delivery.pullDomainEvents();

    delivery.recordDeliverySuccess(ACTOR, new Date('2026-07-22T10:00:00Z'), '200');

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Delivered);
    expect(delivery.attempts).toHaveLength(1);
    expect(delivery.attempts[0].attemptNumber).toBe(1);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationDelivered')).toBe(true);
  });

  test('legal transition DISPATCHED -> DELIVERED', () => {
    const delivery = createDispatchedNotification();
    delivery.recordDeliverySuccess(ACTOR);
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Delivered);
  });

  test('enforces rendered content immutability', () => {
    const delivery = createQueuedNotification();

    delivery.markProcessing(ACTOR);
    delivery.recordRenderedContent('Subject', 'Body', ACTOR);

    expect(() => delivery.recordRenderedContent('Other', 'Body', ACTOR)).toThrow(
      RenderedContentImmutableError,
    );
  });

  test('rejects invalid rendered content and keeps state unchanged', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);

    expect(() => delivery.recordRenderedContent('', 'Body', ACTOR)).toThrow(DeliveryValidationError);
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Processing);
  });

  test('legal transition PROCESSING -> FAILED emits NotificationDeliveryFailed', () => {
    const delivery = createQueuedNotification();
    delivery.pullDomainEvents();

    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Provider timeout', ACTOR, '503', 'Gateway timeout');

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Failed);
    expect(delivery.retryCount).toBe(1);
    expect(delivery.attempts).toHaveLength(1);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationDeliveryFailed')).toBe(true);
  });

  test('legal transition DISPATCHED -> FAILED', () => {
    const delivery = createDispatchedNotification();
    delivery.recordDeliveryFailure('Provider timeout', ACTOR, '503', 'Gateway timeout');
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Failed);
  });

  test('legal transition PROVIDER_ACCEPTED -> FAILED', () => {
    const delivery = createProviderAcceptedNotification();
    delivery.recordDeliveryFailure('Downstream bounce', ACTOR, '550', 'Mailbox not found');
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Failed);
  });

  test('legal transition FAILED -> QUEUED emits NotificationRetryScheduled', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Provider timeout', ACTOR, '503', 'Gateway timeout');
    delivery.pullDomainEvents();

    delivery.scheduleRetry(new Date('2026-07-22T10:00:00Z'), ACTOR);

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationRetryScheduled')).toBe(true);
  });

  test('legal transition FAILED -> DEAD_LETTER emits NotificationMovedToDeadLetter', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Hard bounce', ACTOR, '550', 'Mailbox unavailable');
    delivery.pullDomainEvents();

    delivery.moveToDeadLetter(ACTOR, 'Permanent failure');

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.DeadLetter);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationMovedToDeadLetter')).toBe(true);
  });

  test('legal transition DEAD_LETTER -> QUEUED emits NotificationDeadLetterReplayed', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Hard bounce', ACTOR, '550', 'Mailbox unavailable');
    delivery.moveToDeadLetter(ACTOR, 'Permanent failure');
    delivery.pullDomainEvents();

    delivery.replayDeadLetter(ACTOR);

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
    const events = delivery.pullDomainEvents();
    expect(events.some(e => e.type === 'NotificationDeadLetterReplayed')).toBe(true);
  });

  test('legal transition PROCESSING -> SUPPRESSED', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);
    delivery.recordSuppression(ACTOR, 'opt-out');
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Suppressed);
  });

  test('legal transition RENDERED -> SUPPRESSED', () => {
    const delivery = createRenderedNotification();
    delivery.recordSuppression(ACTOR, 'quiet-hours');
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Suppressed);
  });

  test('increments retry counter and creates append-only failure attempts', () => {
    const delivery = createQueuedNotification();

    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Provider timeout', ACTOR, '503', 'Gateway timeout');

    delivery.scheduleRetry(new Date('2026-07-22T10:00:00Z'), ACTOR);

    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Rate limited', ACTOR, '429', 'Rate limit');
    expect(delivery.retryCount).toBe(2);
    expect(delivery.attempts).toHaveLength(2);
    expect(delivery.attempts[0].attemptNumber).toBe(1);
    expect(delivery.attempts[1].attemptNumber).toBe(2);
  });

  test('moves to dead letter and allows replay', () => {
    const delivery = createQueuedNotification();

    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('Hard bounce', ACTOR, '550', 'Mailbox unavailable');
    delivery.moveToDeadLetter(ACTOR, 'Permanent failure');

    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.DeadLetter);

    delivery.replayDeadLetter(ACTOR);
    expect(delivery.deliveryStatus).toBe(NOTIFICATION_DELIVERY_STATUS.Queued);
  });

  test('validates failure reason and max retry boundary', () => {
    const delivery = createQueuedNotification();
    delivery.markProcessing(ACTOR);

    expect(() => delivery.recordDeliveryFailure('', ACTOR)).toThrow(DeliveryValidationError);

    delivery.recordDeliveryFailure('one', ACTOR);
    delivery.scheduleRetry(new Date('2026-07-22T10:00:00Z'), ACTOR);
    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('two', ACTOR);
    delivery.scheduleRetry(new Date('2026-07-22T10:05:00Z'), ACTOR);
    delivery.markProcessing(ACTOR);
    delivery.recordDeliveryFailure('three', ACTOR);

    expect(() => delivery.scheduleRetry(new Date('2026-07-22T10:10:00Z'), ACTOR)).toThrow(
      DeliveryValidationError,
    );
  });

  test('blocks invalid transitions', () => {
    const delivery = createQueuedNotification();

    expect(() => delivery.recordDeliverySuccess(ACTOR)).toThrow(
      InvalidDeliveryStatusTransitionError,
    );

    expect(() => delivery.recordSuppression(ACTOR)).toThrow(
      InvalidDeliveryStatusTransitionError,
    );
  });

  test('validates ingest command requirements', () => {
    expect(() =>
      Notification.ingest({
        tenantId: '',
        notificationIntentId: '',
        correlationId: '',
        idempotencyKey: '',
        templateId: '',
        templateVersion: '',
        channelId: '',
        recipientEndpoint: '',
        actorUserId: '',
      }),
    ).toThrow(DeliveryValidationError);

    expect(() =>
      Notification.ingest({
        tenantId: TENANT_ID,
        notificationIntentId: '00000000-0000-0000-0000-000000000111',
        correlationId: '00000000-0000-0000-0000-000000000222',
        idempotencyKey: 'ORDER_123_EMAIL',
        templateId: '00000000-0000-0000-0000-000000000333',
        templateVersion: '1.0.0',
        channelId: '00000000-0000-0000-0000-000000000444',
        recipientEndpoint: 'user@example.com',
        actorUserId: ACTOR,
        maxRetries: -1,
      }),
    ).toThrow(DeliveryValidationError);
  });
});
