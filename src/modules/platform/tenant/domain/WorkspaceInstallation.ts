// VS08A: WorkspaceInstallation aggregate root
// Encapsulates domain invariants for the WorkspaceInstallation entity.

import { randomUUID } from "crypto";
import type {
  WorkspaceInstallationRecord,
  WorkspaceInstallationStatus,
  InstallPackageCommand,
} from "../models/WorkspaceInstallationModels";
import { WORKSPACE_INSTALLATION_STATUS } from "../models/WorkspaceInstallationModels";
import { WorkspaceInstallationLifecycle } from "./WorkspaceInstallationLifecycle";
import { UninstalledInstallationImmutableError } from "./WorkspaceInstallationErrors";

export class WorkspaceInstallation {
  private constructor(private readonly _record: WorkspaceInstallationRecord) {}

  // ─── Identity & Associations ───────────────────────────────────────────────

  get id(): string {
    return this._record.id;
  }

  get workspaceId(): string {
    return this._record.workspaceId;
  }

  get packageId(): string {
    return this._record.packageId;
  }

  get status(): WorkspaceInstallationStatus {
    return this._record.status;
  }

  /**
   * Business timestamp populated upon transition to Installed status (D2).
   */
  get installedAt(): Date | null {
    return this._record.installedAt;
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  get createdAt(): Date {
    return this._record.createdAt;
  }

  get createdBy(): string | null {
    return this._record.createdBy;
  }

  get updatedAt(): Date {
    return this._record.updatedAt;
  }

  get updatedBy(): string | null {
    return this._record.updatedBy;
  }

  get isDeleted(): boolean {
    return this._record.isDeleted;
  }

  get deletedAt(): Date | null {
    return this._record.deletedAt;
  }

  get deletedBy(): string | null {
    return this._record.deletedBy;
  }

  get version(): bigint {
    return this._record.version;
  }

  // ─── Factory: Create ──────────────────────────────────────────────────────

  /**
   * Creates a new WorkspaceInstallation in Installing status (D1 / ADR-008-015).
   * Business timestamp installedAt is null until completion to Installed status.
   */
  static create(command: InstallPackageCommand): WorkspaceInstallation {
    const now = new Date();
    const record: WorkspaceInstallationRecord = {
      id: randomUUID(),
      workspaceId: command.workspaceId.trim(),
      packageId: command.packageId.trim(),
      status: WORKSPACE_INSTALLATION_STATUS.Installing,
      installedAt: null,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new WorkspaceInstallation(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a WorkspaceInstallation from a persisted record.
   */
  static reconstitute(record: WorkspaceInstallationRecord): WorkspaceInstallation {
    return new WorkspaceInstallation({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this WorkspaceInstallation is not Uninstalled.
   * Throws UninstalledInstallationImmutableError if Uninstalled.
   */
  assertModifiable(): void {
    if (WorkspaceInstallationLifecycle.isImmutable(this._record.status)) {
      throw new UninstalledInstallationImmutableError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  toRecord(): WorkspaceInstallationRecord {
    return { ...this._record };
  }
}
