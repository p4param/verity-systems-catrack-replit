// VS09 EWP-002: NotificationChannel lifecycle state machine
// Encodes the 4-stage lifecycle and transition guard logic per CC-002.

import { CHANNEL_STATUS } from './NotificationChannelModels';
import type { NotificationChannelStatus } from './NotificationChannelModels';
import { InvalidChannelTransitionError } from './NotificationChannelErrors';

const ALLOWED_TRANSITIONS: Readonly<Record<NotificationChannelStatus, readonly NotificationChannelStatus[]>> = {
  [CHANNEL_STATUS.Draft]:     [CHANNEL_STATUS.Active],
  [CHANNEL_STATUS.Active]:    [CHANNEL_STATUS.Suspended, CHANNEL_STATUS.Archived],
  [CHANNEL_STATUS.Suspended]: [CHANNEL_STATUS.Active, CHANNEL_STATUS.Archived],
  [CHANNEL_STATUS.Archived]:  [],
};

export class NotificationChannelLifecycle {
  /**
   * Validates that a transition from `from` to `to` is permitted.
   * Throws InvalidChannelTransitionError if not allowed.
   */
  static validateTransition(from: NotificationChannelStatus, to: NotificationChannelStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidChannelTransitionError(from, to);
    }
  }

  /**
   * Returns true if the status is terminal (ARCHIVED).
   * Terminal aggregates are immutable — no further mutations permitted.
   */
  static isImmutable(status: NotificationChannelStatus): boolean {
    return status === CHANNEL_STATUS.Archived;
  }

  /**
   * Returns true if the status is DRAFT.
   * Only DRAFT and ACTIVE channels allow metadata mutations.
   */
  static isDraft(status: NotificationChannelStatus): boolean {
    return status === CHANNEL_STATUS.Draft;
  }
}
