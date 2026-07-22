/**
 * VS08B Commercial Foundation — Subscription Repository Interface
 */
import type { Subscription, SubscriptionStatus } from "../domain/Subscription";

export interface ISubscriptionRepository {
  create(subscription: Subscription): Promise<Subscription>;
  update(subscription: Subscription): Promise<Subscription>;
  getById(id: string): Promise<Subscription | null>;
  getByCode(tenantId: string, code: string): Promise<Subscription | null>;
  listByTenant(tenantId: string): Promise<Subscription[]>;
  listActiveByTenant(tenantId: string): Promise<Subscription[]>;
  listExpiring(withinDays: number): Promise<Subscription[]>;
  listByStatus(tenantId: string, status: SubscriptionStatus): Promise<Subscription[]>;
  softDelete(id: string, actorUserId?: string): Promise<void>;
  exists(tenantId: string, code: string): Promise<boolean>;
}
