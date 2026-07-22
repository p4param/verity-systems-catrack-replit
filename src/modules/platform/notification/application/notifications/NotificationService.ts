// VS09 EWP-003: NotificationService application service

import type { INotificationRepository } from '../../domain/notifications/INotificationRepository';
import { Notification } from '../../domain/notifications/Notification';
import type {
  NotificationDeliveryRecord,
  IngestNotificationIntentCommand,
  MarkProcessingCommand,
  RecordRenderedContentCommand,
  DispatchToProviderCommand,
  RecordProviderAcceptanceCommand,
  RecordDeliverySuccessCommand,
  RecordDeliveryFailureCommand,
  ScheduleRetryCommand,
  MoveToDeadLetterCommand,
  ReplayDeadLetterCommand,
  RecordSuppressionCommand,
} from '../../domain/notifications/NotificationModels';
import {
  DeliveryValidationError,
  DuplicateIdempotencyException,
  NotificationDeliveryNotFoundError,
} from '../../domain/notifications/NotificationErrors';
import type { NotificationDomainEvent } from '../../domain/notifications/NotificationEvents';

export interface IDomainEventPublisher {
  publish(event: NotificationDomainEvent): Promise<void>;
  publishAll(events: NotificationDomainEvent[]): Promise<void>;
}

export class NotificationService {
  constructor(
    private readonly repository: INotificationRepository,
    private readonly eventPublisher?: IDomainEventPublisher,
  ) {}

  async ingestNotificationIntent(
    command: IngestNotificationIntentCommand,
  ): Promise<NotificationDeliveryRecord> {
    const exists = await this.repository.existsIdempotencyKey(
      command.tenantId,
      command.idempotencyKey,
    );

    if (exists) {
      throw new DuplicateIdempotencyException(command.tenantId, command.idempotencyKey);
    }

    const delivery = Notification.ingest(command);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async markProcessing(command: MarkProcessingCommand): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.markProcessing(command.actorUserId);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async recordRenderedContent(
    command: RecordRenderedContentCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.recordRenderedContent(
      command.renderedSubject,
      command.renderedBody,
      command.actorUserId,
    );

    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async dispatchToProvider(
    command: DispatchToProviderCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.dispatchToProvider(command.providerId, command.actorUserId);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async recordProviderAcceptance(
    command: RecordProviderAcceptanceCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.recordProviderAcceptance(command.providerReceiptId, command.actorUserId);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async recordDeliverySuccess(
    command: RecordDeliverySuccessCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.recordDeliverySuccess(
      command.actorUserId,
      command.deliveredAt,
      command.responseCode,
    );

    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async recordDeliveryFailure(
    command: RecordDeliveryFailureCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.recordDeliveryFailure(
      command.failureReason,
      command.actorUserId,
      command.responseCode,
      command.errorDetails,
    );

    if (command.isTransient && delivery.canRetry) {
      if (!command.nextAttemptAt) {
        throw new DeliveryValidationError({
          nextAttemptAt: 'nextAttemptAt is required for transient retry scheduling',
        });
      }
      delivery.scheduleRetry(command.nextAttemptAt, command.actorUserId);
    } else if (!delivery.canRetry || !command.isTransient) {
      delivery.moveToDeadLetter(command.actorUserId, command.failureReason);
    }

    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async scheduleRetry(command: ScheduleRetryCommand): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.scheduleRetry(command.nextAttemptAt, command.actorUserId);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async moveToDeadLetter(
    command: MoveToDeadLetterCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.moveToDeadLetter(command.actorUserId, command.failureReason);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async replayDeadLetter(
    command: ReplayDeadLetterCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.replayDeadLetter(command.actorUserId);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async recordSuppression(
    command: RecordSuppressionCommand,
  ): Promise<NotificationDeliveryRecord> {
    const delivery = await this.getDeliveryOrThrow(command.deliveryId, command.tenantId);

    delivery.recordSuppression(command.actorUserId, command.reason);
    await this.repository.save(delivery);
    await this.dispatchEvents(delivery);

    return delivery.toRecord();
  }

  async getById(id: string, tenantId: string): Promise<NotificationDeliveryRecord | null> {
    const delivery = await this.repository.findById(id, tenantId);
    return delivery ? delivery.toRecord() : null;
  }

  async getByIntentId(
    notificationIntentId: string,
    tenantId: string,
  ): Promise<NotificationDeliveryRecord | null> {
    const delivery = await this.repository.findByIntentId(notificationIntentId, tenantId);
    return delivery ? delivery.toRecord() : null;
  }

  async getByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<NotificationDeliveryRecord | null> {
    const delivery = await this.repository.findByIdempotencyKey(tenantId, idempotencyKey);
    return delivery ? delivery.toRecord() : null;
  }

  async listPendingRetries(nowTimestamp: Date, limit: number): Promise<NotificationDeliveryRecord[]> {
    const rows = await this.repository.listPendingRetries(nowTimestamp, limit);
    return rows.map(row => row.toRecord());
  }

  async listDeadLetters(tenantId: string, limit: number): Promise<NotificationDeliveryRecord[]> {
    const rows = await this.repository.listDeadLetters(tenantId, limit);
    return rows.map(row => row.toRecord());
  }

  private async getDeliveryOrThrow(deliveryId: string, tenantId: string): Promise<Notification> {
    const delivery = await this.repository.findById(deliveryId, tenantId);

    if (!delivery) {
      throw new NotificationDeliveryNotFoundError(deliveryId);
    }

    return delivery;
  }

  private async dispatchEvents(delivery: Notification): Promise<void> {
    if (!this.eventPublisher) return;

    const events = delivery.pullDomainEvents();
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events);
    }
  }
}
