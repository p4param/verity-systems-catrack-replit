/**
 * EWP-006 Domain Unit Tests — DeliveryTracking & TrackingTimeline
 * Governed by CC-006, ES-008
 */

import { DeliveryTracking } from "../DeliveryTracking";
import { TrackingTimeline } from "../value-objects/TrackingTimeline";
import {
  InvalidTrackingStateTransitionException,
  TrackingArchivedException,
} from "../DeliveryTrackingErrors";

describe("DeliveryTracking Domain Aggregate & TrackingTimeline VO", () => {
  const defaultProps = {
    notificationId: "11111111-1111-1111-1111-111111111111",
    tenantId: "22222222-2222-2222-2222-222222222222",
    correlationId: "33333333-3333-3333-3333-333333333333",
    providerProfileId: "44444444-4444-4444-4444-444444444444",
  };

  describe("TrackingTimeline Value Object (AR-013, AR-016)", () => {
    it("appends timeline entries in chronological order and exposes exclusive VO methods", () => {
      let timeline = new TrackingTimeline();
      expect(timeline.count()).toBe(0);
      expect(timeline.latest()).toBeNull();

      timeline = timeline.append({
        eventType: "TrackingStarted",
        timestamp: new Date("2026-07-22T10:00:00Z"),
      });

      timeline = timeline.append({
        eventType: "AcknowledgementReceived",
        timestamp: new Date("2026-07-22T10:00:05Z"),
        details: { ackId: "ACK-123" },
      });

      expect(timeline.count()).toBe(2);
      expect(timeline.latest()?.eventType).toBe("AcknowledgementReceived");
      expect(timeline.entries().length).toBe(2);

      const json = timeline.toJSON();
      expect(json.length).toBe(2);
      expect(json[1].eventType).toBe("AcknowledgementReceived");
    });
  });

  describe("DeliveryTracking Aggregate Root Invariants & State Machine", () => {
    it("instantiates tracking in TRACKING_STARTED status and appends initial TrackingStarted timeline entry", () => {
      const tracking = DeliveryTracking.create(defaultProps);

      expect(tracking.id).toBeDefined();
      expect(tracking.trackingStatus).toBe("TRACKING_STARTED");
      expect(tracking.correlationId).toBe(defaultProps.correlationId);

      const timeline = tracking.trackingTimeline;
      expect(timeline.count()).toBe(1);
      expect(timeline.latest()?.eventType).toBe("TrackingStarted");

      const events = tracking.popDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe("TrackingStarted");
    });

    it("recordAcknowledgement transitions state TRACKING_STARTED -> TRACKING_ACTIVE and emits AcknowledgementReceivedEvent", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      tracking.popDomainEvents();

      const ackDate = new Date("2026-07-22T10:01:00Z");
      tracking.recordAcknowledgement("SG-ACK-8888", "DELIVERED_TO_GATEWAY", ackDate, undefined, "system");

      expect(tracking.trackingStatus).toBe("TRACKING_ACTIVE");
      expect(tracking.providerAcknowledgementId).toBe("SG-ACK-8888");
      expect(tracking.providerTimestamp).toEqual(ackDate);
      expect(tracking.trackingTimeline.count()).toBe(2);

      const events = tracking.popDomainEvents();
      expect(events.some((e) => e.eventType === "AcknowledgementReceived")).toBe(true);
    });

    it("recordDeliveryConfirmation transitions state -> TRACKING_COMPLETED and emits DeliveryConfirmedEvent", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      tracking.recordAcknowledgement("SG-ACK-8888", "DELIVERED", new Date());
      tracking.popDomainEvents();

      const delivDate = new Date("2026-07-22T10:02:00Z");
      tracking.recordDeliveryConfirmation(delivDate, { channel: "EMAIL" }, "user-1");

      expect(tracking.trackingStatus).toBe("TRACKING_COMPLETED");
      expect(tracking.deliveryTimestamp).toEqual(delivDate);
      expect(tracking.trackingTimeline.count()).toBe(3);

      const events = tracking.popDomainEvents();
      expect(events.some((e) => e.eventType === "DeliveryConfirmed")).toBe(true);
    });

    it("recordReadConfirmation appends ReadReceiptReceived to timeline without altering completed status", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      tracking.recordAcknowledgement("SG-ACK-8888", "DELIVERED", new Date());
      tracking.recordDeliveryConfirmation(new Date());

      const readDate = new Date("2026-07-22T10:05:00Z");
      tracking.recordReadConfirmation(readDate, { userAgent: "Mozilla/5.0" }, "user-1");

      expect(tracking.readTimestamp).toEqual(readDate);
      expect(tracking.trackingTimeline.latest()?.eventType).toBe("ReadReceiptReceived");
    });

    it("archive transitions completed tracking to terminal ARCHIVED status and locks aggregate", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      tracking.recordAcknowledgement("SG-ACK-8888", "DELIVERED", new Date());
      tracking.recordDeliveryConfirmation(new Date());
      tracking.popDomainEvents();

      tracking.archive("admin-user");

      expect(tracking.trackingStatus).toBe("ARCHIVED");

      const events = tracking.popDomainEvents();
      expect(events.some((e) => e.eventType === "TrackingArchived")).toBe(true);
    });

    it("enforces terminal ARCHIVED state immutability", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      tracking.recordAcknowledgement("SG-ACK-8888", "DELIVERED", new Date());
      tracking.recordDeliveryConfirmation(new Date());
      tracking.archive();

      expect(() =>
        tracking.recordAcknowledgement("NEW-ACK", "STATUS", new Date())
      ).toThrow(TrackingArchivedException);

      expect(() =>
        tracking.recordDeliveryConfirmation(new Date())
      ).toThrow(TrackingArchivedException);

      expect(() =>
        tracking.recordReadConfirmation(new Date())
      ).toThrow(TrackingArchivedException);

      expect(() =>
        tracking.appendTimelineEntry({ eventType: "CustomEvent", timestamp: new Date() })
      ).toThrow(TrackingArchivedException);

      expect(() => tracking.archive()).toThrow(TrackingArchivedException);
    });

    it("blocks archive from non-completed tracking state", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      expect(() => tracking.archive()).toThrow(InvalidTrackingStateTransitionException);
    });

    it("enforces providerAcknowledgementId immutability once recorded", () => {
      const tracking = DeliveryTracking.create(defaultProps);
      tracking.recordAcknowledgement("ACK-1", "STATUS", new Date());

      expect(() =>
        tracking.recordAcknowledgement("ACK-2", "STATUS", new Date())
      ).toThrow("ProviderAcknowledgementId is immutable once recorded");
    });
  });
});
