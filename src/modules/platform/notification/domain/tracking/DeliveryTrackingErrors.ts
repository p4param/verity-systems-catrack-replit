/**
 * EWP-006 Domain Errors — DeliveryTracking
 * Governed by CC-006, ES-008, ES-010
 */

export class DeliveryTrackingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryTrackingException";
  }
}

export class DuplicateTrackingException extends DeliveryTrackingException {
  constructor(notificationId: string) {
    super(`Delivery tracking record already exists for notification ${notificationId}`);
    this.name = "DuplicateTrackingException";
  }
}

export class InvalidTrackingStateTransitionException extends DeliveryTrackingException {
  constructor(fromState: string, toState: string) {
    super(`Invalid tracking state transition from '${fromState}' to '${toState}'`);
    this.name = "InvalidTrackingStateTransitionException";
  }
}

export class TrackingArchivedException extends DeliveryTrackingException {
  constructor(trackingId: string) {
    super(`Delivery tracking record ${trackingId} is ARCHIVED and cannot accept mutations`);
    this.name = "TrackingArchivedException";
  }
}

export class DeliveryTrackingNotFoundError extends DeliveryTrackingException {
  constructor(trackingId: string) {
    super(`Delivery tracking record ${trackingId} was not found`);
    this.name = "DeliveryTrackingNotFoundError";
  }
}

export class ImmutableTimelineException extends DeliveryTrackingException {
  constructor(message = "Historical tracking timeline entries are immutable and cannot be edited or removed") {
    super(message);
    this.name = "ImmutableTimelineException";
  }
}
