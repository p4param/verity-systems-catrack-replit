// VS08A: PlatformApplicationPackage validator
// Validates CreatePackageCommand fields.
// SemVer 2.0.0 validation per ADR-008-012.

import type { CreatePackageCommand } from "../models/PlatformApplicationPackageModels";
import { PackageValidationError } from "./PlatformApplicationPackageErrors";

/**
 * Official SemVer 2.0.0 regex from semver.org.
 * Matches: 1.0.0, 1.0.1-beta.1, 2.0.0-rc.1+build.42, etc.
 */
const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export class PlatformApplicationPackageValidator {
  /**
   * Validates a CreatePackageCommand.
   * Collects all field errors before throwing.
   */
  static validateCreateCommand(command: CreatePackageCommand): void {
    const errors: Record<string, string> = {};

    // applicationId
    if (!command.applicationId?.trim()) {
      errors.applicationId = "applicationId is required";
    }

    // packageVersion — must be present and SemVer 2.0.0
    const trimmedVersion = command.packageVersion?.trim();
    if (!trimmedVersion) {
      errors.packageVersion = "packageVersion is required";
    } else if (!SEMVER_REGEX.test(trimmedVersion)) {
      errors.packageVersion =
        `'${trimmedVersion}' is not a valid Semantic Version 2.0.0 (e.g. 1.0.0, 2.1.0-beta.1)`;
    }

    // displayName
    if (!command.displayName?.trim()) {
      errors.displayName = "displayName is required";
    } else if (command.displayName.trim().length > 255) {
      errors.displayName = "displayName must not exceed 255 characters";
    }

    // actorUserId
    if (!command.actorUserId?.trim()) {
      errors.actorUserId = "actorUserId is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new PackageValidationError(errors);
    }
  }
}
