// VS08A: PlatformApplication aggregate root
// The aggregate root encapsulates all domain invariants for the
// PlatformApplication entity. It is the only entry point for creating
// or mutating a PlatformApplication in the domain layer.

import { randomUUID } from "crypto";
import type {
  PlatformApplicationRecord,
  PlatformApplicationStatus,
  RegisterPlatformApplicationCommand,
} from "../models/PlatformApplicationModels";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";
import { PlatformApplicationLifecycle } from "./PlatformApplicationLifecycle";
import { RetiredApplicationModificationError } from "./PlatformApplicationErrors";

export class PlatformApplication {
  private constructor(private readonly _record: PlatformApplicationRecord) {}

  // ─── Identity ─────────────────────────────────────────────────────────────

  get id(): string {
    return this._record.id;
  }

  /**
   * Application code is immutable after creation.
   * It is normalized to UPPER_CASE on creation and never changes.
   */
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

  get category(): string {
    return this._record.category;
  }

  get iconUrl(): string | null {
    return this._record.iconUrl;
  }

  get websiteUrl(): string | null {
    return this._record.websiteUrl;
  }

  get status(): PlatformApplicationStatus {
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
   * Creates a new PlatformApplication aggregate from a register command.
   * The application starts in Draft status.
   * The code is normalized to UPPER_CASE and trimmed.
   */
  static create(
    command: RegisterPlatformApplicationCommand
  ): PlatformApplication {
    const now = new Date();
    const record: PlatformApplicationRecord = {
      id: randomUUID(),
      code: command.code.trim(),
      name: command.name.trim(),
      displayName: command.displayName.trim(),
      description: command.description?.trim() ?? null,
      category: command.category.trim(),
      iconUrl: command.iconUrl?.trim() ?? null,
      websiteUrl: command.websiteUrl?.trim() ?? null,
      status: PLATFORM_APPLICATION_STATUS.Draft,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new PlatformApplication(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a PlatformApplication aggregate from a persisted record.
   * Used by repositories when loading from the database.
   */
  static reconstitute(record: PlatformApplicationRecord): PlatformApplication {
    return new PlatformApplication({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this application is in a modifiable state.
   * Throws RetiredApplicationModificationError if the application is Retired.
   */
  assertModifiable(): void {
    if (!PlatformApplicationLifecycle.isModifiable(this._record.status)) {
      throw new RetiredApplicationModificationError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  /**
   * Returns a snapshot of the current domain record.
   * Used by repositories and services to persist or return state.
   */
  toRecord(): PlatformApplicationRecord {
    return { ...this._record };
  }
}
