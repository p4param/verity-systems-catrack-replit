// VS09 EWP-001: NotificationTemplate lifecycle state machine
// Encodes the 4-stage lifecycle and transition guard logic per CC-001.
//
// Valid transitions:
//   DRAFT → PUBLISHED
//   PUBLISHED → DEPRECATED
//   PUBLISHED → ARCHIVED   (direct archive without deprecation)
//   DEPRECATED → ARCHIVED

import { TEMPLATE_STATUS } from './NotificationTemplateModels';
import type { TemplateStatus } from './NotificationTemplateModels';
import { InvalidTemplateLifecycleTransitionError } from './NotificationTemplateErrors';

const ALLOWED_TRANSITIONS: Readonly<Record<TemplateStatus, readonly TemplateStatus[]>> = {
  [TEMPLATE_STATUS.Draft]:      [TEMPLATE_STATUS.Published],
  [TEMPLATE_STATUS.Published]:  [TEMPLATE_STATUS.Deprecated, TEMPLATE_STATUS.Archived],
  [TEMPLATE_STATUS.Deprecated]: [TEMPLATE_STATUS.Archived],
  [TEMPLATE_STATUS.Archived]:   [],
};

export class NotificationTemplateLifecycle {
  /**
   * Validates that a transition from `from` to `to` is permitted.
   * Throws InvalidTemplateLifecycleTransitionError if not allowed.
   */
  static validateTransition(from: TemplateStatus, to: TemplateStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidTemplateLifecycleTransitionError(from, to);
    }
  }

  /**
   * Returns true if the status is terminal (ARCHIVED).
   * Terminal aggregates are immutable — no further mutations permitted.
   */
  static isImmutable(status: TemplateStatus): boolean {
    return status === TEMPLATE_STATUS.Archived;
  }

  /**
   * Returns true if the status is DRAFT.
   * Only DRAFT templates allow content mutations (language, channel, metadata).
   */
  static isDraft(status: TemplateStatus): boolean {
    return status === TEMPLATE_STATUS.Draft;
  }

  /**
   * Returns true if content is locked (PUBLISHED, DEPRECATED, or ARCHIVED).
   * Used by the aggregate to enforce version immutability after publishing.
   */
  static isContentLocked(status: TemplateStatus): boolean {
    return (
      status === TEMPLATE_STATUS.Published  ||
      status === TEMPLATE_STATUS.Deprecated ||
      status === TEMPLATE_STATUS.Archived
    );
  }
}
