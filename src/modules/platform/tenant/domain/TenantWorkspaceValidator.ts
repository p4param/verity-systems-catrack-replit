// VS08A: TenantWorkspace validator
// Validates CreateWorkspaceCommand and UpdateWorkspaceMetadataCommand fields.

import type {
  CreateWorkspaceCommand,
  UpdateWorkspaceMetadataCommand,
} from "../models/TenantWorkspaceModels";
import { WorkspaceValidationError } from "./TenantWorkspaceErrors";

const WORKSPACE_CODE_REGEX = /^[a-zA-Z0-9_-]+$/;

export class TenantWorkspaceValidator {
  /**
   * Validates a CreateWorkspaceCommand.
   * Collects all field errors before throwing.
   */
  static validateCreateCommand(command: CreateWorkspaceCommand): void {
    const errors: Record<string, string> = {};

    // tenantId
    if (!command.tenantId?.trim()) {
      errors.tenantId = "tenantId is required";
    }

    // code
    const trimmedCode = command.code?.trim();
    if (!trimmedCode) {
      errors.code = "code is required";
    } else if (trimmedCode.length > 100) {
      errors.code = "code must not exceed 100 characters";
    } else if (!WORKSPACE_CODE_REGEX.test(trimmedCode)) {
      errors.code =
        `'${trimmedCode}' is invalid — workspace code must contain only letters, numbers, underscores, and hyphens`;
    }

    // name
    const trimmedName = command.name?.trim();
    if (!trimmedName) {
      errors.name = "name is required";
    } else if (trimmedName.length > 255) {
      errors.name = "name must not exceed 255 characters";
    }

    // displayName
    const trimmedDisplayName = command.displayName?.trim();
    if (!trimmedDisplayName) {
      errors.displayName = "displayName is required";
    } else if (trimmedDisplayName.length > 255) {
      errors.displayName = "displayName must not exceed 255 characters";
    }

    // actorUserId
    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new WorkspaceValidationError(errors);
    }
  }

  /**
   * Validates an UpdateWorkspaceMetadataCommand.
   */
  static validateUpdateMetadataCommand(
    command: UpdateWorkspaceMetadataCommand
  ): void {
    const errors: Record<string, string> = {};

    if (!command.id?.trim()) {
      errors.id = "id is required";
    }

    if (command.displayName !== undefined) {
      const trimmedDisplayName = command.displayName.trim();
      if (!trimmedDisplayName) {
        errors.displayName = "displayName cannot be empty";
      } else if (trimmedDisplayName.length > 255) {
        errors.displayName = "displayName must not exceed 255 characters";
      }
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new WorkspaceValidationError(errors);
    }
  }
}
