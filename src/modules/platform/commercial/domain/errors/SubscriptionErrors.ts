/**
 * VS08B Commercial Foundation — Subscription Domain Errors
 */

export class SubscriptionNotFoundError extends Error {
  constructor(identifier: string) {
    super(`[Subscription] Subscription not found: "${identifier}".`);
    this.name = "SubscriptionNotFoundError";
  }
}

export class SubscriptionValidationError extends Error {
  constructor(message: string) {
    super(`[Subscription] Validation failed: ${message}`);
    this.name = "SubscriptionValidationError";
  }
}

export class SubscriptionConcurrencyConflictError extends Error {
  constructor(id: string, expectedVersion: bigint, actualVersion: bigint) {
    super(
      `[Subscription] Concurrency conflict for subscription "${id}". Expected version ${expectedVersion}, found ${actualVersion}.`
    );
    this.name = "SubscriptionConcurrencyConflictError";
  }
}

export class InvalidSubscriptionStateTransitionError extends Error {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `[Subscription] Invalid state transition from "${fromStatus}" to "${toStatus}".`
    );
    this.name = "InvalidSubscriptionStateTransitionError";
  }
}

export class SubscriptionImmutableError extends Error {
  constructor(id: string) {
    super(
      `[Subscription] Subscription "${id}" is in terminal state "Archived" and cannot be modified.`
    );
    this.name = "SubscriptionImmutableError";
  }
}
