// VS08A: Tenant validator
// Validates RegisterTenantCommand and UpdateTenantMetadataCommand fields.

import type {
  RegisterTenantCommand,
  UpdateTenantMetadataCommand,
} from "../models/TenantModels";
import { TenantValidationError } from "./TenantErrors";

const TENANT_CODE_REGEX = /^[a-zA-Z0-9_-]+$/;

export class TenantValidator {
  /**
   * Validates a RegisterTenantCommand.
   * Collects all field errors before throwing.
   */
  static validateRegisterCommand(command: RegisterTenantCommand): void {
    const errors: Record<string, string> = {};

    // code
    const trimmedCode = command.code?.trim();
    if (!trimmedCode) {
      errors.code = "code is required";
    } else if (trimmedCode.length > 100) {
      errors.code = "code must not exceed 100 characters";
    } else if (!TENANT_CODE_REGEX.test(trimmedCode)) {
      errors.code =
        `'${trimmedCode}' is invalid — tenant code must contain only letters, numbers, underscores, and hyphens`;
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
      throw new TenantValidationError(errors);
    }
  }

  /**
   * Validates an UpdateTenantMetadataCommand.
   */
  static validateUpdateMetadataCommand(
    command: UpdateTenantMetadataCommand
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
      throw new TenantValidationError(errors);
    }
  }
}
