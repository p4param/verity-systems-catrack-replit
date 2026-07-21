// VS08A: WorkspaceMembership lifecycle rules
// Centralized lifecycle state machine per ADR-008-017 & CC-007.

import type { WorkspaceMembershipStatus } from "../models/WorkspaceMembershipModels";
import { WORKSPACE_MEMBERSHIP_STATUS } from "../models/WorkspaceMembershipModels";
import { InvalidWorkspaceMembershipLifecycleTransitionError } from "./WorkspaceMembershipErrors";

type StatusKey = WorkspaceMembershipStatus;

/**
 * Approved lifecycle transitions for WorkspaceMembership (ADR-008-017 / CC-007):
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
  [WORKSPACE_MEMBERSHIP_STATUS.Invited]: [WORKSPACE_MEMBERSHIP_STATUS.Active],
  [WORKSPACE_MEMBERSHIP_STATUS.Active]: [WORKSPACE_MEMBERSHIP_STATUS.Suspended, WORKSPACE_MEMBERSHIP_STATUS.Removed],
  [WORKSPACE_MEMBERSHIP_STATUS.Suspended]: [WORKSPACE_MEMBERSHIP_STATUS.Active, WORKSPACE_MEMBERSHIP_STATUS.Removed],
  [WORKSPACE_MEMBERSHIP_STATUS.Removed]: [],
};

export class WorkspaceMembershipLifecycle {
  /**
   * Asserts that the transition from `from` to `to` is allowed.
   * Throws InvalidWorkspaceMembershipLifecycleTransitionError if forbidden.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidWorkspaceMembershipLifecycleTransitionError(from, to);
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
   * Returns true if the WorkspaceMembership is in the Removed state.
   * Removed memberships are immutable (ADR-008-017 / CC-007).
   */
  static isImmutable(status: StatusKey): boolean {
    return status === WORKSPACE_MEMBERSHIP_STATUS.Removed;
  }
}
