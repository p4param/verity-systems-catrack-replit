// VS08A: PlatformApplication command validator
// Validates input commands before the service executes domain operations.
// All validation logic for required fields and format rules lives here.

import type {
  RegisterPlatformApplicationCommand,
  UpdatePlatformApplicationMetadataCommand,
} from "../models/PlatformApplicationModels";
import { PlatformApplicationValidationError } from "./PlatformApplicationErrors";

// Application code: alphanumeric, underscores, hyphens only (post-normalization)
const CODE_PATTERN = /^[A-Z0-9_-]+$/;

export class PlatformApplicationValidator {
  /**
   * Validates a RegisterPlatformApplicationCommand.
   * Throws PlatformApplicationValidationError with all field errors if invalid.
   */
  static validateRegisterCommand(
    command: RegisterPlatformApplicationCommand
  ): void {
    const errors: Record<string, string> = {};

    if (!command.code?.trim()) {
      errors.code = "Application code is required";
    } else {
      const trimmed = command.code.trim();
      if (!CODE_PATTERN.test(trimmed)) {
        errors.code =
          "Application code must contain only uppercase alphanumeric characters, underscores, or hyphens (e.g. CATERING-ERP). Lowercase characters are not permitted.";
      }
      if (trimmed.length > 100) {
        errors.code = "Application code must not exceed 100 characters";
      }
    }

    if (!command.name?.trim()) {
      errors.name = "Application name is required";
    } else if (command.name.trim().length > 255) {
      errors.name = "Application name must not exceed 255 characters";
    }

    if (!command.displayName?.trim()) {
      errors.displayName = "Display name is required";
    } else if (command.displayName.trim().length > 255) {
      errors.displayName = "Display name must not exceed 255 characters";
    }

    if (!command.category?.trim()) {
      errors.category = "Category is required";
    } else if (command.category.trim().length > 255) {
      errors.category = "Category must not exceed 255 characters";
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "Actor user ID is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new PlatformApplicationValidationError(errors);
    }
  }

  /**
   * Validates an UpdatePlatformApplicationMetadataCommand.
   * Throws PlatformApplicationValidationError with all field errors if invalid.
   */
  static validateUpdateMetadataCommand(
    command: UpdatePlatformApplicationMetadataCommand
  ): void {
    const errors: Record<string, string> = {};

    if (!command.id?.trim()) {
      errors.id = "Application ID is required";
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "Actor user ID is required";
    }

    if (command.displayName !== undefined) {
      if (!command.displayName.trim()) {
        errors.displayName = "Display name cannot be empty";
      } else if (command.displayName.trim().length > 255) {
        errors.displayName = "Display name must not exceed 255 characters";
      }
    }

    if (command.category !== undefined) {
      if (!command.category.trim()) {
        errors.category = "Category cannot be empty";
      } else if (command.category.trim().length > 255) {
        errors.category = "Category must not exceed 255 characters";
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new PlatformApplicationValidationError(errors);
    }
  }
}
