/**
 * VS08B Commercial Foundation — Subscription Repository Prisma Implementation
 */
import { PrismaClient } from "@/generated/client";
import {
  RenewalPolicy,
  Subscription,
  SubscriptionStatus,
} from "../domain/Subscription";
import {
  SubscriptionConcurrencyConflictError,
  SubscriptionNotFoundError,
} from "../domain/errors/SubscriptionErrors";
import type { ISubscriptionRepository } from "./ISubscriptionRepository";

export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: any): Subscription {
    return Subscription.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      subscriptionPlanId: record.subscriptionPlanId,
      code: record.code,
      name: record.name,
      renewalPolicy: record.renewalPolicy as RenewalPolicy,
      externalReferenceId: record.externalReferenceId,
      status: record.status as SubscriptionStatus,
      startDate: record.startDate,
      endDate: record.endDate,
      trialEndDate: record.trialEndDate,
      renewedAt: record.renewedAt,
      cancelledAt: record.cancelledAt,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      isDeleted: record.isDeleted,
      deletedAt: record.deletedAt,
      deletedBy: record.deletedBy,
      version: BigInt(record.version),
    });
  }

  async create(subscription: Subscription): Promise<Subscription> {
    const record = await this.prisma.tenantSubscription.create({
      data: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        subscriptionPlanId: subscription.subscriptionPlanId,
        code: subscription.code,
        name: subscription.name,
        renewalPolicy: subscription.renewalPolicy,
        externalReferenceId: subscription.externalReferenceId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialEndDate: subscription.trialEndDate,
        renewedAt: subscription.renewedAt,
        cancelledAt: subscription.cancelledAt,
        createdAt: subscription.createdAt,
        createdBy: subscription.createdBy,
        updatedAt: subscription.updatedAt,
        updatedBy: subscription.updatedBy,
        isDeleted: subscription.isDeleted,
        deletedAt: subscription.deletedAt,
        deletedBy: subscription.deletedBy,
        version: subscription.version,
      },
    });

    return this.mapToDomain(record);
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const existing = await this.prisma.tenantSubscription.findFirst({
      where: { id: subscription.id, isDeleted: false },
    });

    if (!existing) {
      throw new SubscriptionNotFoundError(subscription.id);
    }

    if (BigInt(existing.version) !== subscription.version) {
      throw new SubscriptionConcurrencyConflictError(
        subscription.id,
        subscription.version,
        BigInt(existing.version)
      );
    }

    const updated = await this.prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        name: subscription.name,
        renewalPolicy: subscription.renewalPolicy,
        externalReferenceId: subscription.externalReferenceId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialEndDate: subscription.trialEndDate,
        renewedAt: subscription.renewedAt,
        cancelledAt: subscription.cancelledAt,
        updatedAt: new Date(),
        updatedBy: subscription.updatedBy,
        isDeleted: subscription.isDeleted,
        deletedAt: subscription.deletedAt,
        deletedBy: subscription.deletedBy,
        version: { increment: 1 },
      },
    });

    return this.mapToDomain(updated);
  }

  async getById(id: string): Promise<Subscription | null> {
    const record = await this.prisma.tenantSubscription.findFirst({
      where: { id, isDeleted: false },
    });

    return record ? this.mapToDomain(record) : null;
  }

  async getByCode(tenantId: string, code: string): Promise<Subscription | null> {
    const record = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
        isDeleted: false,
      },
    });

    return record ? this.mapToDomain(record) : null;
  }

  async listByTenant(tenantId: string): Promise<Subscription[]> {
    const records = await this.prisma.tenantSubscription.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async listActiveByTenant(tenantId: string): Promise<Subscription[]> {
    const records = await this.prisma.tenantSubscription.findMany({
      where: {
        tenantId,
        status: { in: ["Active", "Trial"] },
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async listExpiring(withinDays: number): Promise<Subscription[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const records = await this.prisma.tenantSubscription.findMany({
      where: {
        isDeleted: false,
        status: { in: ["Active", "Trial"] },
        endDate: {
          not: null,
          lte: threshold,
        },
      },
      orderBy: { endDate: "asc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async listByStatus(tenantId: string, status: SubscriptionStatus): Promise<Subscription[]> {
    const records = await this.prisma.tenantSubscription.findMany({
      where: { tenantId, status, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async softDelete(id: string, actorUserId?: string): Promise<void> {
    const existing = await this.prisma.tenantSubscription.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new SubscriptionNotFoundError(id);
    }

    await this.prisma.tenantSubscription.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: actorUserId ?? null,
        updatedAt: new Date(),
        updatedBy: actorUserId ?? null,
        version: { increment: 1 },
      },
    });
  }


  async exists(tenantId: string, code: string): Promise<boolean> {
    const count = await this.prisma.tenantSubscription.count({
      where: {
        tenantId,
        code: code.toUpperCase(),
        isDeleted: false,
      },
    });

    return count > 0;
  }
}
