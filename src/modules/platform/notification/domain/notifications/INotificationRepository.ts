// VS09 EWP-003: INotificationRepository contract

import type { Notification } from './Notification';

export interface INotificationRepository {
  save(delivery: Notification): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
  findById(id: string, tenantId: string): Promise<Notification | null>;
  findByIntentId(notificationIntentId: string, tenantId: string): Promise<Notification | null>;
  findByCorrelationId(correlationId: string, tenantId: string): Promise<Notification[]>;
  findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<Notification | null>;
  listPendingRetries(nowTimestamp: Date, limit: number): Promise<Notification[]>;
  listDeadLetters(tenantId: string, limit: number): Promise<Notification[]>;
  existsIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<boolean>;
}
