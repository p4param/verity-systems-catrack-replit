/**
 * EWP-004 Domain Events — NotificationRecipient
 * Governed by CC-004, ES-008
 */

export interface IDomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  tenantId: string;
  aggregateId: string;
}

export class RecipientResolvedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "RecipientResolved";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly recipientSequence: number,
    readonly recipientEndpoint: string,
    readonly recipientType: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class RecipientEligibleEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "RecipientEligible";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly channelId: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class RecipientSuppressedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "RecipientSuppressed";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly suppressionReason: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class RecipientCompletedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "RecipientCompleted";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly notificationId: string,
    readonly tenantId: string,
    readonly finalStatus: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}
