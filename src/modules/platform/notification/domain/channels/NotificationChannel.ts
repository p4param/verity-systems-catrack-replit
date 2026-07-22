// VS09 EWP-002: NotificationChannel aggregate root
// Enforces all CC-002 business invariants, lifecycle state machine,
// domain commands, and domain event collection.

import { randomUUID } from 'crypto';
import type {
  NotificationChannelRecord,
  NotificationChannelType,
  NotificationChannelStatus,
  CreateChannelCommand,
  UpdateChannelMetadataCommand,
} from './NotificationChannelModels';
import { CHANNEL_STATUS, CHANNEL_TYPE } from './NotificationChannelModels';
import { NotificationChannelLifecycle } from './NotificationChannelLifecycle';
import {
  ChannelStateImmutableError,
  ChannelValidationError,
} from './NotificationChannelErrors';
import type { NotificationChannelDomainEvent } from './NotificationChannelEvents';

export class NotificationChannel {
  private readonly _pendingEvents: NotificationChannelDomainEvent[] = [];
  private _record: NotificationChannelRecord;

  private constructor(record: NotificationChannelRecord) {
    this._record = { ...record };
  }

  // ─── Identity ─────────────────────────────────────────────────────────────

  get id(): string                        { return this._record.id; }
  get tenantId(): string                  { return this._record.tenantId; }
  get workspaceId(): string | null        { return this._record.workspaceId; }
  get channelCode(): string               { return this._record.channelCode; }
  get channelName(): string               { return this._record.channelName; }
  get description(): string | null        { return this._record.description; }
  get channelType(): NotificationChannelType { return this._record.channelType; }
  get status(): NotificationChannelStatus   { return this._record.status; }
  get priority(): number                  { return this._record.priority; }
  get isDefault(): boolean                { return this._record.isDefault; }
  get isEnabled(): boolean                { return this._record.isEnabled; }

  get supportedTemplateCategories(): readonly string[] {
    return [...this._record.supportedTemplateCategories];
  }

  get configurationMetadata(): Record<string, unknown> | null {
    return this._record.configurationMetadata ? { ...this._record.configurationMetadata } : null;
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

  // ─── Event Management ──────────────────────────────────────────────────────

  pullDomainEvents(): NotificationChannelDomainEvent[] {
    const events = [...this._pendingEvents];
    this._pendingEvents.length = 0;
    return events;
  }

  // ─── Factory: Create ──────────────────────────────────────────────────────

  /**
   * CC-002 Command: CreateChannel
   * Instantiates a new NotificationChannel in DRAFT status.
   * Emits: ChannelCreated
   */
  static create(command: CreateChannelCommand): NotificationChannel {
    NotificationChannel.validateCreateCommand(command);

    // Deduplicate categories (RC-005)
    const supportedTemplateCategories = Array.from(
      new Set((command.supportedTemplateCategories ?? []).map(c => c.trim().toUpperCase()))
    );

    const now = new Date();
    const record: NotificationChannelRecord = {
      id:                          randomUUID(),
      tenantId:                    command.tenantId,
      workspaceId:                 command.workspaceId ?? null,
      channelCode:                 command.channelCode.trim().toUpperCase(),
      channelName:                 command.channelName.trim(),
      description:                 command.description?.trim() ?? null,
      channelType:                 command.channelType,
      status:                      CHANNEL_STATUS.Draft,
      priority:                    command.priority ?? 100,
      isDefault:                   false,
      isEnabled:                   true,
      supportedTemplateCategories,
      configurationMetadata:       command.configurationMetadata ? { ...command.configurationMetadata } : null,
      createdAt:                   now,
      createdBy:                   command.actorUserId,
      updatedAt:                   now,
      updatedBy:                   command.actorUserId,
      isDeleted:                   false,
      deletedAt:                   null,
      deletedBy:                   null,
      version:                     BigInt(1),
    };

    const aggregate = new NotificationChannel(record);
    aggregate._pendingEvents.push({
      type:        'ChannelCreated',
      channelId:   record.id,
      tenantId:    record.tenantId,
      channelCode: record.channelCode,
      channelType: record.channelType,
      createdBy:   record.createdBy,
      occurredAt:  now,
    });
    return aggregate;
  }

  // ─── Factory: Reconstitute ────────────────────────────────────────────────

  /**
   * Reconstitutes a NotificationChannel from a database record.
   * Bypasses command-level validations.
   */
  static reconstitute(record: NotificationChannelRecord): NotificationChannel {
    return new NotificationChannel({ ...record });
  }

  // ─── Commands ─────────────────────────────────────────────────────────────

  /**
   * Updates display name, description, priority, categories, and business-only configuration metadata.
   */
  updateMetadata(command: UpdateChannelMetadataCommand): void {
    this.assertMutable();
    NotificationChannel.validateMetadataUpdate(command);

    const now = new Date();
    const updatedRecord = { ...this._record };

    if (command.channelName !== undefined) {
      updatedRecord.channelName = command.channelName.trim();
    }
    if (command.description !== undefined) {
      updatedRecord.description = command.description.trim() || null;
    }
    if (command.priority !== undefined) {
      updatedRecord.priority = command.priority;
    }
    if (command.supportedTemplateCategories !== undefined) {
      updatedRecord.supportedTemplateCategories = Array.from(
        new Set(command.supportedTemplateCategories.map(c => c.trim().toUpperCase()))
      );
    }
    if (command.configurationMetadata !== undefined) {
      updatedRecord.configurationMetadata = { ...command.configurationMetadata };
    }

    updatedRecord.updatedAt = now;
    updatedRecord.updatedBy = command.actorUserId;
    updatedRecord.version  += BigInt(1);

    this._record = updatedRecord;
  }

  /**
   * Transitions DRAFT/SUSPENDED -> ACTIVE.
   * Emits: ChannelActivated
   */
  activate(actorUserId: string): void {
    NotificationChannelLifecycle.validateTransition(this._record.status, CHANNEL_STATUS.Active);
    const now = new Date();
    this._record = {
      ...this._record,
      status:    CHANNEL_STATUS.Active,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:        'ChannelActivated',
      channelId:   this._record.id,
      tenantId:    this._record.tenantId,
      activatedBy: actorUserId,
      occurredAt:  now,
    });
  }

  /**
   * Transitions ACTIVE -> SUSPENDED.
   * Emits: ChannelSuspended
   */
  suspend(actorUserId: string): void {
    NotificationChannelLifecycle.validateTransition(this._record.status, CHANNEL_STATUS.Suspended);
    const now = new Date();
    this._record = {
      ...this._record,
      status:    CHANNEL_STATUS.Suspended,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:        'ChannelSuspended',
      channelId:   this._record.id,
      tenantId:    this._record.tenantId,
      suspendedBy: actorUserId,
      occurredAt:  now,
    });
  }

  /**
   * Transitions ACTIVE/SUSPENDED -> ARCHIVED (terminal state).
   * Emits: ChannelArchived
   */
  archive(actorUserId: string): void {
    if (this._record.status === CHANNEL_STATUS.Archived) {
      throw new ChannelStateImmutableError(this._record.id, this._record.status);
    }
    NotificationChannelLifecycle.validateTransition(this._record.status, CHANNEL_STATUS.Archived);
    const now = new Date();
    this._record = {
      ...this._record,
      status:    CHANNEL_STATUS.Archived,
      isEnabled: false,
      isDefault: false,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:        'ChannelArchived',
      channelId:   this._record.id,
      tenantId:    this._record.tenantId,
      archivedBy:  actorUserId,
      occurredAt:  now,
    });
  }

  /**
   * Toggles isEnabled = true.
   * Emits: ChannelEnabled
   */
  enable(actorUserId: string): void {
    this.assertMutable();
    if (this._record.isEnabled) return;

    const now = new Date();
    this._record = {
      ...this._record,
      isEnabled: true,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:        'ChannelEnabled',
      channelId:   this._record.id,
      tenantId:    this._record.tenantId,
      enabledBy:   actorUserId,
      occurredAt:  now,
    });
  }

  /**
   * Toggles isEnabled = false.
   * Emits: ChannelDisabled
   */
  disable(actorUserId: string): void {
    this.assertMutable();
    if (!this._record.isEnabled) return;

    const now = new Date();
    this._record = {
      ...this._record,
      isEnabled: false,
      isDefault: false, // Default channels cannot be disabled
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };
    this._pendingEvents.push({
      type:        'ChannelDisabled',
      channelId:   this._record.id,
      tenantId:    this._record.tenantId,
      disabledBy:  actorUserId,
      occurredAt:  now,
    });
  }

  /**
   * Marks this channel as default for its type (RC-003: unsets only own state).
   * Emits: DefaultChannelChanged
   */
  setDefault(isDefault: boolean, actorUserId: string): void {
    this.assertMutable();

    // Default channels must be enabled and active/draft (not archived)
    if (isDefault && !this._record.isEnabled) {
      throw new ChannelValidationError({ isDefault: 'Cannot set a disabled channel as default' });
    }

    if (this._record.isDefault === isDefault) return;

    const now = new Date();
    this._record = {
      ...this._record,
      isDefault,
      updatedAt: now,
      updatedBy: actorUserId,
      version:   this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type:        'DefaultChannelChanged',
      channelId:   this._record.id,
      tenantId:    this._record.tenantId,
      channelType: this._record.channelType,
      isDefault,
      changedBy:   actorUserId,
      occurredAt:  now,
    });
  }

  /**
   * projects the current aggregate state to a readonly record.
   */
  toRecord(): NotificationChannelRecord {
    return {
      ...this._record,
      supportedTemplateCategories: [...this._record.supportedTemplateCategories],
      configurationMetadata: this._record.configurationMetadata ? { ...this._record.configurationMetadata } : null,
    };
  }

  // ─── Helpers & Invariant Enforcement ───────────────────────────────────────

  private assertMutable(): void {
    if (NotificationChannelLifecycle.isImmutable(this._record.status)) {
      throw new ChannelStateImmutableError(this._record.id, this._record.status);
    }
  }

  private static validateCreateCommand(command: CreateChannelCommand): void {
    const errors: Record<string, string> = {};

    if (!command.tenantId || command.tenantId.trim().length === 0) {
      errors.tenantId = 'required';
    }
    if (!command.channelCode || command.channelCode.trim().length === 0) {
      errors.channelCode = 'required';
    } else if (command.channelCode.length > 100) {
      errors.channelCode = 'must not exceed 100 characters';
    }
    if (!command.channelName || command.channelName.trim().length === 0) {
      errors.channelName = 'required';
    } else if (command.channelName.length > 255) {
      errors.channelName = 'must not exceed 255 characters';
    }
    if (!command.channelType || !Object.values(CHANNEL_TYPE).includes(command.channelType)) {
      errors.channelType = 'must be a valid channel type (EMAIL, SMS, PUSH, etc.)';
    }
    if (command.priority !== undefined && (command.priority < 0 || command.priority > 1000)) {
      errors.priority = 'must be between 0 and 1000';
    }
    if (command.configurationMetadata) {
      NotificationChannel.validateConfigMetadata(command.configurationMetadata, errors);
    }

    if (Object.keys(errors).length > 0) {
      throw new ChannelValidationError(errors);
    }
  }

  private static validateMetadataUpdate(command: UpdateChannelMetadataCommand): void {
    const errors: Record<string, string> = {};

    if (!command.channelId || command.channelId.trim().length === 0) {
      errors.channelId = 'required';
    }
    if (!command.tenantId || command.tenantId.trim().length === 0) {
      errors.tenantId = 'required';
    }
    if (command.channelName !== undefined && (!command.channelName || command.channelName.trim().length === 0)) {
      errors.channelName = 'required';
    } else if (command.channelName && command.channelName.length > 255) {
      errors.channelName = 'must not exceed 255 characters';
    }
    if (command.priority !== undefined && (command.priority < 0 || command.priority > 1000)) {
      errors.priority = 'must be between 0 and 1000';
    }
    if (command.configurationMetadata) {
      NotificationChannel.validateConfigMetadata(command.configurationMetadata, errors);
    }

    if (Object.keys(errors).length > 0) {
      throw new ChannelValidationError(errors);
    }
  }

  /**
   * Enforces security boundary check (RC-002).
   * Checks configuration metadata for fields that suggest passwords or credentials.
   */
  private static validateConfigMetadata(metadata: Record<string, unknown>, errors: Record<string, string>): void {
    const sensitiveKeys = ['secret', 'password', 'token', 'apikey', 'privatekey', 'passphrase', 'credential', 'oauth'];
    const keys = Object.keys(metadata);

    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(s => lowerKey.includes(s))) {
        errors.configurationMetadata = `Security violation: sensitive configuration field '${key}' is not allowed in channel metadata. Store credentials in ProviderProfile (CC-005) instead.`;
        break;
      }
    }
  }
}
