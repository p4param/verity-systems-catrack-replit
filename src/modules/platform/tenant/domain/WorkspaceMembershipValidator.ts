// VS08A: WorkspaceMembership validator
// Validates InviteToWorkspaceCommand and UpdateWorkspaceRoleCommand fields.

import type {
  InviteToWorkspaceCommand,
  UpdateWorkspaceRoleCommand,
  WorkspaceRole,
} from "../models/WorkspaceMembershipModels";
import { WORKSPACE_ROLE } from "../models/WorkspaceMembershipModels";
import { WorkspaceMembershipValidationError } from "./WorkspaceMembershipErrors";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = new Set<string>(Object.values(WORKSPACE_ROLE));

export class WorkspaceMembershipValidator {
  /**
   * Validates an InviteToWorkspaceCommand.
   * Collects all field errors before throwing.
   */
  static validateInviteCommand(command: InviteToWorkspaceCommand): void {
    const errors: Record<string, string> = {};

    if (!command.workspaceId?.trim()) {
      errors.workspaceId = "workspaceId is required";
    } else if (!UUID_REGEX.test(command.workspaceId.trim())) {
      errors.workspaceId = "workspaceId must be a valid UUID";
    }

    if (!command.tenantMembershipId?.trim()) {
      errors.tenantMembershipId = "tenantMembershipId is required";
    } else if (!UUID_REGEX.test(command.tenantMembershipId.trim())) {
      errors.tenantMembershipId = "tenantMembershipId must be a valid UUID";
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    } else if (!UUID_REGEX.test(command.actorUserId.trim())) {
      errors.actorUserId = "actorUserId must be a valid UUID";
    }

    if (command.workspaceRole !== undefined && !VALID_ROLES.has(command.workspaceRole)) {
      errors.workspaceRole = `'${command.workspaceRole}' is not a valid WorkspaceRole (allowed: WorkspaceAdmin, Contributor, Viewer, Guest)`;
    }

    if (Object.keys(errors).length > 0) {
      throw new WorkspaceMembershipValidationError(errors);
    }
  }

  /**
   * Validates an UpdateWorkspaceRoleCommand.
   */
  static validateUpdateRoleCommand(command: UpdateWorkspaceRoleCommand): void {
    const errors: Record<string, string> = {};

    if (!command.id?.trim()) {
      errors.id = "id is required";
    } else if (!UUID_REGEX.test(command.id.trim())) {
      errors.id = "id must be a valid UUID";
    }

    if (!command.workspaceRole) {
      errors.workspaceRole = "workspaceRole is required";
    } else if (!VALID_ROLES.has(command.workspaceRole)) {
      errors.workspaceRole = `'${command.workspaceRole}' is not a valid WorkspaceRole (allowed: WorkspaceAdmin, Contributor, Viewer, Guest)`;
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    } else if (!UUID_REGEX.test(command.actorUserId.trim())) {
      errors.actorUserId = "actorUserId must be a valid UUID";
    }

    if (Object.keys(errors).length > 0) {
      throw new WorkspaceMembershipValidationError(errors);
    }
  }
}
