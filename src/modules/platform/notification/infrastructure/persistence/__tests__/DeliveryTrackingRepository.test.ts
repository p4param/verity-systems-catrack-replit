/**
 * EWP-006 Infrastructure Repository Integration Tests — PrismaDeliveryTrackingRepository
 * Governed by CC-006, ES-001, ES-009, ES-010
 */

import {
  PrismaDeliveryTrackingRepository,
  OptimisticLockException,
} from "../PrismaDeliveryTrackingRepository";
import { DeliveryTracking } from "../../../domain/tracking/DeliveryTracking";
import { DuplicateTrackingException } from "../../../domain/tracking/DeliveryTrackingErrors";

describe("PrismaDeliveryTrackingRepository", () => {
  let repository: PrismaDeliveryTrackingRepository;

  const tenantId = "33333333-3333-3333-3333-333333333333";
  const notificationId = "44444444-4444-4444-4444-444444444444";
  const correlationId = "55555555-5555-5555-5555-555555555555";

  const defaultProps = {
    notificationId,
    tenantId,
    correlationId,
    providerProfileId: "66666666-6666-6666-6666-666666666666",
  };

  beforeEach(() => {
    repository = new PrismaDeliveryTrackingRepository();
  });

  it("saves and retrieves tracking record by id enforcing tenant isolation and soft delete filter", async () => {
    const tracking = DeliveryTracking.create(defaultProps);
    await repository.save(tracking);

    const fetched = await repository.findById(tracking.id, tenantId);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(tracking.id);
    expect(fetched?.notificationId).toBe(notificationId);
    expect(fetched?.trackingTimeline.count()).toBe(1);

    const wrongTenant = await repository.findById(tracking.id, "99999999-9999-9999-9999-999999999999");
    expect(wrongTenant).toBeNull();
  });

  it("findByNotification and findByCorrelationId retrieve correct record", async () => {
    const tracking = DeliveryTracking.create(defaultProps);
    await repository.save(tracking);

    const byNotif = await repository.findByNotification(notificationId, tenantId);
    expect(byNotif?.id).toBe(tracking.id);

    const byCorr = await repository.findByCorrelationId(correlationId, tenantId);
    expect(byCorr?.id).toBe(tracking.id);
  });

  it("existsTracking correctly reports notification tracking presence", async () => {
    const notifUuid = "77777777-7777-7777-7777-777777777777";
    const tracking = DeliveryTracking.create({ ...defaultProps, notificationId: notifUuid });
    await repository.save(tracking);

    const exists = await repository.existsTracking(notifUuid);
    expect(exists).toBe(true);

    const notExists = await repository.existsTracking("88888888-8888-8888-8888-888888888888");
    expect(notExists).toBe(false);
  });

  it("enforces 1-to-1 unique notification constraint and throws DuplicateTrackingException", async () => {
    const notifUuid = "99999999-9999-9999-9999-999999999999";
    const t1 = DeliveryTracking.create({ ...defaultProps, notificationId: notifUuid });
    const t2 = DeliveryTracking.create({ ...defaultProps, notificationId: notifUuid, correlationId: crypto.randomUUID() });

    await repository.save(t1);
    await expect(repository.save(t2)).rejects.toThrow(DuplicateTrackingException);
  });

  it("handles OCC version update and throws OptimisticLockException on stale version", async () => {
    const tracking = DeliveryTracking.create(defaultProps);
    await repository.save(tracking);

    tracking.recordAcknowledgement("ACK-100", "SENT", new Date());
    await repository.save(tracking);

    // Stale update with version 1
    const staleTracking = DeliveryTracking.create({
      ...defaultProps,
      id: tracking.id,
      version: 1,
      trackingStatus: "TRACKING_STARTED",
    });

    await expect(repository.save(staleTracking)).rejects.toThrow(OptimisticLockException);
  });

  it("soft deletes tracking record and hides it from queries", async () => {
    const tracking = DeliveryTracking.create(defaultProps);
    await repository.save(tracking);

    await repository.delete(tracking.id, tenantId, "admin-user");

    const fetched = await repository.findById(tracking.id, tenantId);
    expect(fetched).toBeNull();
  });
});
