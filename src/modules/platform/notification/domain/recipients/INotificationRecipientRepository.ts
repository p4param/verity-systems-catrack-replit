/**
 * EWP-004 Domain Repository Interface — NotificationRecipient
 * Governed by CC-004, ES-001, ES-009
 */

import { NotificationRecipient } from "./NotificationRecipient";

export interface INotificationRecipientRepository {
  findById(id: string, tenantId: string): Promise<NotificationRecipient | null>;
  listByNotification(notificationId: string, tenantId: string): Promise<NotificationRecipient[]>;
  listEligible(notificationId: string, tenantId: string): Promise<NotificationRecipient[]>;
  listSuppressed(notificationId: string, tenantId: string): Promise<NotificationRecipient[]>;
  listByRecipientUser(tenantId: string, recipientUserId: string): Promise<NotificationRecipient[]>;
  existsRecipientSequence(notificationId: string, recipientSequence: number): Promise<boolean>;
  save(recipient: NotificationRecipient): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
