// VS08A: License & Catalog module barrel
// Public exports for the Platform Catalog bounded context (VS08A)

// ─── PlatformApplication (EWP-001) ───────────────────────────────────────────

// Models
export type {
  PlatformApplicationRecord,
  PlatformApplicationStatus,
  RegisterPlatformApplicationCommand,
  UpdatePlatformApplicationMetadataCommand,
  RetirePlatformApplicationCommand,
  ListPlatformApplicationsQuery,
  SearchPlatformApplicationsQuery,
  PlatformApplicationMetadataUpdate,
} from "./models/PlatformApplicationModels";
export { PLATFORM_APPLICATION_STATUS } from "./models/PlatformApplicationModels";

// Domain
export { PlatformApplication } from "./domain/PlatformApplication";
export { PlatformApplicationLifecycle } from "./domain/PlatformApplicationLifecycle";
export { PlatformApplicationValidator } from "./domain/PlatformApplicationValidator";
export {
  PlatformApplicationNotFoundError,
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  InvalidLifecycleTransitionError,
  RetiredApplicationModificationError,
  PlatformApplicationConcurrencyError,
  PlatformApplicationValidationError,
} from "./domain/PlatformApplicationErrors";

// Contracts
export type { IPlatformApplicationRepository } from "./contracts/IPlatformApplicationRepository";
export type { IPlatformApplicationService } from "./contracts/IPlatformApplicationService";

// Implementations
export { PlatformApplicationRepository } from "./repositories/PlatformApplicationRepository";
export { PlatformApplicationService } from "./services/PlatformApplicationService";

// ─── PlatformApplicationPackage (EWP-002) ────────────────────────────────────

// Models
export type {
  PlatformApplicationPackageRecord,
  PlatformApplicationPackageStatus,
  CreatePackageCommand,
  PublishPackageCommand,
  DeprecatePackageCommand,
  ArchivePackageCommand,
  ListPackagesByApplicationQuery,
} from "./models/PlatformApplicationPackageModels";
export { PLATFORM_APPLICATION_PACKAGE_STATUS } from "./models/PlatformApplicationPackageModels";

// Domain
export { PlatformApplicationPackage } from "./domain/PlatformApplicationPackage";
export { PlatformApplicationPackageLifecycle } from "./domain/PlatformApplicationPackageLifecycle";
export { PlatformApplicationPackageValidator } from "./domain/PlatformApplicationPackageValidator";
export {
  PackageNotFoundError,
  DuplicatePackageVersionError,
  PackageApplicationNotFoundError,
  PublishedPackageImmutableError,
  InvalidPackageLifecycleTransitionError,
  PackageConcurrencyError,
  PackageValidationError,
} from "./domain/PlatformApplicationPackageErrors";

// Contracts
export type { IPlatformApplicationPackageRepository } from "./contracts/IPlatformApplicationPackageRepository";
export type { IPlatformApplicationPackageService } from "./contracts/IPlatformApplicationPackageService";

// Implementations
export { PlatformApplicationPackageRepository } from "./repositories/PlatformApplicationPackageRepository";
export { PlatformApplicationPackageService } from "./services/PlatformApplicationPackageService";

