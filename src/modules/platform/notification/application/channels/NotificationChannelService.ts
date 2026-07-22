// VS09 EWP-002: NotificationChannelService application service
// Orchestrates command validation, domain aggregate execution, persistence, and domain event dispatch.

import type { INotificationChannelRepository } from '../../domain/channels/INotificationChannelRepository';
import { NotificationChannel } from '../../domain/channels/NotificationChannel';
import type {
  NotificationChannelRecord,
  CreateChannelCommand,
  UpdateChannelMetadataCommand,
  ActivateChannelCommand,
  SuspendChannelCommand,
  ArchiveChannelCommand,
  EnableChannelCommand,
  DisableChannelCommand,
  SetDefaultChannelCommand,
} from '../../domain/channels/NotificationChannelModels';
import {
  NotificationChannelNotFoundError,
  DuplicateChannelCodeError,
} from '../../domain/channels/NotificationChannelErrors';
import type { NotificationChannelDomainEvent } from '../../domain/channels/NotificationChannelEvents';

export interface IDomainEventPublisher {
  publish(event: NotificationChannelDomainEvent): Promise<void>;
  publishAll(events: NotificationChannelDomainEvent[]): Promise<void>;
}

export class NotificationChannelService {
  constructor(
    private readonly repository: INotificationChannelRepository,
    private readonly eventPublisher?: IDomainEventPublisher
  ) {}

  // ─── Command Use Cases ───────────────────────────────────────────────────

  /**
   * Creates a new NotificationChannel aggregate and persists it.
   */
  async createChannel(command: CreateChannelCommand): Promise<NotificationChannelRecord> {
    const exists = await this.repository.existsChannelCode(command.tenantId, command.channelCode);
    if (exists) {
      throw new DuplicateChannelCodeError(command.channelCode);
    }

    const channel = NotificationChannel.create(command);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Updates channel metadata and business configuration parameters.
   */
  async updateChannelMetadata(command: UpdateChannelMetadataCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    channel.updateMetadata(command);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Transitions channel DRAFT/SUSPENDED -> ACTIVE.
   */
  async activateChannel(command: ActivateChannelCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    channel.activate(command.actorUserId);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Transitions channel ACTIVE -> SUSPENDED.
   */
  async suspendChannel(command: SuspendChannelCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    channel.suspend(command.actorUserId);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Transitions channel ACTIVE/SUSPENDED -> ARCHIVED (terminal state).
   */
  async archiveChannel(command: ArchiveChannelCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    channel.archive(command.actorUserId);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Toggles isEnabled = true.
   */
  async enableChannel(command: EnableChannelCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    channel.enable(command.actorUserId);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Toggles isEnabled = false.
   */
  async disableChannel(command: DisableChannelCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    channel.disable(command.actorUserId);
    await this.repository.save(channel);
    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  /**
   * Sets the channel as default and unsets other defaults (RC-003).
   */
  async setDefaultChannel(command: SetDefaultChannelCommand): Promise<NotificationChannelRecord> {
    const channel = await this.getChannelOrThrow(command.channelId, command.tenantId);

    // Update aggregate status
    channel.setDefault(true, command.actorUserId);

    // Save and clear other defaults
    await this.repository.save(channel);
    await this.repository.clearOtherDefaults(command.tenantId, channel.channelType, channel.id);

    await this.dispatchEvents(channel);

    return channel.toRecord();
  }

  // ─── Query Use Cases ─────────────────────────────────────────────────────

  async getById(id: string, tenantId: string): Promise<NotificationChannelRecord | null> {
    const channel = await this.repository.findById(id, tenantId);
    return channel ? channel.toRecord() : null;
  }

  async getByCode(tenantId: string, channelCode: string): Promise<NotificationChannelRecord | null> {
    const channel = await this.repository.findByCode(tenantId, channelCode);
    return channel ? channel.toRecord() : null;
  }

  async getDefaultChannel(tenantId: string, channelType: string): Promise<NotificationChannelRecord | null> {
    const channel = await this.repository.findDefaultChannel(tenantId, channelType);
    return channel ? channel.toRecord() : null;
  }

  async listActive(tenantId: string, category?: string): Promise<NotificationChannelRecord[]> {
    const channels = await this.repository.listActive(tenantId, category);
    return channels.map(c => c.toRecord());
  }

  async listEnabled(tenantId: string): Promise<NotificationChannelRecord[]> {
    const channels = await this.repository.listEnabled(tenantId);
    return channels.map(c => c.toRecord());
  }

  async listByType(tenantId: string, channelType: string): Promise<NotificationChannelRecord[]> {
    const channels = await this.repository.listByType(tenantId, channelType);
    return channels.map(c => c.toRecord());
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getChannelOrThrow(id: string, tenantId: string): Promise<NotificationChannel> {
    const channel = await this.repository.findById(id, tenantId);
    if (!channel) {
      throw new NotificationChannelNotFoundError(id);
    }
    return channel;
  }

  private async dispatchEvents(channel: NotificationChannel): Promise<void> {
    if (!this.eventPublisher) return;
    const events = channel.pullDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
