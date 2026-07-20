// VS08A: Tenant lifecycle rules
// Centralized lifecycle enforcement per ADR-008-013.

import type { TenantStatus } from "../models/TenantModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { InvalidTenantLifecycleTransitionError } from "./TenantErrors";

type StatusKey = TenantStatus;

/**
 * Approved lifecycle transitions for Tenant (ADR-008-013):
 *
 *   Provisioning ──► Active
 *                      │ ▲
 *                      ▼ │
 *                   Suspended ──► Archived (terminal)
 */
const ALLOWED_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  [TENANT_STATUS.Provisioning]: [TENANT_STATUS.Active],
  [TENANT_STATUS.Active]: [TENANT_STATUS.Suspended],
  [TENANT_STATUS.Suspended]: [TENANT_STATUS.Active, TENANT_STATUS.Archived],
  [TENANT_STATUS.Archived]: [],
};

export class TenantLifecycle {
  /**
   * Asserts that the transition from `from` to `to` is allowed.
   * Throws InvalidTenantLifecycleTransitionError if forbidden.
   */
  static validateTransition(from: StatusKey, to: StatusKey): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidTenantLifecycleTransitionError(from, to);
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
   * Returns true if the Tenant is in the Archived state.
   * Archived tenants are immutable (ADR-008-013).
   */
  static isImmutable(status: StatusKey): boolean {
    return status === TENANT_STATUS.Archived;
  }
}
