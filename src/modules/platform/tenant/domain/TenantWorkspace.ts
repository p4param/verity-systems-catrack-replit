// VS08A: TenantWorkspace aggregate root
// Encapsulates domain invariants for the TenantWorkspace entity.

import { randomUUID } from "crypto";
import type {
  TenantWorkspaceRecord,
  TenantWorkspaceStatus,
  CreateWorkspaceCommand,
} from "../models/TenantWorkspaceModels";
import { TENANT_WORKSPACE_STATUS } from "../models/TenantWorkspaceModels";
import { TenantWorkspaceLifecycle } from "./TenantWorkspaceLifecycle";
import { ArchivedWorkspaceImmutableError } from "./TenantWorkspaceErrors";

export interface ParentTenantDefaults {
  defaultTimeZone: string;
  defaultCulture: string;
  defaultCurrency: string;
}

export class TenantWorkspace {
  private constructor(private readonly _record: TenantWorkspaceRecord) {}

  // ─── Identity & Association ───────────────────────────────────────────────

  get id(): string {
    return this._record.id;
  }

  get tenantId(): string {
    return this._record.tenantId;
  }

  get code(): string {
    return this._record.code;
  }

  get name(): string {
    return this._record.name;
  }

  get displayName(): string {
    return this._record.displayName;
  }

  get description(): string | null {
    return this._record.description;
  }

  get timeZone(): string {
    return this._record.timeZone;
  }

  get culture(): string {
    return this._record.culture;
  }

  get currency(): string {
    return this._record.currency;
  }

  get status(): TenantWorkspaceStatus {
    return this._record.status;
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
   * Creates a new TenantWorkspace in Provisioning status.
   * If timeZone, culture, or currency are omitted, they inherit from parentTenant defaults (D3 / ADR-008-014).
   */
  static create(
    command: CreateWorkspaceCommand,
    parentDefaults?: ParentTenantDefaults
  ): TenantWorkspace {
    const now = new Date();
    const record: TenantWorkspaceRecord = {
      id: randomUUID(),
      tenantId: command.tenantId,
      code: command.code.trim(),
      name: command.name.trim(),
      displayName: command.displayName.trim(),
      description: command.description?.trim() ?? null,
      timeZone: command.timeZone?.trim() ?? parentDefaults?.defaultTimeZone ?? "UTC",
      culture: command.culture?.trim() ?? parentDefaults?.defaultCulture ?? "en-US",
      currency: command.currency?.trim() ?? parentDefaults?.defaultCurrency ?? "USD",
      status: TENANT_WORKSPACE_STATUS.Provisioning,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new TenantWorkspace(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a TenantWorkspace from a persisted record.
   */
  static reconstitute(record: TenantWorkspaceRecord): TenantWorkspace {
    return new TenantWorkspace({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this TenantWorkspace is not Archived.
   * Throws ArchivedWorkspaceImmutableError if Archived.
   */
  assertModifiable(): void {
    if (TenantWorkspaceLifecycle.isImmutable(this._record.status)) {
      throw new ArchivedWorkspaceImmutableError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  toRecord(): TenantWorkspaceRecord {
    return { ...this._record };
  }
}
