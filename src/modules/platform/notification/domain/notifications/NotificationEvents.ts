// VS09 EWP-003: NotificationDelivery domain events

export interface NotificationIngestedEvent {
  readonly type: 'NotificationIngested';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly channelId: string;
  readonly createdAt: Date;
}

export interface NotificationRenderedEvent {
  readonly type: 'NotificationRendered';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly renderedAt: Date;
}

export interface NotificationDispatchedEvent {
  readonly type: 'NotificationDispatched';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly providerId: string | null;
  readonly channelId: string;
  readonly dispatchedAt: Date;
}

export interface NotificationAcceptedByProviderEvent {
  readonly type: 'NotificationAcceptedByProvider';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly providerId: string | null;
  readonly providerReceiptId: string;
  readonly acceptedAt: Date;
}

export interface NotificationDeliveredEvent {
  readonly type: 'NotificationDelivered';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly recipientUserId: string | null;
  readonly deliveredAt: Date;
}

export interface NotificationDeliveryFailedEvent {
  readonly type: 'NotificationDeliveryFailed';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly failureReason: string;
  readonly retryCount: number;
  readonly failedAt: Date;
}

export interface NotificationRetryScheduledEvent {
  readonly type: 'NotificationRetryScheduled';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly retryCount: number;
  readonly nextAttemptAt: Date;
}

export interface NotificationMovedToDeadLetterEvent {
  readonly type: 'NotificationMovedToDeadLetter';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly failureReason: string | null;
  readonly deadLetteredAt: Date;
}

export interface NotificationDeadLetterReplayedEvent {
  readonly type: 'NotificationDeadLetterReplayed';
  readonly deliveryId: string;
  readonly tenantId: string;
  readonly replayedBy: string | null;
  readonly replayedAt: Date;
}

export type NotificationDomainEvent =
  | NotificationIngestedEvent
  | NotificationRenderedEvent
  | NotificationDispatchedEvent
  | NotificationAcceptedByProviderEvent
  | NotificationDeliveredEvent
  | NotificationDeliveryFailedEvent
  | NotificationRetryScheduledEvent
  | NotificationMovedToDeadLetterEvent
  | NotificationDeadLetterReplayedEvent;
