/**
 * EWP-005 Domain Events — ProviderProfile
 * Governed by CC-005, ES-008
 */

export interface IDomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  tenantId: string;
  aggregateId: string;
}

export class ProviderRegisteredEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "ProviderRegistered";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly providerCode: string,
    readonly providerType: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class ProviderEnabledEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "ProviderEnabled";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly providerCode: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class ProviderDisabledEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "ProviderDisabled";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly providerCode: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class ProviderRetiredEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "ProviderRetired";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly providerCode: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class ProviderHealthUpdatedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "ProviderHealthUpdated";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly previousHealth: string,
    readonly newHealth: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

export class DefaultProviderChangedEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType = "DefaultProviderChanged";
  readonly occurredAt: Date;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly channelId: string,
    readonly isDefault: boolean
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}
