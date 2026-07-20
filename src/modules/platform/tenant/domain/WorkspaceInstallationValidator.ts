// VS08A: WorkspaceInstallation validator
// Validates InstallPackageCommand fields.

import type { InstallPackageCommand } from "../models/WorkspaceInstallationModels";
import { WorkspaceInstallationValidationError } from "./WorkspaceInstallationErrors";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class WorkspaceInstallationValidator {
  /**
   * Validates an InstallPackageCommand.
   * Collects all field errors before throwing.
   */
  static validateInstallCommand(command: InstallPackageCommand): void {
    const errors: Record<string, string> = {};

    if (!command.workspaceId?.trim()) {
      errors.workspaceId = "workspaceId is required";
    } else if (!UUID_REGEX.test(command.workspaceId.trim())) {
      errors.workspaceId = "workspaceId must be a valid UUID";
    }

    if (!command.packageId?.trim()) {
      errors.packageId = "packageId is required";
    } else if (!UUID_REGEX.test(command.packageId.trim())) {
      errors.packageId = "packageId must be a valid UUID";
    }

    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    } else if (!UUID_REGEX.test(command.actorUserId.trim())) {
      errors.actorUserId = "actorUserId must be a valid UUID";
    }

    if (Object.keys(errors).length > 0) {
      throw new WorkspaceInstallationValidationError(errors);
    }
  }
}
