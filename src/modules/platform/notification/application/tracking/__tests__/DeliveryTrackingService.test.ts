/**
 * EWP-006 Application Service Unit Tests — DeliveryTrackingService
 * Governed by CC-006, ES-008, ES-009, ES-010
 */

import { DeliveryTrackingService } from "../DeliveryTrackingService";
import { IDeliveryTrackingRepository } from "../../../domain/tracking/IDeliveryTrackingRepository";
import { DeliveryTracking } from "../../../domain/tracking/DeliveryTracking";
import { DeliveryTrackingNotFoundError } from "../../../domain/tracking/DeliveryTrackingErrors";

class InMemoryDeliveryTrackingRepository implements IDeliveryTrackingRepository {
  private items: Map<string, DeliveryTracking> = new Map();

  async findById(id: string, tenantId: string): Promise<DeliveryTracking | null> {
    const item = this.items.get(id);
    if (!item || item.tenantId !== tenantId || item.isDeleted) return null;
    return item;
  }

  async findByNotification(notificationId: string, tenantId: string): Promise<DeliveryTracking | null> {
    return Array.from(this.items.values()).find(
      (t) => t.notificationId === notificationId && t.tenantId === tenantId && !t.isDeleted
    ) || null;
  }

  async findByCorrelationId(correlationId: string, tenantId: string): Promise<DeliveryTracking | null> {
    return Array.from(this.items.values()).find(
      (t) => t.correlationId === correlationId && t.tenantId === tenantId && !t.isDeleted
    ) || null;
  }

  async listPendingAcknowledgements(tenantId: string, limit: number): Promise<DeliveryTracking[]> {
    return Array.from(this.items.values())
      .filter((t) => t.tenantId === tenantId && t.trackingStatus === "TRACKING_STARTED" && !t.isDeleted)
      .slice(0, limit);
  }

  async listCompletedTracking(tenantId: string, limit: number): Promise<DeliveryTracking[]> {
    return Array.from(this.items.values())
      .filter((t) => t.tenantId === tenantId && t.trackingStatus === "TRACKING_COMPLETED" && !t.isDeleted)
      .slice(0, limit);
  }

  async existsTracking(notificationId: string): Promise<boolean> {
    return Array.from(this.items.values()).some(
      (t) => t.notificationId === notificationId && !t.isDeleted
    );
  }

  async save(tracking: DeliveryTracking): Promise<void> {
    this.items.set(tracking.id, tracking);
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const item = this.items.get(id);
    if (item && item.tenantId === tenantId) {
      item.softDelete(deletedBy);
    }
  }
}

describe("DeliveryTrackingService", () => {
  let service: DeliveryTrackingService;
  let repository: InMemoryDeliveryTrackingRepository;

  const tenantId = "aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const notificationId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const correlationId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  const defaultProps = {
    notificationId,
    tenantId,
    correlationId,
    providerProfileId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  };

  beforeEach(() => {
    repository = new InMemoryDeliveryTrackingRepository();
    service = new DeliveryTrackingService(repository);
  });

  it("startTracking orchestrates creation and publishes TrackingStartedEvent upon commit", async () => {
    const tracking = await service.startTracking(defaultProps, "actor-1");

    expect(tracking.id).toBeDefined();
    expect(tracking.trackingStatus).toBe("TRACKING_STARTED");
    expect(tracking.createdBy).toBe("actor-1");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("TrackingStarted");
  });

  it("recordAcknowledgement records provider receipt and publishes AcknowledgementReceivedEvent", async () => {
    const tracking = await service.startTracking(defaultProps, "actor-1");
    service.clearPublishedEvents();

    const ackTimestamp = new Date("2026-07-22T10:10:00Z");
    const updated = await service.recordAcknowledgement(
      tracking.id,
      tenantId,
      "ACK-TWILIO-99",
      "SENT_TO_GATEWAY",
      ackTimestamp,
      undefined,
      "actor-2"
    );

    expect(updated.trackingStatus).toBe("TRACKING_ACTIVE");
    expect(updated.providerAcknowledgementId).toBe("ACK-TWILIO-99");
    expect(updated.providerTimestamp).toEqual(ackTimestamp);

    const events = service.getPublishedEvents();
    expect(events.some((e) => e.eventType === "AcknowledgementReceived")).toBe(true);
  });

  it("recordDeliveryConfirmation updates status to TRACKING_COMPLETED and publishes DeliveryConfirmedEvent", async () => {
    const tracking = await service.startTracking(defaultProps, "actor-1");
    await service.recordAcknowledgement(tracking.id, tenantId, "ACK-1", "SENT", new Date());
    service.clearPublishedEvents();

    const delivTimestamp = new Date("2026-07-22T10:11:00Z");
    const updated = await service.recordDeliveryConfirmation(
      tracking.id,
      tenantId,
      delivTimestamp,
      { channel: "SMS" },
      "actor-3"
    );

    expect(updated.trackingStatus).toBe("TRACKING_COMPLETED");
    expect(updated.deliveryTimestamp).toEqual(delivTimestamp);

    const events = service.getPublishedEvents();
    expect(events.some((e) => e.eventType === "DeliveryConfirmed")).toBe(true);
  });

  it("appendTimelineEvent appends entry and publishes TimelineEventAppendedEvent", async () => {
    const tracking = await service.startTracking(defaultProps, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.appendTimelineEvent(
      tracking.id,
      tenantId,
      { eventType: "VendorCallback", timestamp: new Date(), details: { code: 200 } },
      "actor-1"
    );

    expect(updated.trackingTimeline.count()).toBe(2);
    expect(updated.trackingTimeline.latest()?.eventType).toBe("VendorCallback");

    const events = service.getPublishedEvents();
    expect(events.some((e) => e.eventType === "TimelineEventAppended")).toBe(true);
  });

  it("archiveTracking transitions to ARCHIVED state and publishes TrackingArchivedEvent", async () => {
    const tracking = await service.startTracking(defaultProps, "actor-1");
    await service.recordAcknowledgement(tracking.id, tenantId, "ACK-1", "SENT", new Date());
    await service.recordDeliveryConfirmation(tracking.id, tenantId, new Date());
    service.clearPublishedEvents();

    const updated = await service.archiveTracking(tracking.id, tenantId, "actor-4");

    expect(updated.trackingStatus).toBe("ARCHIVED");

    const events = service.getPublishedEvents();
    expect(events.some((e) => e.eventType === "TrackingArchived")).toBe(true);
  });

  it("throws DeliveryTrackingNotFoundError on non-existent trackingId", async () => {
    await expect(
      service.recordDeliveryConfirmation("invalid-id", tenantId, new Date())
    ).rejects.toThrow(DeliveryTrackingNotFoundError);
  });
});
