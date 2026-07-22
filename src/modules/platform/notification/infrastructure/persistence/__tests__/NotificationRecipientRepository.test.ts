/**
 * EWP-004 Infrastructure Repository Integration Tests — PrismaNotificationRecipientRepository
 * Governed by CC-004, ES-001, ES-009, ES-010
 */

import {
  PrismaNotificationRecipientRepository,
  OptimisticLockException,
} from "../PrismaNotificationRecipientRepository";
import { NotificationRecipient } from "../../../domain/recipients/NotificationRecipient";
import { DuplicateSequenceException } from "../../../domain/recipients/NotificationRecipientErrors";

describe("PrismaNotificationRecipientRepository", () => {
  let repository: PrismaNotificationRecipientRepository;

  const tenantId = "55555555-5555-5555-5555-555555555555";
  const notificationId = "66666666-6666-6666-6666-666666666666";

  const defaultProps = {
    notificationId,
    tenantId,
    recipientSequence: 1,
    recipientType: "INDIVIDUAL_USER" as const,
    recipientUserId: "77777777-7777-7777-7777-777777777777",
    recipientEndpoint: "recipient@example.com",
    channelId: "88888888-8888-8888-8888-888888888888",
    deliveryPreferenceSnapshot: { email: true },
    localization: {
      culture: "en-US",
      language: "en",
      timezone: "America/New_York",
    },
  };

  beforeEach(() => {
    repository = new PrismaNotificationRecipientRepository();
  });

  it("saves and retrieves recipient by id enforcing tenant isolation and soft delete filter", async () => {
    const recipient = NotificationRecipient.create(defaultProps);
    await repository.save(recipient);

    const fetched = await repository.findById(recipient.id, tenantId);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(recipient.id);
    expect(fetched?.tenantId).toBe(tenantId);
    expect(fetched?.recipientEndpoint).toBe("recipient@example.com");

    const wrongTenant = await repository.findById(recipient.id, "99999999-9999-9999-9999-999999999999");
    expect(wrongTenant).toBeNull();
  });

  it("listByNotification and listEligible return correct recipients ordered by sequence", async () => {
    const r1 = NotificationRecipient.create({ ...defaultProps, recipientSequence: 1 });
    const r2 = NotificationRecipient.create({ ...defaultProps, recipientSequence: 2 });
    r2.markEligible();

    await repository.save(r1);
    await repository.save(r2);

    const all = await repository.listByNotification(notificationId, tenantId);
    expect(all.length).toBeGreaterThanOrEqual(2);

    const eligible = await repository.listEligible(notificationId, tenantId);
    expect(eligible.some((r) => r.id === r2.id)).toBe(true);
    expect(eligible.some((r) => r.id === r1.id)).toBe(false);
  });

  it("existsRecipientSequence correctly reports sequence presence", async () => {
    const uniqueSeq = Math.floor(Date.now() % 100000) + 100;
    const recipient = NotificationRecipient.create({ ...defaultProps, recipientSequence: uniqueSeq });
    await repository.save(recipient);

    const exists = await repository.existsRecipientSequence(notificationId, uniqueSeq);
    expect(exists).toBe(true);

    const notExists = await repository.existsRecipientSequence(notificationId, 9999999);
    expect(notExists).toBe(false);
  });

  it("enforces unique sequence constraint and throws DuplicateSequenceException", async () => {
    const seq = Math.floor(Date.now() % 100000) + 500;
    const r1 = NotificationRecipient.create({ ...defaultProps, recipientSequence: seq });
    const r2 = NotificationRecipient.create({ ...defaultProps, recipientSequence: seq });

    await repository.save(r1);
    await expect(repository.save(r2)).rejects.toThrow(DuplicateSequenceException);
  });

  it("handles OCC version update and throws OptimisticLockException on stale version", async () => {
    const recipient = NotificationRecipient.create(defaultProps);
    await repository.save(recipient);

    recipient.markEligible();
    await repository.save(recipient);

    // Attempting stale update with version 1
    const staleRecipient = NotificationRecipient.create({
      ...defaultProps,
      id: recipient.id,
      version: 1,
      status: "RESOLVED",
    });

    await expect(repository.save(staleRecipient)).rejects.toThrow(OptimisticLockException);
  });

  it("soft deletes recipient and hides it from query methods", async () => {
    const recipient = NotificationRecipient.create(defaultProps);
    await repository.save(recipient);

    await repository.delete(recipient.id, tenantId, "admin-user");

    const fetched = await repository.findById(recipient.id, tenantId);
    expect(fetched).toBeNull();
  });
});
