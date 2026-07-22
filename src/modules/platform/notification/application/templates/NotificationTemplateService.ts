// VS09 EWP-001: NotificationTemplateService application service
// Orchestrates command validation, domain aggregate execution, persistence, and domain event dispatch.
// Satisfies application layer specifications in CC-001 and EWP-001.

import type { INotificationTemplateRepository } from '../../domain/templates/INotificationTemplateRepository';
import { NotificationTemplate } from '../../domain/templates/NotificationTemplate';
import type {
  NotificationTemplateRecord,
  CreateTemplateCommand,
  PublishTemplateCommand,
  CreateVersionCommand,
  DeprecateTemplateCommand,
  ArchiveTemplateCommand,
  AddLanguageCommand,
  RemoveLanguageCommand,
  AddChannelCommand,
  RemoveChannelCommand,
  UpdateTemplateMetadataCommand,
} from '../../domain/templates/NotificationTemplateModels';
import {
  NotificationTemplateNotFoundError,
  DuplicateTemplateVersionError,
} from '../../domain/templates/NotificationTemplateErrors';
import type { NotificationTemplateDomainEvent } from '../../domain/templates/NotificationTemplateEvents';

export interface IDomainEventPublisher {
  publish(event: NotificationTemplateDomainEvent): Promise<void>;
  publishAll(events: NotificationTemplateDomainEvent[]): Promise<void>;
}

export class NotificationTemplateService {
  constructor(
    private readonly repository: INotificationTemplateRepository,
    private readonly eventPublisher?: IDomainEventPublisher
  ) {}

  // ─── Command Use Cases ───────────────────────────────────────────────────

  /**
   * Creates a new NotificationTemplate aggregate and persists it.
   */
  async createTemplate(
    command: CreateTemplateCommand
  ): Promise<NotificationTemplateRecord> {
    const existing = await this.repository.findByCode(
      command.tenantId,
      command.templateCode,
      '1.0.0'
    );

    if (existing) {
      throw new DuplicateTemplateVersionError(command.templateCode, '1.0.0');
    }

    const template = NotificationTemplate.create(command);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Transitions a template version to PUBLISHED.
   */
  async publishTemplate(
    command: PublishTemplateCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.publish(command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Creates a new draft template version from an existing published template predecessor.
   */
  async createVersion(
    command: CreateVersionCommand
  ): Promise<NotificationTemplateRecord> {
    const predecessor = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    const existing = await this.repository.findByCode(
      command.tenantId,
      predecessor.templateCode,
      command.newVersion
    );

    if (existing) {
      throw new DuplicateTemplateVersionError(
        predecessor.templateCode,
        command.newVersion
      );
    }

    const newVersion = predecessor.createVersion(
      command.newVersion,
      command.actorUserId
    );

    await this.repository.save(newVersion);
    await this.dispatchEvents(newVersion);

    return newVersion.toRecord();
  }

  /**
   * Deprecates a published template version.
   */
  async deprecateTemplate(
    command: DeprecateTemplateCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.deprecate(command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Archives a template version (terminal lifecycle state).
   */
  async archiveTemplate(
    command: ArchiveTemplateCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.archive(command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Adds a supported language variation to a draft template version.
   */
  async addLanguage(
    command: AddLanguageCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.addLanguage(command.languageCode, command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Removes a supported language variation from a draft template version.
   */
  async removeLanguage(
    command: RemoveLanguageCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.removeLanguage(command.languageCode, command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Adds a delivery channel to a draft template version.
   */
  async addChannel(
    command: AddChannelCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.addChannel(command.channel, command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Removes a delivery channel from a draft template version.
   */
  async removeChannel(
    command: RemoveChannelCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.removeChannel(command.channel, command.actorUserId);
    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  /**
   * Updates non-content metadata of a draft template version.
   */
  async updateTemplateMetadata(
    command: UpdateTemplateMetadataCommand
  ): Promise<NotificationTemplateRecord> {
    const template = await this.getTemplateOrThrow(
      command.templateId,
      command.tenantId
    );

    template.updateMetadata(
      command.templateName,
      command.description,
      command.brandingProfileId,
      command.actorUserId
    );

    await this.repository.save(template);
    await this.dispatchEvents(template);

    return template.toRecord();
  }

  // ─── Query Use Cases ─────────────────────────────────────────────────────

  async getById(
    id: string,
    tenantId: string
  ): Promise<NotificationTemplateRecord | null> {
    const template = await this.repository.findById(id, tenantId);
    return template ? template.toRecord() : null;
  }

  async getByCode(
    tenantId: string,
    templateCode: string,
    version?: string
  ): Promise<NotificationTemplateRecord | null> {
    const template = await this.repository.findByCode(
      tenantId,
      templateCode,
      version
    );
    return template ? template.toRecord() : null;
  }

  async getLatestPublishedVersion(
    tenantId: string,
    templateCode: string
  ): Promise<NotificationTemplateRecord | null> {
    const template = await this.repository.findLatestPublishedVersion(
      tenantId,
      templateCode
    );
    return template ? template.toRecord() : null;
  }

  async listPublished(
    tenantId: string,
    category?: string
  ): Promise<NotificationTemplateRecord[]> {
    const templates = await this.repository.listPublished(tenantId, category);
    return templates.map((t) => t.toRecord());
  }

  async listByChannel(
    tenantId: string,
    channel: string,
    status?: string
  ): Promise<NotificationTemplateRecord[]> {
    const templates = await this.repository.listByChannel(
      tenantId,
      channel,
      status
    );
    return templates.map((t) => t.toRecord());
  }

  async listByLanguage(
    tenantId: string,
    languageCode: string
  ): Promise<NotificationTemplateRecord[]> {
    const templates = await this.repository.listByLanguage(
      tenantId,
      languageCode
    );
    return templates.map((t) => t.toRecord());
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getTemplateOrThrow(
    id: string,
    tenantId: string
  ): Promise<NotificationTemplate> {
    const template = await this.repository.findById(id, tenantId);
    if (!template) {
      throw new NotificationTemplateNotFoundError(id);
    }
    return template;
  }

  private async dispatchEvents(template: NotificationTemplate): Promise<void> {
    const events = template.pullDomainEvents();
    if (events.length > 0 && this.eventPublisher) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
