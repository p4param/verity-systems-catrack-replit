// VS08A: Tenant module barrel
// Public exports for Tenant and TenantWorkspace aggregates (VS08A Tenant Foundation)

// ─── Tenant (EWP-003) ─────────────────────────────────────────────────────────

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

export type { ITenantRepository, TenantMetadataUpdate } from "./contracts/ITenantRepository";
export type { ITenantService } from "./contracts/ITenantService";

export { TenantRepository } from "./repositories/TenantRepository";
export { TenantService } from "./services/TenantService";

// ─── TenantWorkspace (EWP-004) ────────────────────────────────────────────────

export type {
  TenantWorkspaceRecord,
  TenantWorkspaceStatus,
  CreateWorkspaceCommand,
  ActivateWorkspaceCommand,
  SuspendWorkspaceCommand,
  ArchiveWorkspaceCommand,
  UpdateWorkspaceMetadataCommand,
  ListWorkspacesQuery,
} from "./models/TenantWorkspaceModels";
export { TENANT_WORKSPACE_STATUS } from "./models/TenantWorkspaceModels";

export { TenantWorkspace } from "./domain/TenantWorkspace";
export { TenantWorkspaceLifecycle } from "./domain/TenantWorkspaceLifecycle";
export { TenantWorkspaceValidator } from "./domain/TenantWorkspaceValidator";
export {
  WorkspaceNotFoundError,
  DuplicateWorkspaceCodeError,
  DuplicateWorkspaceNameError,
  WorkspaceTenantNotFoundError,
  ArchivedWorkspaceImmutableError,
  WorkspaceCodeImmutableError,
  WorkspaceTenantImmutableError,
  InvalidWorkspaceLifecycleTransitionError,
  WorkspaceConcurrencyError,
  WorkspaceValidationError,
} from "./domain/TenantWorkspaceErrors";

export type { ITenantWorkspaceRepository, WorkspaceMetadataUpdate } from "./contracts/ITenantWorkspaceRepository";
export type { ITenantWorkspaceService } from "./contracts/ITenantWorkspaceService";

export { TenantWorkspaceRepository } from "./repositories/TenantWorkspaceRepository";
export { TenantWorkspaceService } from "./services/TenantWorkspaceService";
