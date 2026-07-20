// VS08A: Tenant module barrel
// Public exports for the Tenant aggregate (VS08A Tenant Foundation)

// Models
export type {
  TenantRecord,
  TenantStatus,
  RegisterTenantCommand,
  ActivateTenantCommand,
  SuspendTenantCommand,
  ArchiveTenantCommand,
  UpdateTenantMetadataCommand,
  ListTenantsQuery,
} from "./models/TenantModels";
export { TENANT_STATUS } from "./models/TenantModels";

// Domain
export { Tenant } from "./domain/Tenant";
export { TenantLifecycle } from "./domain/TenantLifecycle";
export { TenantValidator } from "./domain/TenantValidator";
export {
  TenantNotFoundError,
  DuplicateTenantCodeError,
  DuplicateTenantNameError,
  ArchivedTenantImmutableError,
  TenantCodeImmutableError,
  InvalidTenantLifecycleTransitionError,
  TenantConcurrencyError,
  TenantValidationError,
} from "./domain/TenantErrors";

// Contracts
export type { ITenantRepository, TenantMetadataUpdate } from "./contracts/ITenantRepository";
export type { ITenantService } from "./contracts/ITenantService";

// Implementations
export { TenantRepository } from "./repositories/TenantRepository";
export { TenantService } from "./services/TenantService";
