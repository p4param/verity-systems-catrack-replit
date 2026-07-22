// VS09 EWP-003: NotificationDelivery domain models
// Record, enum, command, and query types for NotificationDelivery aggregate.

export const NOTIFICATION_DELIVERY_STATUS = {
  Queued: 'QUEUED',
  Processing: 'PROCESSING',
  Rendered: 'RENDERED',
  Dispatched: 'DISPATCHED',
  ProviderAccepted: 'PROVIDER_ACCEPTED',
  Delivered: 'DELIVERED',
  Suppressed: 'SUPPRESSED',
  Failed: 'FAILED',
  DeadLetter: 'DEAD_LETTER',
} as const;

export type NotificationDeliveryStatus =
  typeof NOTIFICATION_DELIVERY_STATUS[keyof typeof NOTIFICATION_DELIVERY_STATUS];

export interface DeliveryAttemptRecord {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  providerId: string | null;
  status: NotificationDeliveryStatus;
  responseCode: string | null;
  errorDetails: string | null;
  attemptedAt: Date;
  completedAt: Date | null;
}

export interface NotificationDeliveryRecord {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  notificationIntentId: string;
  correlationId: string;
  idempotencyKey: string;
  templateId: string;
  templateVersion: string;
  channelId: string;
  providerId: string | null;
  recipientUserId: string | null;
  recipientEndpoint: string;
  deliveryStatus: NotificationDeliveryStatus;
  retryCount: number;
  maxRetries: number;
  nextAttemptAt: Date | null;
  renderedSubject: string | null;
  renderedBody: string | null;
  failureReason: string | null;
  dispatchedAt: Date | null;
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
  attempts: DeliveryAttemptRecord[];
}

export interface IngestNotificationIntentCommand {
  tenantId: string;
  workspaceId?: string;
  notificationIntentId: string;
  correlationId: string;
  idempotencyKey: string;
  templateId: string;
  templateVersion: string;
  channelId: string;
  recipientUserId?: string;
  recipientEndpoint: string;
  maxRetries?: number;
  actorUserId: string;
}

export interface MarkProcessingCommand {
  deliveryId: string;
  tenantId: string;
  actorUserId: string;
}

export interface RecordRenderedContentCommand {
  deliveryId: string;
  tenantId: string;
  renderedSubject: string;
  renderedBody: string;
  actorUserId: string;
}

export interface DispatchToProviderCommand {
  deliveryId: string;
  tenantId: string;
  providerId: string;
  actorUserId: string;
}

export interface RecordProviderAcceptanceCommand {
  deliveryId: string;
  tenantId: string;
  providerReceiptId: string;
  actorUserId: string;
}

export interface RecordDeliverySuccessCommand {
  deliveryId: string;
  tenantId: string;
  responseCode?: string;
  deliveredAt?: Date;
  actorUserId: string;
}

export interface RecordDeliveryFailureCommand {
  deliveryId: string;
  tenantId: string;
  failureReason: string;
  errorDetails?: string;
  responseCode?: string;
  isTransient: boolean;
  nextAttemptAt?: Date;
  actorUserId: string;
}

export interface ScheduleRetryCommand {
  deliveryId: string;
  tenantId: string;
  nextAttemptAt: Date;
  actorUserId: string;
}

export interface MoveToDeadLetterCommand {
  deliveryId: string;
  tenantId: string;
  failureReason?: string;
  actorUserId: string;
}

export interface ReplayDeadLetterCommand {
  deliveryId: string;
  tenantId: string;
  actorUserId: string;
}

export interface RecordSuppressionCommand {
  deliveryId: string;
  tenantId: string;
  reason?: string;
  actorUserId: string;
}
