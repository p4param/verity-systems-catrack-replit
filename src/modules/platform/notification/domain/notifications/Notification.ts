// VS09 EWP-003: NotificationDelivery aggregate root

import { randomUUID } from 'crypto';
import type {
  NotificationDeliveryRecord,
  NotificationDeliveryStatus,
  IngestNotificationIntentCommand,
} from './NotificationModels';
import { NOTIFICATION_DELIVERY_STATUS } from './NotificationModels';
import {
  DeliveryValidationError,
  InvalidDeliveryStatusTransitionError,
  RenderedContentImmutableError,
} from './NotificationErrors';
import type { NotificationDomainEvent } from './NotificationEvents';
import { RenderedContent } from './value-objects/RenderedContent';
import { DeliveryAttempt } from './entities/DeliveryAttempt';

export class Notification {
  private readonly _pendingEvents: NotificationDomainEvent[] = [];
  private _record: NotificationDeliveryRecord;
  private readonly _attempts: DeliveryAttempt[];
  private _persistedAttemptCount: number;

  private constructor(record: NotificationDeliveryRecord) {
    this._record = { ...record, attempts: [] };
    this._attempts = (record.attempts ?? []).map(a => DeliveryAttempt.reconstitute(a));
    this._persistedAttemptCount = this._attempts.length;
  }

  get id(): string { return this._record.id; }
  get tenantId(): string { return this._record.tenantId; }
  get deliveryStatus(): NotificationDeliveryStatus { return this._record.deliveryStatus; }
  get retryCount(): number { return this._record.retryCount; }
  get maxRetries(): number { return this._record.maxRetries; }
  get correlationId(): string { return this._record.correlationId; }
  get idempotencyKey(): string { return this._record.idempotencyKey; }
  get providerId(): string | null { return this._record.providerId; }
  get recipientUserId(): string | null { return this._record.recipientUserId; }
  get version(): bigint { return this._record.version; }

  get attempts(): readonly ReturnType<DeliveryAttempt['toRecord']>[] {
    return this._attempts.map(a => a.toRecord());
  }

  get renderedContent(): RenderedContent | null {
    if (!this._record.renderedSubject || !this._record.renderedBody) {
      return null;
    }

    return RenderedContent.reconstitute({
      subject: this._record.renderedSubject,
      body: this._record.renderedBody,
    });
  }

  get canRetry(): boolean {
    return this._record.retryCount < this._record.maxRetries;
  }

  static ingest(command: IngestNotificationIntentCommand): Notification {
    Notification.validateIngestCommand(command);

    const now = new Date();
    const record: NotificationDeliveryRecord = {
      id: randomUUID(),
      tenantId: command.tenantId,
      workspaceId: command.workspaceId ?? null,
      notificationIntentId: command.notificationIntentId,
      correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey.trim(),
      templateId: command.templateId,
      templateVersion: command.templateVersion.trim(),
      channelId: command.channelId,
      providerId: null,
      recipientUserId: command.recipientUserId ?? null,
      recipientEndpoint: command.recipientEndpoint.trim(),
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.Queued,
      retryCount: 0,
      maxRetries: command.maxRetries ?? 3,
      nextAttemptAt: null,
      renderedSubject: null,
      renderedBody: null,
      failureReason: null,
      dispatchedAt: null,
      acceptedAt: null,
      deliveredAt: null,
      createdAt: now,
      createdBy: command.actorUserId,
      updatedAt: now,
      updatedBy: command.actorUserId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: BigInt(1),
      attempts: [],
    };

    const aggregate = new Notification(record);
    aggregate._pendingEvents.push({
      type: 'NotificationIngested',
      deliveryId: record.id,
      tenantId: record.tenantId,
      idempotencyKey: record.idempotencyKey,
      correlationId: record.correlationId,
      channelId: record.channelId,
      createdAt: now,
    });

    return aggregate;
  }

  static reconstitute(record: NotificationDeliveryRecord): Notification {
    return new Notification({ ...record });
  }

  markProcessing(actorUserId: string): void {
    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.Processing);
    this.touch(actorUserId);
  }

  recordRenderedContent(renderedSubject: string, renderedBody: string, actorUserId: string): void {
    if (this.renderedContent) {
      throw new RenderedContentImmutableError(this._record.id);
    }

    const content = RenderedContent.create(renderedSubject, renderedBody);
    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.Rendered);
    const now = new Date();

    this._record = {
      ...this._record,
      renderedSubject: content.subject,
      renderedBody: content.body,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type: 'NotificationRendered',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      templateId: this._record.templateId,
      templateVersion: this._record.templateVersion,
      renderedAt: now,
    });
  }

  dispatchToProvider(providerId: string, actorUserId: string): void {
    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.Dispatched);
    const now = new Date();

    this._record = {
      ...this._record,
      providerId,
      dispatchedAt: now,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type: 'NotificationDispatched',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      providerId,
      channelId: this._record.channelId,
      dispatchedAt: now,
    });
  }

  recordProviderAcceptance(providerReceiptId: string, actorUserId: string): void {
    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.ProviderAccepted);
    const now = new Date();

    this._record = {
      ...this._record,
      acceptedAt: now,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type: 'NotificationAcceptedByProvider',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      providerId: this._record.providerId,
      providerReceiptId,
      acceptedAt: now,
    });
  }

  recordDeliverySuccess(actorUserId: string, deliveredAt?: Date, responseCode?: string): void {
    if (
      this._record.deliveryStatus !== NOTIFICATION_DELIVERY_STATUS.Dispatched &&
      this._record.deliveryStatus !== NOTIFICATION_DELIVERY_STATUS.ProviderAccepted
    ) {
      throw new InvalidDeliveryStatusTransitionError(
        this._record.deliveryStatus,
        NOTIFICATION_DELIVERY_STATUS.Delivered
      );
    }

    const now = deliveredAt ?? new Date();
    this._record = {
      ...this._record,
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.Delivered,
      deliveredAt: now,
      nextAttemptAt: null,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this.appendAttempt(NOTIFICATION_DELIVERY_STATUS.Delivered, {
      responseCode,
      attemptedAt: now,
      completedAt: now,
    });

    this._pendingEvents.push({
      type: 'NotificationDelivered',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      recipientUserId: this._record.recipientUserId,
      deliveredAt: now,
    });
  }

  recordDeliveryFailure(
    failureReason: string,
    actorUserId: string,
    responseCode?: string,
    errorDetails?: string,
  ): void {
    const current = this._record.deliveryStatus;
    if (
      current !== NOTIFICATION_DELIVERY_STATUS.Processing &&
      current !== NOTIFICATION_DELIVERY_STATUS.Dispatched &&
      current !== NOTIFICATION_DELIVERY_STATUS.ProviderAccepted
    ) {
      throw new InvalidDeliveryStatusTransitionError(current, NOTIFICATION_DELIVERY_STATUS.Failed);
    }

    if (!failureReason || !failureReason.trim()) {
      throw new DeliveryValidationError({ failureReason: 'failureReason is required' });
    }

    const now = new Date();
    this._record = {
      ...this._record,
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.Failed,
      retryCount: this._record.retryCount + 1,
      nextAttemptAt: null,
      failureReason: failureReason.trim(),
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this.appendAttempt(NOTIFICATION_DELIVERY_STATUS.Failed, {
      responseCode,
      errorDetails,
      attemptedAt: now,
      completedAt: now,
    });

    this._pendingEvents.push({
      type: 'NotificationDeliveryFailed',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      failureReason: this._record.failureReason,
      retryCount: this._record.retryCount,
      failedAt: now,
    });
  }

  scheduleRetry(nextAttemptAt: Date, actorUserId: string): void {
    if (this._record.deliveryStatus !== NOTIFICATION_DELIVERY_STATUS.Failed) {
      throw new InvalidDeliveryStatusTransitionError(
        this._record.deliveryStatus,
        NOTIFICATION_DELIVERY_STATUS.Queued
      );
    }

    if (!this.canRetry) {
      throw new DeliveryValidationError({ retryCount: 'max retries exceeded' });
    }

    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.Queued);
    const now = new Date();

    this._record = {
      ...this._record,
      nextAttemptAt,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type: 'NotificationRetryScheduled',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      retryCount: this._record.retryCount,
      nextAttemptAt,
    });
  }

  moveToDeadLetter(actorUserId: string, failureReason?: string): void {
    if (this._record.deliveryStatus !== NOTIFICATION_DELIVERY_STATUS.Failed) {
      throw new InvalidDeliveryStatusTransitionError(
        this._record.deliveryStatus,
        NOTIFICATION_DELIVERY_STATUS.DeadLetter
      );
    }

    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.DeadLetter);
    const now = new Date();

    this._record = {
      ...this._record,
      failureReason: failureReason?.trim() ?? this._record.failureReason,
      nextAttemptAt: null,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type: 'NotificationMovedToDeadLetter',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      failureReason: this._record.failureReason,
      deadLetteredAt: now,
    });
  }

  replayDeadLetter(actorUserId: string): void {
    if (this._record.deliveryStatus !== NOTIFICATION_DELIVERY_STATUS.DeadLetter) {
      throw new InvalidDeliveryStatusTransitionError(
        this._record.deliveryStatus,
        NOTIFICATION_DELIVERY_STATUS.Queued
      );
    }

    this.transitionTo(NOTIFICATION_DELIVERY_STATUS.Queued);
    const now = new Date();

    this._record = {
      ...this._record,
      nextAttemptAt: null,
      failureReason: null,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };

    this._pendingEvents.push({
      type: 'NotificationDeadLetterReplayed',
      deliveryId: this._record.id,
      tenantId: this._record.tenantId,
      replayedBy: actorUserId,
      replayedAt: now,
    });
  }

  recordSuppression(actorUserId: string, reason?: string): void {
    const current = this._record.deliveryStatus;
    if (
      current !== NOTIFICATION_DELIVERY_STATUS.Processing &&
      current !== NOTIFICATION_DELIVERY_STATUS.Rendered
    ) {
      throw new InvalidDeliveryStatusTransitionError(current, NOTIFICATION_DELIVERY_STATUS.Suppressed);
    }

    const now = new Date();
    this._record = {
      ...this._record,
      deliveryStatus: NOTIFICATION_DELIVERY_STATUS.Suppressed,
      failureReason: reason?.trim() ?? this._record.failureReason,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };
  }

  pullDomainEvents(): NotificationDomainEvent[] {
    const events = [...this._pendingEvents];
    this._pendingEvents.length = 0;
    return events;
  }

  pullNewAttemptRecords(): ReturnType<DeliveryAttempt['toRecord']>[] {
    return this._attempts.slice(this._persistedAttemptCount).map(a => a.toRecord());
  }

  markAttemptsPersisted(): void {
    this._persistedAttemptCount = this._attempts.length;
  }

  toRecord(): NotificationDeliveryRecord {
    return {
      ...this._record,
      attempts: this._attempts.map(a => a.toRecord()),
    };
  }

  private appendAttempt(
    status: NotificationDeliveryStatus,
    options: {
      responseCode?: string;
      errorDetails?: string;
      attemptedAt?: Date;
      completedAt?: Date;
    }
  ): void {
    const nextNumber = this._attempts.length + 1;

    this._attempts.push(
      DeliveryAttempt.create({
        deliveryId: this._record.id,
        attemptNumber: nextNumber,
        providerId: this._record.providerId,
        status,
        responseCode: options.responseCode ?? null,
        errorDetails: options.errorDetails ?? null,
        attemptedAt: options.attemptedAt,
        completedAt: options.completedAt,
      })
    );
  }

  private touch(actorUserId: string): void {
    const now = new Date();
    this._record = {
      ...this._record,
      updatedAt: now,
      updatedBy: actorUserId,
      version: this._record.version + BigInt(1),
    };
  }

  private transitionTo(next: NotificationDeliveryStatus): void {
    const current = this._record.deliveryStatus;
    if (current === next) return;

    const allowed: Record<NotificationDeliveryStatus, NotificationDeliveryStatus[]> = {
      QUEUED: [NOTIFICATION_DELIVERY_STATUS.Processing],
      PROCESSING: [NOTIFICATION_DELIVERY_STATUS.Rendered, NOTIFICATION_DELIVERY_STATUS.Failed, NOTIFICATION_DELIVERY_STATUS.Suppressed],
      RENDERED: [NOTIFICATION_DELIVERY_STATUS.Dispatched, NOTIFICATION_DELIVERY_STATUS.Suppressed],
      DISPATCHED: [NOTIFICATION_DELIVERY_STATUS.ProviderAccepted, NOTIFICATION_DELIVERY_STATUS.Delivered, NOTIFICATION_DELIVERY_STATUS.Failed],
      PROVIDER_ACCEPTED: [NOTIFICATION_DELIVERY_STATUS.Delivered, NOTIFICATION_DELIVERY_STATUS.Failed],
      DELIVERED: [],
      SUPPRESSED: [],
      FAILED: [NOTIFICATION_DELIVERY_STATUS.Queued, NOTIFICATION_DELIVERY_STATUS.DeadLetter],
      DEAD_LETTER: [NOTIFICATION_DELIVERY_STATUS.Queued],
    };

    if (!allowed[current].includes(next)) {
      throw new InvalidDeliveryStatusTransitionError(current, next);
    }

    this._record = {
      ...this._record,
      deliveryStatus: next,
    };
  }

  private static validateIngestCommand(command: IngestNotificationIntentCommand): void {
    const fields: Record<string, string> = {};

    if (!command.tenantId) fields.tenantId = 'tenantId is required';
    if (!command.notificationIntentId) fields.notificationIntentId = 'notificationIntentId is required';
    if (!command.correlationId) fields.correlationId = 'correlationId is required';
    if (!command.idempotencyKey || !command.idempotencyKey.trim()) fields.idempotencyKey = 'idempotencyKey is required';
    if (!command.templateId) fields.templateId = 'templateId is required';
    if (!command.templateVersion || !command.templateVersion.trim()) fields.templateVersion = 'templateVersion is required';
    if (!command.channelId) fields.channelId = 'channelId is required';
    if (!command.recipientEndpoint || !command.recipientEndpoint.trim()) fields.recipientEndpoint = 'recipientEndpoint is required';
    if (!command.actorUserId) fields.actorUserId = 'actorUserId is required';

    if (command.maxRetries !== undefined && command.maxRetries < 0) {
      fields.maxRetries = 'maxRetries must be >= 0';
    }

    if (Object.keys(fields).length > 0) {
      throw new DeliveryValidationError(fields);
    }
  }
}
