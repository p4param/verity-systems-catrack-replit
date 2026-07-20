// VS08A: IPlatformApplicationRepository contract
// Persistence operations for the PlatformApplication aggregate.
// Business validation is NOT permitted in repository implementations.

import type {
  PlatformApplicationMetadataUpdate,
  PlatformApplicationRecord,
  ListPlatformApplicationsQuery,
  SearchPlatformApplicationsQuery,
} from "../models/PlatformApplicationModels";

export interface IPlatformApplicationRepository {
  /**
   * Persists a newly created PlatformApplication record.
   * Throws on unique constraint violations (code, name).
   */
  create(record: PlatformApplicationRecord): Promise<void>;

  /**
   * Updates the mutable metadata fields of a PlatformApplication atomically.
   * Uses optimistic concurrency: fails with PlatformApplicationConcurrencyError
   * if the stored version does not match expectedVersion.
   */
  updateMetadata(
    id: string,
    data: PlatformApplicationMetadataUpdate,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  /**
   * Transitions a PlatformApplication to Retired status atomically.
   * Uses optimistic concurrency: fails with PlatformApplicationConcurrencyError
   * if the stored version does not match expectedVersion.
   * Lifecycle validity must be verified by the caller before this is invoked.
   */
  retire(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  /**
   * Returns a PlatformApplication by its internal UUID.
   * Returns null if not found or soft-deleted.
   */
  getById(id: string): Promise<PlatformApplicationRecord | null>;

  /**
   * Returns a PlatformApplication by its unique application code.
   * Returns null if not found or soft-deleted.
   */
  getByCode(code: string): Promise<PlatformApplicationRecord | null>;

  /**
   * Returns all PlatformApplications matching the query filters.
   * Results are ordered by name ascending.
   */
  list(query: ListPlatformApplicationsQuery): Promise<PlatformApplicationRecord[]>;

  /**
   * Returns PlatformApplications matching a full-text search across
   * code, name, displayName, and description.
   * Results are ordered by name ascending.
   */
  search(query: SearchPlatformApplicationsQuery): Promise<PlatformApplicationRecord[]>;

  /**
   * Returns true if a non-deleted PlatformApplication exists with the given code.
   * Used for duplicate code validation before creation.
   */
  existsByCode(code: string): Promise<boolean>;

  /**
   * Returns true if a non-deleted PlatformApplication exists with the given name
   * (case-insensitive). Used for duplicate name validation before creation.
   */
  existsByName(name: string): Promise<boolean>;
}
