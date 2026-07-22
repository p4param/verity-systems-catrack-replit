// VS09 EWP-003: DeliveryAttempt internal entity

import { randomUUID } from 'crypto';
import type {
  DeliveryAttemptRecord,
  NotificationDeliveryStatus,
} from '../NotificationModels';

export interface CreateDeliveryAttemptInput {
  deliveryId: string;
  attemptNumber: number;
  providerId?: string | null;
  status: NotificationDeliveryStatus;
  responseCode?: string | null;
  errorDetails?: string | null;
  attemptedAt?: Date;
  completedAt?: Date | null;
}

export class DeliveryAttempt {
  private readonly _record: DeliveryAttemptRecord;

  private constructor(record: DeliveryAttemptRecord) {
    this._record = { ...record };
  }

  get attemptNumber(): number { return this._record.attemptNumber; }

  static create(input: CreateDeliveryAttemptInput): DeliveryAttempt {
    const now = input.attemptedAt ?? new Date();

    return new DeliveryAttempt({
      id: randomUUID(),
      deliveryId: input.deliveryId,
      attemptNumber: input.attemptNumber,
      providerId: input.providerId ?? null,
      status: input.status,
      responseCode: input.responseCode ?? null,
      errorDetails: input.errorDetails ?? null,
      attemptedAt: now,
      completedAt: input.completedAt ?? now,
    });
  }

  static reconstitute(record: DeliveryAttemptRecord): DeliveryAttempt {
    return new DeliveryAttempt({ ...record });
  }

  toRecord(): DeliveryAttemptRecord {
    return { ...this._record };
  }
}
