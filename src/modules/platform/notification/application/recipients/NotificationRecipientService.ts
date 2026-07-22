/**
 * EWP-004 Application Service — NotificationRecipientService
 * Governed by CC-004, ES-008, ES-009, ES-010
 */

import { INotificationRecipientRepository } from "../../domain/recipients/INotificationRecipientRepository";
import { CreateRecipientProps, NotificationRecipient } from "../../domain/recipients/NotificationRecipient";
import { NotificationRecipientNotFoundError } from "../../domain/recipients/NotificationRecipientErrors";
import { IDomainEvent } from "../../domain/recipients/NotificationRecipientEvents";

export class NotificationRecipientService {
  private publishedEvents: IDomainEvent[] = [];

  constructor(private readonly repository: INotificationRecipientRepository) {}

  public getPublishedEvents(): IDomainEvent[] {
    return [...this.publishedEvents];
  }

  public clearPublishedEvents(): void {
    this.publishedEvents = [];
  }

  async createRecipient(
    props: CreateRecipientProps,
    actorId?: string
  ): Promise<NotificationRecipient> {
    const exists = await this.repository.existsRecipientSequence(
      props.notificationId,
      props.recipientSequence
    );
    if (exists) {
      throw new Error(
        `Sequence ${props.recipientSequence} already exists for notification ${props.notificationId}`
      );
    }

    const recipient = NotificationRecipient.create({
      ...props,
      createdBy: actorId || props.createdBy,
      updatedBy: actorId || props.updatedBy,
    });

    await this.repository.save(recipient);
    this.dispatchEvents(recipient);
    return recipient;
  }

  async markEligible(
    recipientId: string,
    tenantId: string,
    actorId?: string
  ): Promise<NotificationRecipient> {
    const recipient = await this.repository.findById(recipientId, tenantId);
    if (!recipient) throw new NotificationRecipientNotFoundError(recipientId);

    recipient.markEligible(actorId);
    await this.repository.save(recipient);
    this.dispatchEvents(recipient);
    return recipient;
  }

  async suppressRecipient(
    recipientId: string,
    tenantId: string,
    suppressionReason: string,
    actorId?: string
  ): Promise<NotificationRecipient> {
    const recipient = await this.repository.findById(recipientId, tenantId);
    if (!recipient) throw new NotificationRecipientNotFoundError(recipientId);

    recipient.suppress(suppressionReason, actorId);
    await this.repository.save(recipient);
    this.dispatchEvents(recipient);
    return recipient;
  }

  async updateSuppressionReason(
    recipientId: string,
    tenantId: string,
    reason: string,
    actorId?: string
  ): Promise<NotificationRecipient> {
    const recipient = await this.repository.findById(recipientId, tenantId);
    if (!recipient) throw new NotificationRecipientNotFoundError(recipientId);

    recipient.updateSuppressionReason(reason, actorId);
    await this.repository.save(recipient);
    this.dispatchEvents(recipient);
    return recipient;
  }

  async markCompleted(
    recipientId: string,
    tenantId: string,
    actorId?: string
  ): Promise<NotificationRecipient> {
    const recipient = await this.repository.findById(recipientId, tenantId);
    if (!recipient) throw new NotificationRecipientNotFoundError(recipientId);

    recipient.markCompleted(actorId);
    await this.repository.save(recipient);
    this.dispatchEvents(recipient);
    return recipient;
  }

  async getById(id: string, tenantId: string): Promise<NotificationRecipient | null> {
    return this.repository.findById(id, tenantId);
  }

  async listByNotification(
    notificationId: string,
    tenantId: string
  ): Promise<NotificationRecipient[]> {
    return this.repository.listByNotification(notificationId, tenantId);
  }

  async listEligible(
    notificationId: string,
    tenantId: string
  ): Promise<NotificationRecipient[]> {
    return this.repository.listEligible(notificationId, tenantId);
  }

  async listSuppressed(
    notificationId: string,
    tenantId: string
  ): Promise<NotificationRecipient[]> {
    return this.repository.listSuppressed(notificationId, tenantId);
  }

  async listByRecipientUser(
    tenantId: string,
    recipientUserId: string
  ): Promise<NotificationRecipient[]> {
    return this.repository.listByRecipientUser(tenantId, recipientUserId);
  }

  private dispatchEvents(aggregate: NotificationRecipient): void {
    const events = aggregate.popDomainEvents();
    // Enforce strict FIFO ordering upon transaction commit (AR-002)
    for (const event of events) {
      this.publishedEvents.push(event);
    }
  }
}
