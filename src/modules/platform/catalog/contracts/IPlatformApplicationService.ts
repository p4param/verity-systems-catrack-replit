// VS08A: IPlatformApplicationService contract
// Application service that coordinates validation, lifecycle enforcement,
// and repository interaction for the PlatformApplication aggregate.
// The service does not contain persistence details.

import type {
  PlatformApplicationRecord,
  PlatformApplicationStatus,
  RegisterPlatformApplicationCommand,
  UpdatePlatformApplicationMetadataCommand,
  RetirePlatformApplicationCommand,
  ListPlatformApplicationsQuery,
  SearchPlatformApplicationsQuery,
} from "../models/PlatformApplicationModels";

export interface IPlatformApplicationService {
  /**
   * Registers a new PlatformApplication in Draft status.
   * Validates required fields, enforces code/name uniqueness.
   */
  register(
    command: RegisterPlatformApplicationCommand
  ): Promise<PlatformApplicationRecord>;

  /**
   * Updates the display metadata of a PlatformApplication.
   * The application code is immutable and cannot be updated.
   * Retired applications cannot be modified.
   */
  updateMetadata(
    command: UpdatePlatformApplicationMetadataCommand
  ): Promise<PlatformApplicationRecord>;

  /**
   * Retires a PlatformApplication. The application must be in
   * Published or Deprecated status for retirement to succeed.
   */
  retire(
    command: RetirePlatformApplicationCommand
  ): Promise<PlatformApplicationRecord>;

  /**
   * Returns a PlatformApplication by its internal UUID.
   * Throws PlatformApplicationNotFoundError if not found.
   */
  getById(id: string): Promise<PlatformApplicationRecord>;

  /**
   * Returns a PlatformApplication by its unique application code.
   * Throws PlatformApplicationNotFoundError if not found.
   */
  getByCode(code: string): Promise<PlatformApplicationRecord>;

  /**
   * Returns all PlatformApplications matching the query filters.
   */
  list(query: ListPlatformApplicationsQuery): Promise<PlatformApplicationRecord[]>;

  /**
   * Returns PlatformApplications matching a text search across code, name,
   * displayName, and description.
   */
  search(
    query: SearchPlatformApplicationsQuery
  ): Promise<PlatformApplicationRecord[]>;

  /**
   * Returns all non-deleted PlatformApplications in the given category.
   */
  filterByCategory(category: string): Promise<PlatformApplicationRecord[]>;

  /**
   * Returns all non-deleted PlatformApplications in the given lifecycle status.
   */
  filterByStatus(
    status: PlatformApplicationStatus
  ): Promise<PlatformApplicationRecord[]>;
}
