// VS08A: IWorkspaceInstallationService contract

import type {
  WorkspaceInstallationRecord,
  InstallPackageCommand,
  CompleteInstallationCommand,
  SuspendInstallationCommand,
  ResumeInstallationCommand,
  UninstallInstallationCommand,
  ListWorkspaceInstallationsQuery,
} from "../models/WorkspaceInstallationModels";

export interface IWorkspaceInstallationService {
  // ─── Writes ───────────────────────────────────────────────────────────────

  installPackage(
    command: InstallPackageCommand
  ): Promise<WorkspaceInstallationRecord>;

  completeInstallation(
    command: CompleteInstallationCommand
  ): Promise<WorkspaceInstallationRecord>;

  suspendInstallation(
    command: SuspendInstallationCommand
  ): Promise<WorkspaceInstallationRecord>;

  resumeInstallation(
    command: ResumeInstallationCommand
  ): Promise<WorkspaceInstallationRecord>;

  uninstallPackage(
    command: UninstallInstallationCommand
  ): Promise<WorkspaceInstallationRecord>;

  // ─── Queries ──────────────────────────────────────────────────────────────

  getInstallation(id: string): Promise<WorkspaceInstallationRecord>;

  getInstallationByPackage(
    workspaceId: string,
    packageId: string
  ): Promise<WorkspaceInstallationRecord>;

  listWorkspaceInstallations(
    query: ListWorkspaceInstallationsQuery
  ): Promise<WorkspaceInstallationRecord[]>;
}
