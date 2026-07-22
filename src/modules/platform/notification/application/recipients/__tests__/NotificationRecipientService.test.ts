/**
 * EWP-004 Application Service Unit Tests — NotificationRecipientService
 * Governed by CC-004, ES-008, ES-009, ES-010
 */

import { NotificationRecipientService } from "../NotificationRecipientService";
import { INotificationRecipientRepository } from "../../../domain/recipients/INotificationRecipientRepository";
import { NotificationRecipient } from "../../../domain/recipients/NotificationRecipient";
import { NotificationRecipientNotFoundError } from "../../../domain/recipients/NotificationRecipientErrors";

class InMemoryNotificationRecipientRepository implements INotificationRecipientRepository {
  private items: Map<string, NotificationRecipient> = new Map();

  async findById(id: string, tenantId: string): Promise<NotificationRecipient | null> {
    const item = this.items.get(id);
    if (!item || item.tenantId !== tenantId || item.isDeleted) return null;
    return item;
  }

  async listByNotification(notificationId: string, tenantId: string): Promise<NotificationRecipient[]> {
    return Array.from(this.items.values()).filter(
      (r) => r.notificationId === notificationId && r.tenantId === tenantId && !r.isDeleted
    );
  }

  async listEligible(notificationId: string, tenantId: string): Promise<NotificationRecipient[]> {
    return Array.from(this.items.values()).filter(
      (r) => r.notificationId === notificationId && r.tenantId === tenantId && r.status === "ELIGIBLE" && !r.isDeleted
    );
  }

  async listSuppressed(notificationId: string, tenantId: string): Promise<NotificationRecipient[]> {
    return Array.from(this.items.values()).filter(
      (r) => r.notificationId === notificationId && r.tenantId === tenantId && r.status === "SUPPRESSED" && !r.isDeleted
    );
  }

  async listByRecipientUser(tenantId: string, recipientUserId: string): Promise<NotificationRecipient[]> {
    return Array.from(this.items.values()).filter(
      (r) => r.tenantId === tenantId && r.recipientUserId === recipientUserId && !r.isDeleted
    );
  }

  async existsRecipientSequence(notificationId: string, recipientSequence: number): Promise<boolean> {
    return Array.from(this.items.values()).some(
      (r) => r.notificationId === notificationId && r.recipientSequence === recipientSequence && !r.isDeleted
    );
  }

  async save(recipient: NotificationRecipient): Promise<void> {
    this.items.set(recipient.id, recipient);
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const item = this.items.get(id);
    if (item && item.tenantId === tenantId) {
      item.softDelete(deletedBy);
    }
  }
}

describe("NotificationRecipientService", () => {
  let service: NotificationRecipientService;
  let repository: InMemoryNotificationRecipientRepository;

  const tenantId = "aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const notificationId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  const defaultCreateProps = {
    notificationId,
    tenantId,
    recipientSequence: 1,
    recipientType: "INDIVIDUAL_USER" as const,
    recipientUserId: "user-100",
    recipientEndpoint: "service-user@example.com",
    channelId: "channel-200",
    deliveryPreferenceSnapshot: { email: true },
    localization: {
      culture: "en-US",
      language: "en",
      timezone: "UTC",
    },
  };

  beforeEach(() => {
    repository = new InMemoryNotificationRecipientRepository();
    service = new NotificationRecipientService(repository);
  });

  it("createRecipient orchestrates aggregate creation and publishes RecipientResolvedEvent", async () => {
    const recipient = await service.createRecipient(defaultCreateProps, "actor-1");

    expect(recipient.id).toBeDefined();
    expect(recipient.status).toBe("RESOLVED");
    expect(recipient.createdBy).toBe("actor-1");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientResolved");
  });

  it("createRecipient throws error on sequence collision", async () => {
    await service.createRecipient(defaultCreateProps, "actor-1");

    await expect(
      service.createRecipient({ ...defaultCreateProps, recipientSequence: 1 }, "actor-1")
    ).rejects.toThrow("Sequence 1 already exists for notification");
  });

  it("markEligible orchestrates state transition and publishes RecipientEligibleEvent", async () => {
    const recipient = await service.createRecipient(defaultCreateProps, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.markEligible(recipient.id, tenantId, "actor-2");

    expect(updated.status).toBe("ELIGIBLE");
    expect(updated.updatedBy).toBe("actor-2");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientEligible");
  });

  it("suppressRecipient orchestrates suppression state and publishes RecipientSuppressedEvent", async () => {
    const recipient = await service.createRecipient(defaultCreateProps, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.suppressRecipient(
      recipient.id,
      tenantId,
      "Opted out of promo category",
      "actor-2"
    );

    expect(updated.status).toBe("SUPPRESSED");
    expect(updated.suppressionReason).toBe("Opted out of promo category");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientSuppressed");
  });

  it("markCompleted orchestrates terminal state transition and publishes RecipientCompletedEvent", async () => {
    const recipient = await service.createRecipient(defaultCreateProps, "actor-1");
    await service.markEligible(recipient.id, tenantId, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.markCompleted(recipient.id, tenantId, "actor-3");

    expect(updated.status).toBe("COMPLETED");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientCompleted");
  });

  it("throws NotificationRecipientNotFoundError when querying non-existent recipientId", async () => {
    await expect(
      service.markEligible("missing-id", tenantId, "actor-1")
    ).rejects.toThrow(NotificationRecipientNotFoundError);
  });

  it("listEligible and listSuppressed filter correctly", async () => {
    const r1 = await service.createRecipient(defaultCreateProps, "actor-1");
    const r2 = await service.createRecipient(
      { ...defaultCreateProps, recipientSequence: 2 },
      "actor-1"
    );

    await service.markEligible(r1.id, tenantId);
    await service.suppressRecipient(r2.id, tenantId, "Global opt-out");

    const eligible = await service.listEligible(notificationId, tenantId);
    expect(eligible.length).toBe(1);
    expect(eligible[0].id).toBe(r1.id);

    const suppressed = await service.listSuppressed(notificationId, tenantId);
    expect(suppressed.length).toBe(1);
    expect(suppressed[0].id).toBe(r2.id);
  });
});
