// VS08A: PlatformApplicationPackage lifecycle rules
// Centralized lifecycle enforcement per EWP-002 domain rules.
// No lifecycle logic is permitted outside this class.

import type { PlatformApplicationPackageStatus } from "../models/PlatformApplicationPackageModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../models/PlatformApplicationPackageModels";
import { InvalidPackageLifecycleTransitionError } from "./PlatformApplicationPackageErrors";

type StatusKey = PlatformApplicationPackageStatus;

/**
 * Approved lifecycle transitions for PlatformApplicationPackage.
 *
 *   Draft      → Published
 *   Published  → Deprecated
 *   Deprecated → Archived
 *   Archived   → (none — terminal state)
 *
 * No shortcuts are permitted (CC-002, EWP-002).
 */
const ALLOWED_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  [PLATFORM_APPLICATION_PACKAGE_STATUS.Draft]: [
    PLATFORM_APPLICATION_PACKAGE_STATUS.Published,
  ],
  [PLATFORM_APPLICATION_PACKAGE_STATUS.Published]: [
    PLATFORM_APPLICATION_PACKAGE_STATUS.Deprecated,
  ],
  [PLATFORM_APPLICATION_PACKAGE_STATUS.Deprecated]: [
    PLATFORM_APPLICATION_PACKAGE_STATUS.Archived,
  ],
  [PLATFORM_APPLICATION_PACKAGE_STATUS.Archived]: [],
};

export class PlatformApplicationPackageLifecycle {
  /**
   * Assert that the transition from `from` to `to` is permitted.
   * Throws InvalidPackageLifecycleTransitionError if not allowed.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidPackageLifecycleTransitionError(from, to);
    }
  }

  /**
   * Returns true if the transition from `from` to `to` is allowed
   * without throwing. Safe for conditional checks.
   */
  static canTransitionTo(from: StatusKey, to: StatusKey): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  /**
   * Returns all allowed next statuses for a package in the given status.
   * Returns a defensive copy.
   */
  static allowedNextStatuses(status: StatusKey): StatusKey[] {
    return [...ALLOWED_TRANSITIONS[status]];
  }

  /**
   * Returns true if the package is immutable — i.e., no longer in Draft.
   * Per ES-009 §6: published artifacts are immutable.
   * Published, Deprecated, and Archived packages cannot have their
   * metadata changed.
   */
  static isImmutable(status: StatusKey): boolean {
    return status !== PLATFORM_APPLICATION_PACKAGE_STATUS.Draft;
  }
}
