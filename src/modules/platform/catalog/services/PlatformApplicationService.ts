// VS08A: PlatformApplicationService — application service
// Coordinates validation, lifecycle enforcement, and repository interaction.
// Contains no persistence details.

import type { IPlatformApplicationRepository } from "../contracts/IPlatformApplicationRepository";
import type { IPlatformApplicationService } from "../contracts/IPlatformApplicationService";
import type {
  PlatformApplicationRecord,
  PlatformApplicationStatus,
  RegisterPlatformApplicationCommand,
  UpdatePlatformApplicationMetadataCommand,
  RetirePlatformApplicationCommand,
  ListPlatformApplicationsQuery,
  SearchPlatformApplicationsQuery,
} from "../models/PlatformApplicationModels";
import { PLATFORM_APPLICATION_STATUS } from "../models/PlatformApplicationModels";
import { PlatformApplication } from "../domain/PlatformApplication";
import { PlatformApplicationLifecycle } from "../domain/PlatformApplicationLifecycle";
import { PlatformApplicationValidator } from "../domain/PlatformApplicationValidator";
import {
  DuplicateApplicationCodeError,
  DuplicateApplicationNameError,
  PlatformApplicationNotFoundError,
} from "../domain/PlatformApplicationErrors";

export class PlatformApplicationService implements IPlatformApplicationService {
  constructor(
    private readonly repository: IPlatformApplicationRepository
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────

  async register(
    command: RegisterPlatformApplicationCommand
  ): Promise<PlatformApplicationRecord> {
    // 1. Validate command fields (validator enforces uppercase format)
    PlatformApplicationValidator.validateRegisterCommand(command);

    // 2. Enforce global uniqueness (application code — stored as provided)
    const codeTrimmed = command.code.trim();
    if (await this.repository.existsByCode(codeTrimmed)) {
      throw new DuplicateApplicationCodeError(codeTrimmed);
    }

    // 3. Enforce global uniqueness (application name)
    if (await this.repository.existsByName(command.name)) {
      throw new DuplicateApplicationNameError(command.name.trim());
    }

    // 4. Create aggregate (sets Draft status; code stored as-is, no normalization)
    const app = PlatformApplication.create(command);

    // 5. Persist (DB unique constraints act as the final concurrency guard)
    await this.repository.create(app.toRecord());

    return app.toRecord();
  }

  // ─── Update Metadata ──────────────────────────────────────────────────────

  async updateMetadata(
    command: UpdatePlatformApplicationMetadataCommand
  ): Promise<PlatformApplicationRecord> {
    // 1. Validate command fields
    PlatformApplicationValidator.validateUpdateMetadataCommand(command);

    // 2. Load existing record
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new PlatformApplicationNotFoundError(command.id);
    }

    // 3. Assert the application is in a modifiable state (domain guard)
    PlatformApplication.reconstitute(existing).assertModifiable();

    // 4. Merge current values with provided updates
    //    Fields absent from the command retain their existing values.
    const data = {
      displayName:
        command.displayName !== undefined
          ? command.displayName.trim()
          : existing.displayName,
      description:
        "description" in command
          ? command.description ?? null
          : existing.description,
      category:
        command.category !== undefined
          ? command.category.trim()
          : existing.category,
      iconUrl:
        "iconUrl" in command ? command.iconUrl ?? null : existing.iconUrl,
      websiteUrl:
        "websiteUrl" in command
          ? command.websiteUrl ?? null
          : existing.websiteUrl,
    };

    // 5. Persist with optimistic concurrency
    await this.repository.updateMetadata(
      command.id,
      data,
      command.actorUserId,
      command.expectedVersion
    );

    // 6. Return fresh state
    const updated = await this.repository.getById(command.id);
    if (!updated) {
      throw new PlatformApplicationNotFoundError(command.id);
    }
    return updated;
  }

  // ─── Retire ───────────────────────────────────────────────────────────────

  async retire(
    command: RetirePlatformApplicationCommand
  ): Promise<PlatformApplicationRecord> {
    // 1. Load existing record
    const existing = await this.repository.getById(command.id);
    if (!existing) {
      throw new PlatformApplicationNotFoundError(command.id);
    }

    // 2. Validate the lifecycle transition (centralized in domain layer)
    PlatformApplicationLifecycle.validateTransition(
      existing.status,
      PLATFORM_APPLICATION_STATUS.Retired
    );

    // 3. Persist the lifecycle transition with optimistic concurrency
    await this.repository.retire(
      command.id,
      command.actorUserId,
      command.expectedVersion
    );

    // 4. Return fresh state
    const updated = await this.repository.getById(command.id);
    if (!updated) {
      throw new PlatformApplicationNotFoundError(command.id);
    }
    return updated;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getById(id: string): Promise<PlatformApplicationRecord> {
    const record = await this.repository.getById(id);
    if (!record) {
      throw new PlatformApplicationNotFoundError(id);
    }
    return record;
  }

  async getByCode(code: string): Promise<PlatformApplicationRecord> {
    const record = await this.repository.getByCode(code);
    if (!record) {
      throw new PlatformApplicationNotFoundError(code);
    }
    return record;
  }

  async list(
    query: ListPlatformApplicationsQuery
  ): Promise<PlatformApplicationRecord[]> {
    return this.repository.list(query);
  }

  async search(
    query: SearchPlatformApplicationsQuery
  ): Promise<PlatformApplicationRecord[]> {
    if (!query.query.trim()) {
      return [];
    }
    return this.repository.search(query);
  }

  async filterByCategory(category: string): Promise<PlatformApplicationRecord[]> {
    return this.repository.list({ category });
  }

  async filterByStatus(
    status: PlatformApplicationStatus
  ): Promise<PlatformApplicationRecord[]> {
    return this.repository.list({ status });
  }
}
