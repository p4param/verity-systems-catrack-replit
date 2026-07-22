/**
 * VS08B Commercial Foundation — Subscription Application Service
 *
 * Orchestrates commercial subscription workflows and enforces application rules.
 *
 * Future Integration Notice:
 *   Lifecycle mutation methods (activate, suspend, resume, cancel, renew, expire)
 *   serve as commercial state triggers. In CC-014 (Commercial Publish Pipeline),
 *   these actions will publish a new immutable CommercialManifest for runtime consumption.
 */
import { PrismaClient } from "@/generated/client";
import { CreateSubscriptionProps, RenewalPolicy, Subscription, SubscriptionStatus } from "../domain/Subscription";
import { SubscriptionNotFoundError, SubscriptionValidationError } from "../domain/errors/SubscriptionErrors";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository";

export interface CreateSubscriptionDTO {
  tenantId: string;
  subscriptionPlanId: string;
  code: string;
  name: string;
  renewalPolicy?: RenewalPolicy;
  externalReferenceId?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  trialEndDate?: Date | null;
  createdBy?: string | null;
}

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Creates a new Subscription for a Tenant in Draft state.
   */
  async createSubscription(dto: CreateSubscriptionDTO): Promise<Subscription> {
    // 1. Verify Tenant exists and is Active
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, isDeleted: false },
    });

    if (!tenant) {
      throw new SubscriptionValidationError(`Tenant "${dto.tenantId}" not found.`);
    }

    if (tenant.status !== "Active" && tenant.status !== "Provisioning") {
      throw new SubscriptionValidationError(
        `Cannot create subscription for Tenant in status "${tenant.status}". Must be Active or Provisioning.`
      );
    }

    // 2. Verify unique code per Tenant
    const exists = await this.subscriptionRepo.exists(dto.tenantId, dto.code);
    if (exists) {
      throw new SubscriptionValidationError(
        `Subscription code "${dto.code.toUpperCase()}" already exists for Tenant "${dto.tenantId}".`
      );
    }

    // 3. Instantiate Domain Aggregate Root
    const subscription = Subscription.create({
      tenantId: dto.tenantId,
      subscriptionPlanId: dto.subscriptionPlanId,
      code: dto.code,
      name: dto.name,
      renewalPolicy: dto.renewalPolicy,
      externalReferenceId: dto.externalReferenceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      trialEndDate: dto.trialEndDate,
      createdBy: dto.createdBy,
    });

    // 4. Persist
    return await this.subscriptionRepo.create(subscription);
  }

  /**
   * Transitions subscription to Trial state.
   */
  async startTrial(id: string, trialEndDate: Date, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.startTrial(trialEndDate, actorUserId);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Activates a subscription.
   */
  async activateSubscription(id: string, actorUserId?: string, newEndDate?: Date): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.activate(actorUserId, newEndDate);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Suspends an active subscription.
   */
  async suspendSubscription(id: string, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.suspend(actorUserId);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Resumes a suspended subscription.
   */
  async resumeSubscription(id: string, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.resume(actorUserId);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Cancels a subscription.
   */
  async cancelSubscription(id: string, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.cancel(actorUserId);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Expires a subscription.
   */
  async expireSubscription(id: string, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.expire(actorUserId);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Renews a subscription with a new end date.
   */
  async renewSubscription(id: string, newEndDate: Date, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.renew(newEndDate, actorUserId);
    const updated = await this.subscriptionRepo.update(subscription);

    // [Future Trigger: Commercial Publish Pipeline CC-014]
    return updated;
  }

  /**
   * Archives an expired or cancelled subscription.
   */
  async archiveSubscription(id: string, actorUserId?: string): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.archive(actorUserId);
    return await this.subscriptionRepo.update(subscription);
  }

  /**
   * Updates non-lifecycle details of a subscription.
   */
  async updateDetails(
    id: string,
    details: { name?: string; renewalPolicy?: RenewalPolicy; externalReferenceId?: string | null },
    actorUserId?: string
  ): Promise<Subscription> {
    const subscription = await this.mustGetById(id);
    subscription.updateDetails(details, actorUserId);
    return await this.subscriptionRepo.update(subscription);
  }

  /**
   * Retrieves a subscription by ID.
   */
  async getSubscriptionById(id: string): Promise<Subscription | null> {
    return await this.subscriptionRepo.getById(id);
  }

  /**
   * Retrieves a subscription by tenant ID and code.
   */
  async getSubscriptionByCode(tenantId: string, code: string): Promise<Subscription | null> {
    return await this.subscriptionRepo.getByCode(tenantId, code);
  }

  /**
   * Lists all subscriptions for a tenant.
   */
  async listTenantSubscriptions(tenantId: string): Promise<Subscription[]> {
    return await this.subscriptionRepo.listByTenant(tenantId);
  }

  /**
   * Lists active & trial subscriptions for a tenant.
   */
  async listActiveSubscriptions(tenantId: string): Promise<Subscription[]> {
    return await this.subscriptionRepo.listActiveByTenant(tenantId);
  }

  /**
   * Lists active subscriptions expiring within N days.
   */
  async listExpiringSubscriptions(withinDays: number): Promise<Subscription[]> {
    return await this.subscriptionRepo.listExpiring(withinDays);
  }

  /**
   * Soft deletes a subscription.
   */
  async softDeleteSubscription(id: string, actorUserId?: string): Promise<void> {
    await this.subscriptionRepo.softDelete(id, actorUserId);
  }

  private async mustGetById(id: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.getById(id);
    if (!sub) {
      throw new SubscriptionNotFoundError(id);
    }
    return sub;
  }
}
