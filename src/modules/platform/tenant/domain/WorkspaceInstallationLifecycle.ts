// VS08A: WorkspaceInstallation lifecycle rules
// Centralized lifecycle state machine per CC-005 & EWP-005 (D1).

import type { WorkspaceInstallationStatus } from "../models/WorkspaceInstallationModels";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import { InvalidInstallationLifecycleTransitionError } from "./WorkspaceInstallationErrors";

type StatusKey = WorkspaceInstallationStatus;

/**
 * Approved lifecycle transitions for WorkspaceInstallation (CC-005 / D1):
 *
 *   Installing ──► Installed
 *                    │ ▲
 *                    ▼ │
 *                 Suspended ──► Uninstalled (terminal)
 *                    │
 *                    ▼
 *               Uninstalled (terminal)
 */
const ALLOWED_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  [WORKSPACE_INSTALLATION_STATUS.Installing]: [WORKSPACE_INSTALLATION_STATUS.Installed],
  [WORKSPACE_INSTALLATION_STATUS.Installed]: [WORKSPACE_INSTALLATION_STATUS.Suspended, WORKSPACE_INSTALLATION_STATUS.Uninstalled],
  [WORKSPACE_INSTALLATION_STATUS.Suspended]: [WORKSPACE_INSTALLATION_STATUS.Installed, WORKSPACE_INSTALLATION_STATUS.Uninstalled],
  [WORKSPACE_INSTALLATION_STATUS.Uninstalled]: [],
};

export class WorkspaceInstallationLifecycle {
  /**
   * Asserts that the transition from `from` to `to` is allowed.
   * Throws InvalidInstallationLifecycleTransitionError if forbidden.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidInstallationLifecycleTransitionError(from, to);
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
   * Returns true if the WorkspaceInstallation is in the Uninstalled state.
   * Uninstalled installations are immutable (CC-005).
   */
  static isImmutable(status: StatusKey): boolean {
    return status === WORKSPACE_INSTALLATION_STATUS.Uninstalled;
  }
}
