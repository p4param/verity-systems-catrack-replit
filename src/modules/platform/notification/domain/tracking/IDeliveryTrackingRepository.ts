/**
 * EWP-006 Domain Repository Interface — DeliveryTracking
 * Governed by CC-006, ES-001, ES-009
 */

import { DeliveryTracking } from "./DeliveryTracking";

export interface IDeliveryTrackingRepository {
  findById(id: string, tenantId: string): Promise<DeliveryTracking | null>;
  findByNotification(notificationId: string, tenantId: string): Promise<DeliveryTracking | null>;
  findByCorrelationId(correlationId: string, tenantId: string): Promise<DeliveryTracking | null>;
  listPendingAcknowledgements(tenantId: string, limit: number): Promise<DeliveryTracking[]>;
  listCompletedTracking(tenantId: string, limit: number): Promise<DeliveryTracking[]>;
  existsTracking(notificationId: string): Promise<boolean>;
  save(tracking: DeliveryTracking): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
