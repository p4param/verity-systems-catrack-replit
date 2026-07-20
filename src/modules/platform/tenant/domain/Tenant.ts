// VS08A: Tenant aggregate root
// Encapsulates domain invariants for the Tenant entity.

import { randomUUID } from "crypto";
import type {
  TenantRecord,
  TenantStatus,
  RegisterTenantCommand,
} from "../models/TenantModels";
import { TENANT_STATUS } from "../models/TenantModels";
import { TenantLifecycle } from "./TenantLifecycle";
import { ArchivedTenantImmutableError } from "./TenantErrors";

export class Tenant {
  private constructor(private readonly _record: TenantRecord) {}

  // ─── Identity ─────────────────────────────────────────────────────────────

  get id(): string {
    return this._record.id;
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

  get logoUrl(): string | null {
    return this._record.logoUrl;
  }

  get defaultTimeZone(): string {
    return this._record.defaultTimeZone;
  }

  get defaultCulture(): string {
    return this._record.defaultCulture;
  }

  get defaultCurrency(): string {
    return this._record.defaultCurrency;
  }

  get status(): TenantStatus {
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
   * Creates a new Tenant in Provisioning status.
   */
  static create(command: RegisterTenantCommand): Tenant {
    const now = new Date();
    const record: TenantRecord = {
      id: randomUUID(),
      code: command.code.trim(),
      name: command.name.trim(),
      displayName: command.displayName.trim(),
      description: command.description?.trim() ?? null,
      logoUrl: command.logoUrl?.trim() ?? null,
      defaultTimeZone: command.defaultTimeZone?.trim() ?? "UTC",
      defaultCulture: command.defaultCulture?.trim() ?? "en-US",
      defaultCurrency: command.defaultCurrency?.trim() ?? "USD",
      status: TENANT_STATUS.Provisioning,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new Tenant(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a Tenant from a persisted record.
   */
  static reconstitute(record: TenantRecord): Tenant {
    return new Tenant({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this Tenant is not Archived.
   * Throws ArchivedTenantImmutableError if Archived.
   */
  assertModifiable(): void {
    if (TenantLifecycle.isImmutable(this._record.status)) {
      throw new ArchivedTenantImmutableError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  toRecord(): TenantRecord {
    return { ...this._record };
  }
}
