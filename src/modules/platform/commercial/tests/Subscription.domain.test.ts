/**
 * VS08B Commercial Foundation — Subscription Domain Aggregate Unit Tests
 */
import { Subscription } from "../domain/Subscription";
import {
  InvalidSubscriptionStateTransitionError,
  SubscriptionImmutableError,
  SubscriptionValidationError,
} from "../domain/errors/SubscriptionErrors";

describe("Subscription Domain Aggregate", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const subscriptionPlanId = "00000000-0000-0000-0000-000000000002";
  const code = "SUB-ENTERPRISE";
  const name = "Enterprise Subscription";

  describe("Factory Method: create()", () => {
    it("creates a subscription in Draft status with default parameters", () => {
      const sub = Subscription.create({
        tenantId,
        subscriptionPlanId,
        code,
        name,
      });

      expect(sub.id).toBeDefined();
      expect(sub.tenantId).toBe(tenantId);
      expect(sub.subscriptionPlanId).toBe(subscriptionPlanId);
      expect(sub.code).toBe("SUB-ENTERPRISE");
      expect(sub.name).toBe("Enterprise Subscription");
      expect(sub.status).toBe("Draft");
      expect(sub.renewalPolicy).toBe("AUTO_RENEW");
      expect(sub.externalReferenceId).toBeNull();
      expect(sub.isDeleted).toBe(false);
      expect(sub.version).toBe(1n);
    });

    it("normalizes code to uppercase and trims strings", () => {
      const sub = Subscription.create({
        tenantId,
        subscriptionPlanId,
        code: "  sub-starter  ",
        name: "  Starter Plan  ",
        externalReferenceId: "  EXT-12345  ",
      });

      expect(sub.code).toBe("SUB-STARTER");
      expect(sub.name).toBe("Starter Plan");
      expect(sub.externalReferenceId).toBe("EXT-12345");
    });

    it("throws error when mandatory fields are missing or empty", () => {
      expect(() =>
        Subscription.create({ tenantId: "", subscriptionPlanId, code, name })
      ).toThrow(SubscriptionValidationError);

      expect(() =>
        Subscription.create({ tenantId, subscriptionPlanId: "", code, name })
      ).toThrow(SubscriptionValidationError);

      expect(() =>
        Subscription.create({ tenantId, subscriptionPlanId, code: "  ", name })
      ).toThrow(SubscriptionValidationError);

      expect(() =>
        Subscription.create({ tenantId, subscriptionPlanId, code, name: "" })
      ).toThrow(SubscriptionValidationError);
    });

    it("throws error if endDate is before or equal to startDate", () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2025-12-31");

      expect(() =>
        Subscription.create({
          tenantId,
          subscriptionPlanId,
          code,
          name,
          startDate,
          endDate,
        })
      ).toThrow(SubscriptionValidationError);
    });
  });

  describe("Lifecycle State Machine Transitions", () => {
    it("transitions Draft → Trial and verifies trialEndDate", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      sub.startTrial(futureDate, "actor-123");

      expect(sub.status).toBe("Trial");
      expect(sub.trialEndDate).toEqual(futureDate);
      expect(sub.updatedBy).toBe("actor-123");
    });

    it("throws when starting trial with a past trialEndDate", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      const pastDate = new Date(Date.now() - 1000);

      expect(() => sub.startTrial(pastDate)).toThrow(SubscriptionValidationError);
    });

    it("transitions Draft → Active and Trial → Active", () => {
      const sub1 = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub1.activate();
      expect(sub1.status).toBe("Active");

      const sub2 = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub2.startTrial(new Date(Date.now() + 86400000));
      sub2.activate();
      expect(sub2.status).toBe("Active");
    });

    it("transitions Active → Suspended → Active (Resume)", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub.activate();
      expect(sub.status).toBe("Active");

      sub.suspend();
      expect(sub.status).toBe("Suspended");

      sub.resume();
      expect(sub.status).toBe("Active");
    });

    it("transitions Active → Expired → Active (Renew)", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub.activate();
      sub.expire();
      expect(sub.status).toBe("Expired");

      const renewalEndDate = new Date(Date.now() + 365 * 86400000);
      sub.renew(renewalEndDate, "actor-456");

      expect(sub.status).toBe("Active");
      expect(sub.endDate).toEqual(renewalEndDate);
      expect(sub.renewedAt).toBeDefined();
    });

    it("transitions Active → Cancelled and sets cancelledAt timestamp", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub.activate();
      sub.cancel("actor-admin");

      expect(sub.status).toBe("Cancelled");
      expect(sub.cancelledAt).toBeDefined();
      expect(sub.updatedBy).toBe("actor-admin");
    });

    it("transitions Expired | Cancelled → Archived", () => {
      const sub1 = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub1.activate();
      sub1.expire();
      sub1.archive();
      expect(sub1.status).toBe("Archived");

      const sub2 = Subscription.create({ tenantId, subscriptionPlanId, code: "SUB-2", name });
      sub2.activate();
      sub2.cancel();
      sub2.archive();
      expect(sub2.status).toBe("Archived");
    });
  });

  describe("Lifecycle Edge Cases & Invariants", () => {
    it("prevents any mutation once in Archived (terminal) state", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });
      sub.activate();
      sub.cancel();
      sub.archive();

      expect(() => sub.activate()).toThrow(SubscriptionImmutableError);
      expect(() => sub.suspend()).toThrow(SubscriptionImmutableError);
      expect(() => sub.cancel()).toThrow(SubscriptionImmutableError);
      expect(() => sub.expire()).toThrow(SubscriptionImmutableError);
      expect(() => sub.renew(new Date(Date.now() + 100000))).toThrow(SubscriptionImmutableError);
      expect(() => sub.updateDetails({ name: "New Name" })).toThrow(SubscriptionImmutableError);
      expect(() => sub.softDelete()).toThrow(SubscriptionImmutableError);
    });

    it("throws InvalidSubscriptionStateTransitionError for illegal state jumps", () => {
      const sub = Subscription.create({ tenantId, subscriptionPlanId, code, name });

      // Draft cannot suspend directly
      expect(() => sub.suspend()).toThrow(InvalidSubscriptionStateTransitionError);

      // Draft cannot archive directly
      expect(() => sub.archive()).toThrow(InvalidSubscriptionStateTransitionError);

      // Draft cannot resume directly
      expect(() => sub.resume()).toThrow(InvalidSubscriptionStateTransitionError);

      sub.activate();
      // Active cannot archive directly without cancel/expire first
      expect(() => sub.archive()).toThrow(InvalidSubscriptionStateTransitionError);
    });
  });
});
