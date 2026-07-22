/**
 * EWP-004 Domain Errors — NotificationRecipient
 * Governed by CC-004, ES-008, ES-010
 */

export class NotificationRecipientException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationRecipientException";
  }
}

export class DuplicateSequenceException extends NotificationRecipientException {
  constructor(notificationId: string, sequence: number) {
    super(`Recipient sequence ${sequence} already exists for notification ${notificationId}`);
    this.name = "DuplicateSequenceException";
  }
}

export class InvalidRecipientStateTransitionException extends NotificationRecipientException {
  constructor(fromState: string, toState: string) {
    super(`Invalid recipient lifecycle state transition from '${fromState}' to '${toState}'`);
    this.name = "InvalidRecipientStateTransitionException";
  }
}

export class RecipientSuppressedException extends NotificationRecipientException {
  constructor(recipientId: string, reason?: string) {
    super(`Recipient ${recipientId} is suppressed and cannot be dispatched. Reason: ${reason || "Unspecified"}`);
    this.name = "RecipientSuppressedException";
  }
}

export class RecipientTerminalStateException extends NotificationRecipientException {
  constructor(recipientId: string, state: string) {
    super(`Recipient ${recipientId} is in terminal state '${state}' and cannot accept further mutations`);
    this.name = "RecipientTerminalStateException";
  }
}

export class NotificationRecipientNotFoundError extends NotificationRecipientException {
  constructor(recipientId: string) {
    super(`Notification recipient record ${recipientId} was not found`);
    this.name = "NotificationRecipientNotFoundError";
  }
}
