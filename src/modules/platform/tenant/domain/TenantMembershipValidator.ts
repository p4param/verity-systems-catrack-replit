// VS08A: TenantMembership validator
// Validates InviteUserCommand and UpdateTenantRoleCommand fields.

import type {
  InviteUserCommand,
  UpdateTenantRoleCommand,
  TenantRole,
} from "../models/TenantMembershipModels";
import { TENANT_ROLE } from "../models/TenantMembershipModels";
import { TenantMembershipValidationError } from "./TenantMembershipErrors";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = new Set<string>(Object.values(TENANT_ROLE));

export class TenantMembershipValidator {
  /**
   * Validates an InviteUserCommand.
   * Collects all field errors before throwing.
   */
  static validateInviteCommand(command: InviteUserCommand): void {
    const errors: Record<string, string> = {};

    if (!command.tenantId?.trim()) {
      errors.tenantId = "tenantId is required";
    } else if (!UUID_REGEX.test(command.tenantId.trim())) {
      errors.tenantId = "tenantId must be a valid UUID";
    }

    if (!command.userId?.trim()) {
      errors.userId = "userId is required";
    } else if (!UUID_REGEX.test(command.userId.trim())) {
      errors.userId = "userId must be a valid UUID";
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    } else if (!UUID_REGEX.test(command.actorUserId.trim())) {
      errors.actorUserId = "actorUserId must be a valid UUID";
    }

    if (command.tenantRole !== undefined && !VALID_ROLES.has(command.tenantRole)) {
      errors.tenantRole = `'${command.tenantRole}' is not a valid TenantRole (allowed: Owner, Admin, Member, Guest)`;
    }

    if (Object.keys(errors).length > 0) {
      throw new TenantMembershipValidationError(errors);
    }
  }

  /**
   * Validates an UpdateTenantRoleCommand.
   */
  static validateUpdateRoleCommand(command: UpdateTenantRoleCommand): void {
    const errors: Record<string, string> = {};

    if (!command.id?.trim()) {
      errors.id = "id is required";
    } else if (!UUID_REGEX.test(command.id.trim())) {
      errors.id = "id must be a valid UUID";
    }

    if (!command.tenantRole) {
      errors.tenantRole = "tenantRole is required";
    } else if (!VALID_ROLES.has(command.tenantRole)) {
      errors.tenantRole = `'${command.tenantRole}' is not a valid TenantRole (allowed: Owner, Admin, Member, Guest)`;
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    } else if (!UUID_REGEX.test(command.actorUserId.trim())) {
      errors.actorUserId = "actorUserId must be a valid UUID";
    }

    if (Object.keys(errors).length > 0) {
      throw new TenantMembershipValidationError(errors);
    }
  }
}
