// VS08A: TenantMembership lifecycle rules
// Centralized lifecycle state machine per ADR-008-016 & CC-006 (D2).

import type { TenantMembershipStatus } from "../models/TenantMembershipModels";
import { TENANT_MEMBERSHIP_STATUS } from "../models/TenantMembershipModels";
import { InvalidMembershipLifecycleTransitionError } from "./TenantMembershipErrors";

type StatusKey = TenantMembershipStatus;

/**
 * Approved lifecycle transitions for TenantMembership (ADR-008-016 / D2):
 *
 *   Invited ──► Active
 *                 │ ▲
 *                 ▼ │
 *              Suspended ──► Removed (terminal)
 *                 │
 *                 ▼
 *            Removed (terminal)
 */
const ALLOWED_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  [TENANT_MEMBERSHIP_STATUS.Invited]: [TENANT_MEMBERSHIP_STATUS.Active],
  [TENANT_MEMBERSHIP_STATUS.Active]: [TENANT_MEMBERSHIP_STATUS.Suspended, TENANT_MEMBERSHIP_STATUS.Removed],
  [TENANT_MEMBERSHIP_STATUS.Suspended]: [TENANT_MEMBERSHIP_STATUS.Active, TENANT_MEMBERSHIP_STATUS.Removed],
  [TENANT_MEMBERSHIP_STATUS.Removed]: [],
};

export class TenantMembershipLifecycle {
  /**
   * Asserts that the transition from `from` to `to` is allowed.
   * Throws InvalidMembershipLifecycleTransitionError if forbidden.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidMembershipLifecycleTransitionError(from, to);
    }
  }

  /**
   * Returns true if transition from `from` to `to` is valid.
   */
  static canTransitionTo(from: StatusKey, to: StatusKey): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Returns allowed next statuses from given status.
   * Returns a defensive copy.
   */
  static allowedNextStatuses(status: StatusKey): StatusKey[] {
    return [...(ALLOWED_TRANSITIONS[status] ?? [])];
  }

  /**
   * Returns true if the TenantMembership is in the Removed state.
   * Removed memberships are immutable (ADR-008-016 / CC-006).
   */
  static isImmutable(status: StatusKey): boolean {
    return status === TENANT_MEMBERSHIP_STATUS.Removed;
  }
}
