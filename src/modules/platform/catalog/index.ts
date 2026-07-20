// VS08A: License module barrel
// Public exports for the PlatformApplication aggregate (VS08A)

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
