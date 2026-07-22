/**
 * EWP-006 Application Service — DeliveryTrackingService
 * Governed by CC-006, ES-008, ES-009, ES-010
 */

import { IDeliveryTrackingRepository } from "../../domain/tracking/IDeliveryTrackingRepository";
import { CreateDeliveryTrackingProps, DeliveryTracking } from "../../domain/tracking/DeliveryTracking";
import { DeliveryTrackingNotFoundError, DuplicateTrackingException } from "../../domain/tracking/DeliveryTrackingErrors";
import { IDomainEvent } from "../../domain/tracking/DeliveryTrackingEvents";
import { TimelineEntryProps } from "../../domain/tracking/value-objects/TrackingTimeline";

export class DeliveryTrackingService {
  private publishedEvents: IDomainEvent[] = [];

  constructor(private readonly repository: IDeliveryTrackingRepository) {}

  public getPublishedEvents(): IDomainEvent[] {
    return [...this.publishedEvents];
  }

  public clearPublishedEvents(): void {
    this.publishedEvents = [];
  }

  async startTracking(
    props: CreateDeliveryTrackingProps,
    actorId?: string
  ): Promise<DeliveryTracking> {
    const exists = await this.repository.existsTracking(props.notificationId);
    if (exists) {
      throw new DuplicateTrackingException(props.notificationId);
    }

    const tracking = DeliveryTracking.create({
      ...props,
      createdBy: actorId || props.createdBy,
      updatedBy: actorId || props.updatedBy,
    });

    // Save aggregate first
    await this.repository.save(tracking);
    // Dispatch events only after successful commit (AR-015: Ghost Event Prevention)
    this.dispatchEvents(tracking);
    return tracking;
  }

  async recordAcknowledgement(
    trackingId: string,
    tenantId: string,
    providerAcknowledgementId: string,
    providerStatus: string,
    providerTimestamp: Date,
    providerProfileId?: string,
    actorId?: string
  ): Promise<DeliveryTracking> {
    const tracking = await this.repository.findById(trackingId, tenantId);
    if (!tracking) throw new DeliveryTrackingNotFoundError(trackingId);

    tracking.recordAcknowledgement(
      providerAcknowledgementId,
      providerStatus,
      providerTimestamp,
      providerProfileId,
      actorId
    );

    await this.repository.save(tracking);
    this.dispatchEvents(tracking);
    return tracking;
  }

  async recordDeliveryConfirmation(
    trackingId: string,
    tenantId: string,
    deliveryTimestamp: Date,
    details?: Record<string, any>,
    actorId?: string
  ): Promise<DeliveryTracking> {
    const tracking = await this.repository.findById(trackingId, tenantId);
    if (!tracking) throw new DeliveryTrackingNotFoundError(trackingId);

    tracking.recordDeliveryConfirmation(deliveryTimestamp, details, actorId);
    await this.repository.save(tracking);
    this.dispatchEvents(tracking);
    return tracking;
  }

  async recordReadConfirmation(
    trackingId: string,
    tenantId: string,
    readTimestamp: Date,
    details?: Record<string, any>,
    actorId?: string
  ): Promise<DeliveryTracking> {
    const tracking = await this.repository.findById(trackingId, tenantId);
    if (!tracking) throw new DeliveryTrackingNotFoundError(trackingId);

    tracking.recordReadConfirmation(readTimestamp, details, actorId);
    await this.repository.save(tracking);
    this.dispatchEvents(tracking);
    return tracking;
  }

  async appendTimelineEvent(
    trackingId: string,
    tenantId: string,
    entryProps: TimelineEntryProps,
    actorId?: string
  ): Promise<DeliveryTracking> {
    const tracking = await this.repository.findById(trackingId, tenantId);
    if (!tracking) throw new DeliveryTrackingNotFoundError(trackingId);

    tracking.appendTimelineEntry(entryProps, actorId);
    await this.repository.save(tracking);
    this.dispatchEvents(tracking);
    return tracking;
  }

  async archiveTracking(
    trackingId: string,
    tenantId: string,
    actorId?: string
  ): Promise<DeliveryTracking> {
    const tracking = await this.repository.findById(trackingId, tenantId);
    if (!tracking) throw new DeliveryTrackingNotFoundError(trackingId);

    tracking.archive(actorId);
    await this.repository.save(tracking);
    this.dispatchEvents(tracking);
    return tracking;
  }

  async getById(id: string, tenantId: string): Promise<DeliveryTracking | null> {
    return this.repository.findById(id, tenantId);
  }

  async getByNotification(
    notificationId: string,
    tenantId: string
  ): Promise<DeliveryTracking | null> {
    return this.repository.findByNotification(notificationId, tenantId);
  }

  async getByCorrelationId(
    correlationId: string,
    tenantId: string
  ): Promise<DeliveryTracking | null> {
    return this.repository.findByCorrelationId(correlationId, tenantId);
  }

  async listPendingAcknowledgements(
    tenantId: string,
    limit = 50
  ): Promise<DeliveryTracking[]> {
    return this.repository.listPendingAcknowledgements(tenantId, limit);
  }

  async listCompletedTracking(
    tenantId: string,
    limit = 50
  ): Promise<DeliveryTracking[]> {
    return this.repository.listCompletedTracking(tenantId, limit);
  }

  private dispatchEvents(aggregate: DeliveryTracking): void {
    const events = aggregate.popDomainEvents();
    // Enforce strict FIFO ordering upon transaction commit (AR-006, AR-015)
    for (const event of events) {
      this.publishedEvents.push(event);
    }
  }
}
