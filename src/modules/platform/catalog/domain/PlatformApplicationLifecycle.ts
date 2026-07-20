// VS08A: PlatformApplication lifecycle rules
// All lifecycle validation is centralized here per EWP-001 domain rules.
// No lifecycle logic is permitted outside this class.

import type { PlatformApplicationStatus } from "../models/PlatformApplicationModels";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";
import { InvalidLifecycleTransitionError } from "./PlatformApplicationErrors";

type StatusKey = PlatformApplicationStatus;

/**
 * Approved lifecycle transitions for PlatformApplication.
 *
 *   Draft      → Published
 *   Published  → Deprecated
 *   Published  → Retired
 *   Deprecated → Retired
 *   Retired    → (none — terminal state)
 */
const ALLOWED_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  [PLATFORM_APPLICATION_STATUS.Draft]: [PLATFORM_APPLICATION_STATUS.Published],
  [PLATFORM_APPLICATION_STATUS.Published]: [
    PLATFORM_APPLICATION_STATUS.Deprecated,
    PLATFORM_APPLICATION_STATUS.Retired,
  ],
  [PLATFORM_APPLICATION_STATUS.Deprecated]: [PLATFORM_APPLICATION_STATUS.Retired],
  [PLATFORM_APPLICATION_STATUS.Retired]: [],
};

export class PlatformApplicationLifecycle {
  /**
   * Assert that the transition from `from` to `to` is permitted.
   * Throws InvalidLifecycleTransitionError if the transition is not allowed.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidLifecycleTransitionError(from, to);
    }
  }

  /**
   * Returns true if the application in the given status can be retired.
   * Applications must be Published or Deprecated to be retired.
   */
  static isRetirable(status: StatusKey): boolean {
    return PlatformApplicationLifecycle.canTransitionTo(
      status,
      PLATFORM_APPLICATION_STATUS.Retired
    );
  }

  /**
   * Returns true if the application in the given status allows metadata modification.
   * Retired applications are immutable.
   */
  static isModifiable(status: StatusKey): boolean {
    return status !== PLATFORM_APPLICATION_STATUS.Retired;
  }

  /**
   * Returns true if the transition from `from` to `to` is an allowed transition
   * without throwing. Safe to use for conditional checks.
   */
  static canTransitionTo(from: StatusKey, to: StatusKey): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  /**
   * Returns all allowed next statuses for an application in the given status.
   */
  static allowedNextStatuses(status: StatusKey): StatusKey[] {
    return [...ALLOWED_TRANSITIONS[status]];
  }
}
