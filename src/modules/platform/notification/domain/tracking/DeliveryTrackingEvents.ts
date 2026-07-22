/**
 * EWP-006 Domain Events — DeliveryTracking
 * Governed by CC-006, ES-008
 */

export interface IDomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  tenantId: string;
  aggregateId: string;
}

export class TrackingStartedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "TrackingStarted";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly correlationId: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class AcknowledgementReceivedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "AcknowledgementReceived";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly providerAcknowledgementId: string,
    readonly providerStatus: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class DeliveryConfirmedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "DeliveryConfirmed";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly deliveryTimestamp: Date
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class TrackingArchivedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "TrackingArchived";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class TimelineEventAppendedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "TimelineEventAppended";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly timelineEventType: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}
