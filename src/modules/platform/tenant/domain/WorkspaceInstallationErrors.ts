// VS08A: WorkspaceInstallation domain errors
// Structured domain errors carrying payload properties for programmatic inspection.

export class InstallationNotFoundError extends Error {
  readonly identifier: string;

  constructor(identifier: string) {
    super(`WorkspaceInstallation not found: ${identifier}`);
    this.name = "InstallationNotFoundError";
    this.identifier = identifier;
  }
}

export class DuplicateWorkspaceInstallationError extends Error {
  readonly workspaceId: string;
  readonly packageId: string;

  constructor(workspaceId: string, packageId: string) {
    super(`Package '${packageId}' is already installed in workspace '${workspaceId}'`);
    this.name = "DuplicateWorkspaceInstallationError";
    this.workspaceId = workspaceId;
    this.packageId = packageId;
  }
}

export class InstallationWorkspaceNotFoundError extends Error {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    super(`Target TenantWorkspace '${workspaceId}' does not exist`);
    this.name = "InstallationWorkspaceNotFoundError";
    this.workspaceId = workspaceId;
  }
}

export class InstallationPackageNotFoundError extends Error {
  readonly packageId: string;

  constructor(packageId: string) {
    super(`Target PlatformApplicationPackage '${packageId}' does not exist`);
    this.name = "InstallationPackageNotFoundError";
    this.packageId = packageId;
  }
}

export class InstallationPackageNotPublishedError extends Error {
  readonly packageId: string;
  readonly status: string;

  constructor(packageId: string, status: string) {
    super(`Cannot install package '${packageId}': package status is '${status}' (must be Published)`);
    this.name = "InstallationPackageNotPublishedError";
    this.packageId = packageId;
    this.status = status;
  }
}

export class InstallationWorkspaceNotActiveError extends Error {
  readonly workspaceId: string;
  readonly status: string;

  constructor(workspaceId: string, status: string) {
    super(`Cannot install into workspace '${workspaceId}': workspace status is '${status}' (must be Active)`);
    this.name = "InstallationWorkspaceNotActiveError";
    this.workspaceId = workspaceId;
    this.status = status;
  }
}

export class InstallationTenantNotActiveError extends Error {
  readonly tenantId: string;
  readonly status: string;

  constructor(tenantId: string, status: string) {
    super(`Cannot install into workspace: owning tenant '${tenantId}' status is '${status}' (must be Active)`);
    this.name = "InstallationTenantNotActiveError";
    this.tenantId = tenantId;
    this.status = status;
  }
}

export class UninstalledInstallationImmutableError extends Error {
  readonly installationId: string;

  constructor(installationId: string) {
    super(`WorkspaceInstallation '${installationId}' is uninstalled and immutable`);
    this.name = "UninstalledInstallationImmutableError";
    this.installationId = installationId;
  }
}

export class WorkspaceInstallationAssociationImmutableError extends Error {
  readonly installationId: string;

  constructor(installationId: string) {
    super(`Workspace and package associations cannot be modified on installation '${installationId}'`);
    this.name = "WorkspaceInstallationAssociationImmutableError";
    this.installationId = installationId;
  }
}

export class InvalidInstallationLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition for WorkspaceInstallation: ${from} → ${to}`);
    this.name = "InvalidInstallationLifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class WorkspaceInstallationConcurrencyError extends Error {
  readonly installationId: string;

  constructor(installationId: string) {
    super(`Concurrency conflict for WorkspaceInstallation '${installationId}': version mismatch`);
    this.name = "WorkspaceInstallationConcurrencyError";
    this.installationId = installationId;
  }
}

export class WorkspaceInstallationValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`WorkspaceInstallation validation failed — ${detail}`);
    this.name = "WorkspaceInstallationValidationError";
    this.fields = { ...fields };
  }
}
