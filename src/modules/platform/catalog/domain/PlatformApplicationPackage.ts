// VS08A: PlatformApplicationPackage aggregate root
// The aggregate root encapsulates all domain invariants for the
// PlatformApplicationPackage entity. It is the only entry point for creating
// a PlatformApplicationPackage in the domain layer.
//
// Immutability: once published, no metadata can change (ES-009 §6, CC-002).
// No updateMetadata capability exists — immutability is structural.

import { randomUUID } from "crypto";
import type {
  PlatformApplicationPackageRecord,
  PlatformApplicationPackageStatus,
  CreatePackageCommand,
} from "../models/PlatformApplicationPackageModels";
import { PLATFORM_APPLICATION_PACKAGE_STATUS } from "../models/PlatformApplicationPackageModels";
import { PlatformApplicationPackageLifecycle } from "./PlatformApplicationPackageLifecycle";
import { PublishedPackageImmutableError } from "./PlatformApplicationPackageErrors";

export class PlatformApplicationPackage {
  private constructor(
    private readonly _record: PlatformApplicationPackageRecord
  ) {}

  // ─── Identity ─────────────────────────────────────────────────────────────

  get id(): string {
    return this._record.id;
  }

  /** The owning PlatformApplication. Immutable after creation. */
  get applicationId(): string {
    return this._record.applicationId;
  }

  /**
   * The SemVer 2.0.0 version of this package (ADR-008-012).
   * Immutable after creation.
   */
  get packageVersion(): string {
    return this._record.packageVersion;
  }

  get displayName(): string {
    return this._record.displayName;
  }

  get description(): string | null {
    return this._record.description;
  }

  get releaseNotes(): string | null {
    return this._record.releaseNotes;
  }

  get status(): PlatformApplicationPackageStatus {
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

  /**
   * ES-001 optimistic concurrency counter.
   * Stored in DB column `version` (BIGINT).
   */
  get version(): bigint {
    return this._record.version;
  }

  // ─── Factory: Create ──────────────────────────────────────────────────────

  /**
   * Creates a new PlatformApplicationPackage in Draft status.
   * The packageVersion is stored as-is (trimmed); no normalization.
   */
  static create(
    command: CreatePackageCommand
  ): PlatformApplicationPackage {
    const now = new Date();
    const record: PlatformApplicationPackageRecord = {
      id: randomUUID(),
      applicationId: command.applicationId,
      packageVersion: command.packageVersion.trim(),
      displayName: command.displayName.trim(),
      description: command.description?.trim() ?? null,
      releaseNotes: command.releaseNotes?.trim() ?? null,
      status: PLATFORM_APPLICATION_PACKAGE_STATUS.Draft,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    };
    return new PlatformApplicationPackage(record);
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a PlatformApplicationPackage from a persisted record.
   * Used by repositories when loading from the database.
   */
  static reconstitute(
    record: PlatformApplicationPackageRecord
  ): PlatformApplicationPackage {
    return new PlatformApplicationPackage({ ...record });
  }

  // ─── Domain Guards ────────────────────────────────────────────────────────

  /**
   * Asserts that this package is in Draft status (modifiable).
   * Throws PublishedPackageImmutableError if the package is no longer Draft.
   * Per ES-009 §6: published, deprecated, and archived packages are immutable.
   */
  assertModifiable(): void {
    if (PlatformApplicationPackageLifecycle.isImmutable(this._record.status)) {
      throw new PublishedPackageImmutableError(this._record.id);
    }
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  /**
   * Returns a snapshot of the current domain record.
   * Used by repositories and services to persist or return state.
   */
  toRecord(): PlatformApplicationPackageRecord {
    return { ...this._record };
  }
}
