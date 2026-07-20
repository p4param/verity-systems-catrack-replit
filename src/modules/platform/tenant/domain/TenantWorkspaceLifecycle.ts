// VS08A: TenantWorkspace lifecycle rules
// Centralized lifecycle state machine per ADR-008-014.

import type { TenantWorkspaceStatus } from "../models/TenantWorkspaceModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { InvalidWorkspaceLifecycleTransitionError } from "./TenantWorkspaceErrors";

type StatusKey = TenantWorkspaceStatus;

/**
 * Approved lifecycle transitions for TenantWorkspace (ADR-008-014):
 *
 *   Provisioning ──► Active
 *                      │ ▲
 *                      ▼ │
 *                   Suspended ──► Archived (terminal)
 */
const ALLOWED_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  [TENANT_WORKSPACE_STATUS.Provisioning]: [TENANT_WORKSPACE_STATUS.Active],
  [TENANT_WORKSPACE_STATUS.Active]: [TENANT_WORKSPACE_STATUS.Suspended],
  [TENANT_WORKSPACE_STATUS.Suspended]: [TENANT_WORKSPACE_STATUS.Active, TENANT_WORKSPACE_STATUS.Archived],
  [TENANT_WORKSPACE_STATUS.Archived]: [],
};

export class TenantWorkspaceLifecycle {
  /**
   * Asserts that the transition from `from` to `to` is allowed.
   * Throws InvalidWorkspaceLifecycleTransitionError if forbidden.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidWorkspaceLifecycleTransitionError(from, to);
    }
  }

  /**
   * Returns true if transition from `from` to `to` is valid.
   */
  static canTransitionTo(from: StatusKey, to: StatusKey): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  /**
   * Returns allowed next statuses from given status.
   * Returns a defensive copy.
   */
  static allowedNextStatuses(status: StatusKey): StatusKey[] {
    return [...ALLOWED_TRANSITIONS[status]];
  }

  /**
   * Returns true if the TenantWorkspace is in the Archived state.
   * Archived workspaces are immutable (ADR-008-014).
   */
  static isImmutable(status: StatusKey): boolean {
    return status === TENANT_WORKSPACE_STATUS.Archived;
  }
}
