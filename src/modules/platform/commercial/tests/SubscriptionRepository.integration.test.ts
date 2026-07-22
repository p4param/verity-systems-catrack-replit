/**
 * VS08B Commercial Foundation — Subscription Repository Integration Tests
 */
import { PrismaClient } from "@/generated/client";
import { Subscription } from "../domain/Subscription";
import { SubscriptionRepository } from "../repositories/SubscriptionRepository";
import { SubscriptionService } from "../services/SubscriptionService";
import {
  SubscriptionConcurrencyConflictError,
  SubscriptionNotFoundError,
  SubscriptionValidationError,
} from "../domain/errors/SubscriptionErrors";

const prisma = new PrismaClient();
const repository = new SubscriptionRepository(prisma);
const service = new SubscriptionService(repository, prisma);

describe("Subscription Repository & Service Integration", () => {
  let tenantId: string;
  const subscriptionPlanId = "00000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    // Create a prerequisite active Tenant for testing
    const tenant = await prisma.tenant.create({
      data: {
        code: `TNT-SUB-${Date.now()}`,
        name: `Tenant Subscription Test ${Date.now()}`,
        displayName: "Tenant Sub Test",
        status: "Active",
      },
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    // Clean up created tenant subscriptions and tenant
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId },
    });
    await prisma.tenant.delete({
      where: { id: tenantId },
    });
    await prisma.$disconnect();
  });

  it("creates, persists, and retrieves a Subscription", async () => {
    const code = `SUB-COMM-${Date.now()}`;
    const created = await service.createSubscription({
      tenantId,
      subscriptionPlanId,
      code,
      name: "Commercial Plan A",
      renewalPolicy: "AUTO_RENEW",
      externalReferenceId: "SUB_EXT_1001",
    });

    expect(created.id).toBeDefined();
    expect(created.code).toBe(code);
    expect(created.status).toBe("Draft");

    const fetched = await repository.getById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.code).toBe(code);
    expect(fetched?.externalReferenceId).toBe("SUB_EXT_1001");
  });

  it("enforces unique subscription code per tenant", async () => {
    const code = `SUB-UNIQ-${Date.now()}`;
    await service.createSubscription({
      tenantId,
      subscriptionPlanId,
      code,
      name: "Unique Code Sub 1",
    });

    await expect(
      service.createSubscription({
        tenantId,
        subscriptionPlanId,
        code,
        name: "Unique Code Sub 2",
      })
    ).rejects.toThrow(SubscriptionValidationError);
  });

  it("handles lifecycle state transitions and persistence", async () => {
    const code = `SUB-LIFE-${Date.now()}`;
    const sub = await service.createSubscription({
      tenantId,
      subscriptionPlanId,
      code,
      name: "Lifecycle Test Sub",
    });

    const actorId = "00000000-0000-0000-0000-000000000001";

    // 1. Activate
    const activated = await service.activateSubscription(sub.id, actorId);
    expect(activated.status).toBe("Active");

    // 2. Suspend
    const suspended = await service.suspendSubscription(sub.id, actorId);
    expect(suspended.status).toBe("Suspended");

    // 3. Resume
    const resumed = await service.resumeSubscription(sub.id, actorId);
    expect(resumed.status).toBe("Active");

    // 4. Cancel
    const cancelled = await service.cancelSubscription(sub.id, actorId);
    expect(cancelled.status).toBe("Cancelled");
    expect(cancelled.cancelledAt).not.toBeNull();

    // 5. Archive
    const archived = await service.archiveSubscription(sub.id, actorId);
    expect(archived.status).toBe("Archived");
  });

  it("queries active subscriptions via listActiveByTenant", async () => {
    const codeActive = `SUB-ACT-${Date.now()}`;
    const codeTrial = `SUB-TRL-${Date.now()}`;
    const codeDraft = `SUB-DFT-${Date.now()}`;

    const subActive = await service.createSubscription({ tenantId, subscriptionPlanId, code: codeActive, name: "Active" });
    await service.activateSubscription(subActive.id);

    const subTrial = await service.createSubscription({ tenantId, subscriptionPlanId, code: codeTrial, name: "Trial" });
    await service.startTrial(subTrial.id, new Date(Date.now() + 86400000));

    await service.createSubscription({ tenantId, subscriptionPlanId, code: codeDraft, name: "Draft" });

    const activeList = await repository.listActiveByTenant(tenantId);
    const activeCodes = activeList.map((s) => s.code);

    expect(activeCodes).toContain(codeActive);
    expect(activeCodes).toContain(codeTrial);
    expect(activeCodes).not.toContain(codeDraft);
  });

  it("queries expiring subscriptions via listExpiring", async () => {
    const codeExpiringSoon = `SUB-EXP-${Date.now()}`;
    const expiringDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    const sub = await service.createSubscription({
      tenantId,
      subscriptionPlanId,
      code: codeExpiringSoon,
      name: "Expiring Soon",
      endDate: expiringDate,
    });
    await service.activateSubscription(sub.id);

    const expiringList = await repository.listExpiring(7); // within 7 days
    const codes = expiringList.map((s) => s.code);

    expect(codes).toContain(codeExpiringSoon);
  });

  it("detects optimistic concurrency conflicts on update", async () => {
    const code = `SUB-CONC-${Date.now()}`;
    const sub = await service.createSubscription({
      tenantId,
      subscriptionPlanId,
      code,
      name: "Concurrency Sub",
    });

    const instanceA = await repository.getById(sub.id);
    const instanceB = await repository.getById(sub.id);

    expect(instanceA).not.toBeNull();
    expect(instanceB).not.toBeNull();

    instanceA!.activate();
    await repository.update(instanceA!);

    instanceB!.activate();
    await expect(repository.update(instanceB!)).rejects.toThrow(SubscriptionConcurrencyConflictError);
  });

  it("enforces soft delete isolation", async () => {
    const code = `SUB-DEL-${Date.now()}`;
    const sub = await service.createSubscription({
      tenantId,
      subscriptionPlanId,
      code,
      name: "Soft Delete Sub",
    });

    const actorId = "00000000-0000-0000-0000-000000000001";
    await service.softDeleteSubscription(sub.id, actorId);

    const fetched = await repository.getById(sub.id);
    expect(fetched).toBeNull();

    await expect(service.activateSubscription(sub.id)).rejects.toThrow(SubscriptionNotFoundError);
  });

});
