// VS09 EWP-003: NotificationDelivery domain errors

export class DuplicateIdempotencyException extends Error {
  readonly tenantId: string;
  readonly idempotencyKey: string;

  constructor(tenantId: string, idempotencyKey: string) {
    super(`Duplicate idempotency key '${idempotencyKey}' for tenant '${tenantId}'`);
    this.name = 'DuplicateIdempotencyException';
    this.tenantId = tenantId;
    this.idempotencyKey = idempotencyKey;
  }
}

export class InvalidDeliveryStatusTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid NotificationDelivery transition: ${from} -> ${to}`);
    this.name = 'InvalidDeliveryStatusTransitionError';
    this.from = from;
    this.to = to;
  }
}

export class NotificationDeliveryNotFoundError extends Error {
  readonly deliveryId: string;

  constructor(deliveryId: string) {
    super(`NotificationDelivery not found: ${deliveryId}`);
    this.name = 'NotificationDeliveryNotFoundError';
    this.deliveryId = deliveryId;
  }
}

export class DeliveryConcurrencyError extends Error {
  readonly deliveryId: string;

  constructor(deliveryId: string) {
    super(`Concurrency conflict for NotificationDelivery '${deliveryId}'`);
    this.name = 'DeliveryConcurrencyError';
    this.deliveryId = deliveryId;
  }
}

export class RenderedContentImmutableError extends Error {
  readonly deliveryId: string;

  constructor(deliveryId: string) {
    super(`RenderedContent is immutable for NotificationDelivery '${deliveryId}'`);
    this.name = 'RenderedContentImmutableError';
    this.deliveryId = deliveryId;
  }
}

export class DeliveryValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    super(`NotificationDelivery validation failed - ${detail}`);
    this.name = 'DeliveryValidationError';
    this.fields = { ...fields };
  }
}
