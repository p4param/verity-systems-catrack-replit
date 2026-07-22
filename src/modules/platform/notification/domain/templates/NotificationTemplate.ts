// VS09 EWP-001: NotificationTemplate aggregate root
// Enforces all CC-001 business invariants, lifecycle state machine,
// domain commands, and domain event collection.
//
// Architecture boundaries (per CC-001 ownership rules):
//   OWNS: template metadata, semantic versions, language variations,
//         variable JSON schema definitions.
//   DOES NOT OWN: rendering engines, variable runtime values, delivery
//                 dispatches, localization dictionaries, provider adapters.

import { randomUUID } from 'crypto';
import type {
  NotificationTemplateRecord,
  TemplateStatus,
  TemplateCategory,
  DeliveryChannel,
  CreateTemplateCommand,
} from './NotificationTemplateModels';
import { TEMPLATE_STATUS } from './NotificationTemplateModels';
import { NotificationTemplateLifecycle } from './NotificationTemplateLifecycle';
import {
  TemplateVersionImmutableError,
  TemplateArchivedImmutableError,
  DuplicateLanguageError,
  DefaultLanguageRemovalError,
  LastLanguageRemovalError,
  DuplicateChannelError,
  LastChannelRemovalError,
  TemplateValidationError,
} from './NotificationTemplateErrors';
import type { NotificationTemplateDomainEvent } from './NotificationTemplateEvents';
import { VariableSchema } from './value-objects/VariableSchema';

export class NotificationTemplate {
  // Domain events are collected here and drained by the service after commit.
  private readonly _pendingEvents: NotificationTemplateDomainEvent[] = [];
  private _record: NotificationTemplateRecord;

  private constructor(record: NotificationTemplateRecord) {
    this._record = { ...record };
  }

  // ─── Identity ─────────────────────────────────────────────────────────────

  get id(): string                  { return this._record.id; }
  get tenantId(): string            { return this._record.tenantId; }
  get workspaceId(): string | null  { return this._record.workspaceId; }
  get templateCode(): string        { return this._record.templateCode; }
  get templateName(): string        { return this._record.templateName; }
  get description(): string | null  { return this._record.description; }
  get category(): TemplateCategory  { return this._record.category; }
  get status(): TemplateStatus      { return this._record.status; }
  get templateVersion(): string     { return this._record.templateVersion; }
  get parentTemplateId(): string | null { return this._record.parentTemplateId; }

  // ─── Configuration ────────────────────────────────────────────────────────

  get supportedChannels(): readonly DeliveryChannel[] {
    return [...this._record.supportedChannels];
  }

  get supportedLanguages(): readonly string[] {
    return [...this._record.supportedLanguages];
  }

  get defaultLanguage(): string         { return this._record.defaultLanguage; }
  get brandingProfileId(): string | null { return this._record.brandingProfileId; }
  get isSystemTemplate(): boolean       { return this._record.isSystemTemplate; }
  get isActive(): boolean               { return this._record.isActive; }

  get variableSchema(): VariableSchema {
    return VariableSchema.reconstitute(this._record.variableSchema);
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  get createdAt(): Date             { return this._record.createdAt; }
  get createdBy(): string | null    { return this._record.createdBy; }
  get updatedAt(): Date             { return this._record.updatedAt; }
  get updatedBy(): string | null    { return this._record.updatedBy; }
  get isDeleted(): boolean          { return this._record.isDeleted; }
  get deletedAt(): Date | null      { return this._record.deletedAt; }
  get deletedBy(): string | null    { return this._record.deletedBy; }
  get version(): bigint             { return this._record.version; }

  // ─── Factory: Create ──────────────────────────────────────────────────────

  /**
   * CC-001 Command: CreateTemplate
   * Produces a new NotificationTemplate in DRAFT status at version 1.0.0.
   * Emits: TemplateCreated
   */
  static create(command: CreateTemplateCommand): NotificationTemplate {
    NotificationTemplate.validateCreateCommand(command);

    // Validate and create the variable schema value object.
    const schema = VariableSchema.create(command.variableSchema);

    // Deduplicate and normalise supported languages.
    // The default language is always included in supported languages.
    const rawLanguages = [
      command.defaultLanguage,
      ...(command.supportedLanguages ?? []),
    ];
    const supportedLanguages = Array.from(new Set(rawLanguages.map(l => l.trim())));

    // Deduplicate supported channels.
    const supportedChannels = Array.from(new Set(command.supportedChannels));

    const now    = new Date();
    const record: NotificationTemplateRecord = {
      id:               randomUUID(),
      tenantId:         command.tenantId,
      workspaceId:      command.workspaceId ?? null,
      templateCode:     command.templateCode.trim().toUpperCase(),
      templateName:     command.templateName.trim(),
      description:      command.description?.trim() ?? null,
      category:         command.category,
      status:           TEMPLATE_STATUS.Draft,
      templateVersion:  '1.0.0',
      parentTemplateId: null,
      supportedChannels,
      supportedLanguages,
      defaultLanguage:  command.defaultLanguage.trim(),
      brandingProfileId: null,
      isSystemTemplate: command.isSystemTemplate ?? false,
      isActive:         true,
      variableSchema:   schema.toPlain(),
      createdAt:        now,
      createdBy:        command.actorUserId,
      updatedAt:        now,
      updatedBy:        command.actorUserId,
      isDeleted:        false,
      deletedAt:        null,
      deletedBy:        null,
      version:          BigInt(1),
    };

    const aggregate = new NotificationTemplate(record);
    aggregate._pendingEvents.push({
      type:            'TemplateCreated',
      templateId:      record.id,
      tenantId:        record.tenantId,
      templateCode:    record.templateCode,
      templateVersion: record.templateVersion,
      createdBy:       record.createdBy,
      occurredAt:      now,
    });
    return aggregate;
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a NotificationTemplate from a persisted record.
   * No validation — data was already validated on write.
   */
  static reconstitute(record: NotificationTemplateRecord): NotificationTemplate {
    return new NotificationTemplate({ ...record });
  }

  // ─── Command: PublishTemplate ─────────────────────────────────────────────

  /**
   * CC-001 Command: PublishTemplate
   * Transitions DRAFT → PUBLISHED.
   * Locks content attributes: version, channels, languages, schema.
   * Emits: TemplatePublished
   */
  publish(actorUserId: string): void {
    NotificationTemplateLifecycle.validateTransition(
      this._record.status,
      TEMPLATE_STATUS.Published
    );
    const now = new Date();
    this._record = {
      ...this._record,
      status:    TEMPLATE_STATUS.Published,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:            'TemplatePublished',
      templateId:      this._record.id,
      tenantId:        this._record.tenantId,
      templateCode:    this._record.templateCode,
      templateVersion: this._record.templateVersion,
      publishedBy:     actorUserId,
      occurredAt:      now,
    });
  }

  // ─── Command: CreateVersion ───────────────────────────────────────────────

  /**
   * CC-001 Command: CreateVersion
   * Derives a new NotificationTemplate (DRAFT) from this PUBLISHED predecessor.
   * The new aggregate inherits all metadata from the predecessor.
   * The predecessor must be PUBLISHED.
   * Circular inheritance: the new template cannot reference itself as parent.
   * Emits: TemplateVersionCreated (on the new aggregate, not `this`)
   */
  createVersion(newVersion: string, actorUserId: string): NotificationTemplate {
    // Source template must be PUBLISHED to serve as a versioning predecessor.
    if (this._record.status !== TEMPLATE_STATUS.Published) {
      throw new TemplateVersionImmutableError(
        this._record.id,
        this._record.status
      );
    }

    const predecessorVersion = this._record.templateVersion;
    const now                = new Date();
    const newId              = randomUUID();

    const newRecord: NotificationTemplateRecord = {
      ...this._record,
      id:               newId,
      templateVersion:  newVersion.trim(),
      status:           TEMPLATE_STATUS.Draft,
      parentTemplateId: this._record.id,  // predecessor is the parent
      createdAt:        now,
      createdBy:        actorUserId,
      updatedAt:        now,
      updatedBy:        actorUserId,
      isDeleted:        false,
      deletedAt:        null,
      deletedBy:        null,
      version:          BigInt(1),
    };

    const newAggregate = new NotificationTemplate(newRecord);
    newAggregate._pendingEvents.push({
      type:               'TemplateVersionCreated',
      templateId:         newId,
      tenantId:           newRecord.tenantId,
      templateCode:       newRecord.templateCode,
      predecessorVersion,
      newVersion:         newRecord.templateVersion,
      createdBy:          actorUserId,
      occurredAt:         now,
    });
    return newAggregate;
  }

  // ─── Command: DeprecateTemplate ───────────────────────────────────────────

  /**
   * CC-001 Command: DeprecateTemplate
   * Transitions PUBLISHED → DEPRECATED.
   * Emits: TemplateDeprecated
   */
  deprecate(actorUserId: string): void {
    NotificationTemplateLifecycle.validateTransition(
      this._record.status,
      TEMPLATE_STATUS.Deprecated
    );
    const now = new Date();
    this._record = {
      ...this._record,
      status:    TEMPLATE_STATUS.Deprecated,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:            'TemplateDeprecated',
      templateId:      this._record.id,
      tenantId:        this._record.tenantId,
      templateCode:    this._record.templateCode,
      templateVersion: this._record.templateVersion,
      deprecatedBy:    actorUserId,
      occurredAt:      now,
    });
  }

  // ─── Command: ArchiveTemplate ─────────────────────────────────────────────

  /**
   * CC-001 Command: ArchiveTemplate
   * Transitions PUBLISHED → ARCHIVED or DEPRECATED → ARCHIVED.
   * ARCHIVED is a terminal state — no further mutations are permitted.
   * Emits: TemplateArchived
   */
  archive(actorUserId: string): void {
    if (this._record.status === TEMPLATE_STATUS.Archived) {
      throw new TemplateArchivedImmutableError(this._record.id);
    }
    NotificationTemplateLifecycle.validateTransition(
      this._record.status,
      TEMPLATE_STATUS.Archived
    );
    const now = new Date();
    this._record = {
      ...this._record,
      status:    TEMPLATE_STATUS.Archived,
      isActive:  false,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:            'TemplateArchived',
      templateId:      this._record.id,
      tenantId:        this._record.tenantId,
      templateCode:    this._record.templateCode,
      templateVersion: this._record.templateVersion,
      archivedBy:      actorUserId,
      occurredAt:      now,
    });
  }

  // ─── Command: AddLanguage ─────────────────────────────────────────────────

  /**
   * CC-001 Command: AddLanguage
   * Permitted only in DRAFT status.
   * Throws DuplicateLanguageError if language is already registered.
   */
  addLanguage(languageCode: string, actorUserId: string): void {
    this.assertDraftModifiable();
    const normalized = languageCode.trim();
    if (this._record.supportedLanguages.includes(normalized)) {
      throw new DuplicateLanguageError(normalized);
    }
    this._record = {
      ...this._record,
      supportedLanguages: [...this._record.supportedLanguages, normalized],
      updatedAt: new Date(),
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
  }

  // ─── Command: RemoveLanguage ──────────────────────────────────────────────

  /**
   * CC-001 Command: RemoveLanguage
   * Permitted only in DRAFT status.
   * Throws DefaultLanguageRemovalError if removing the defaultLanguage.
   * Throws LastLanguageRemovalError if only one language remains.
   */
  removeLanguage(languageCode: string, actorUserId: string): void {
    this.assertDraftModifiable();
    const normalized = languageCode.trim();
    if (normalized === this._record.defaultLanguage) {
      throw new DefaultLanguageRemovalError(normalized);
    }
    if (this._record.supportedLanguages.length <= 1) {
      throw new LastLanguageRemovalError(this._record.id);
    }
    this._record = {
      ...this._record,
      supportedLanguages: this._record.supportedLanguages.filter(
        l => l !== normalized
      ),
      updatedAt: new Date(),
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
  }

  // ─── Command: AddChannel ──────────────────────────────────────────────────

  /**
   * CC-001 Command: AddChannel
   * Permitted only in DRAFT status.
   * Throws DuplicateChannelError if channel is already registered.
   */
  addChannel(channel: DeliveryChannel, actorUserId: string): void {
    this.assertDraftModifiable();
    if (this._record.supportedChannels.includes(channel)) {
      throw new DuplicateChannelError(channel);
    }
    this._record = {
      ...this._record,
      supportedChannels: [...this._record.supportedChannels, channel],
      updatedAt: new Date(),
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
  }

  // ─── Command: RemoveChannel ───────────────────────────────────────────────

  /**
   * CC-001 Command: RemoveChannel
   * Permitted only in DRAFT status.
   * Throws LastChannelRemovalError if only one channel remains.
   * No-op if the channel is not registered.
   */
  removeChannel(channel: DeliveryChannel, actorUserId: string): void {
    this.assertDraftModifiable();
    if (!this._record.supportedChannels.includes(channel)) {
      return; // idempotent — not an error if channel not present
    }
    if (this._record.supportedChannels.length <= 1) {
      throw new LastChannelRemovalError(this._record.id);
    }
    this._record = {
      ...this._record,
      supportedChannels: this._record.supportedChannels.filter(
        c => c !== channel
      ),
      updatedAt: new Date(),
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
  }

  // ─── Command: UpdateMetadata ──────────────────────────────────────────────

  /**
   * CC-001 Command: UpdateMetadata
   * Permitted only in DRAFT status.
   * Accepts partial updates — undefined fields are not modified.
   */
  updateMetadata(
    templateName:     string | undefined,
    description:      string | null | undefined,
    brandingProfileId: string | null | undefined,
    actorUserId:      string,
  ): void {
    this.assertDraftModifiable();
    if (templateName !== undefined && templateName.trim().length === 0) {
      throw new TemplateValidationError({ templateName: 'must not be empty' });
    }
    this._record = {
      ...this._record,
      templateName:
        templateName !== undefined
          ? templateName.trim()
          : this._record.templateName,
      description:
        description !== undefined
          ? (description?.trim() ?? null)
          : this._record.description,
      brandingProfileId:
        brandingProfileId !== undefined
          ? brandingProfileId
          : this._record.brandingProfileId,
      updatedAt: new Date(),
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
  }

  // ─── Domain Events ────────────────────────────────────────────────────────

  /**
   * Drains and returns all pending domain events.
   * Events are cleared from the aggregate after this call.
   * The application service is responsible for emitting these events.
   */
  pullDomainEvents(): NotificationTemplateDomainEvent[] {
    const events = [...this._pendingEvents];
    this._pendingEvents.length = 0;
    return events;
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  /**
   * Returns a shallow copy of the internal record for repository persistence.
   */
  toRecord(): NotificationTemplateRecord {
    return { ...this._record };
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  /**
   * Asserts the aggregate is in DRAFT status.
   * Mutations to channels, languages, and metadata are only permitted in DRAFT.
   */
  private assertDraftModifiable(): void {
    if (this._record.status === TEMPLATE_STATUS.Archived) {
      throw new TemplateArchivedImmutableError(this._record.id);
    }
    if (NotificationTemplateLifecycle.isContentLocked(this._record.status)) {
      throw new TemplateVersionImmutableError(
        this._record.id,
        this._record.status
      );
    }
  }

  // ─── Input Validation ─────────────────────────────────────────────────────

  private static validateCreateCommand(command: CreateTemplateCommand): void {
    const errors: Record<string, string> = {};

    const code = (command.templateCode ?? '').trim().toUpperCase();
    if (!code) {
      errors.templateCode = 'required';
    } else if (!/^[A-Z0-9_]{1,100}$/.test(code)) {
      errors.templateCode =
        'must be 1–100 characters containing only A–Z, 0–9, or underscores';
    }

    const name = (command.templateName ?? '').trim();
    if (!name) {
      errors.templateName = 'required';
    } else if (name.length > 255) {
      errors.templateName = 'must not exceed 255 characters';
    }

    if (!command.defaultLanguage || command.defaultLanguage.trim().length === 0) {
      errors.defaultLanguage = 'required';
    }

    if (!command.supportedChannels || command.supportedChannels.length === 0) {
      errors.supportedChannels = 'must contain at least one channel';
    }

    if (
      !command.variableSchema ||
      typeof command.variableSchema !== 'object' ||
      Array.isArray(command.variableSchema)
    ) {
      errors.variableSchema = 'must be a valid JSON schema object';
    }

    if (!command.tenantId || command.tenantId.trim().length === 0) {
      errors.tenantId = 'required';
    }

    if (!command.actorUserId || command.actorUserId.trim().length === 0) {
      errors.actorUserId = 'required';
    }

    if (Object.keys(errors).length > 0) {
      throw new TemplateValidationError(errors);
    }
  }
}
