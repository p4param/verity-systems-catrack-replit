/**
 * EWP-004 Domain Aggregate Root — NotificationRecipient
 * Governed by CC-004, ES-001, ES-008, ES-009, ES-010
 */

import {
  InvalidRecipientStateTransitionException,
  RecipientSuppressedException,
  RecipientTerminalStateException,
} from "./NotificationRecipientErrors";

import {
  IDomainEvent,
  RecipientCompletedEvent,
  RecipientEligibleEvent,
  RecipientResolvedEvent,
  RecipientSuppressedEvent,
} from "./NotificationRecipientEvents";

export type RecipientStatus = "RESOLVED" | "ELIGIBLE" | "SUPPRESSED" | "COMPLETED";

export type RecipientType = "INDIVIDUAL_USER" | "USER_GROUP" | "ROLE_MEMBERSHIP" | "EXTERNAL_ENDPOINT";

export interface LocalizationContextProps {
  culture: string;
  language: string;
  timezone: string;
}

export class LocalizationContext {
  readonly culture: string;
  readonly language: string;
  readonly timezone: string;

  constructor(props: LocalizationContextProps) {
    if (!props.culture || !props.culture.trim()) throw new Error("Culture is required");
    if (!props.language || !props.language.trim()) throw new Error("Language is required");
    if (!props.timezone || !props.timezone.trim()) throw new Error("Timezone is required");

    this.culture = props.culture.trim();
    this.language = props.language.trim();
    this.timezone = props.timezone.trim();
  }
}

export interface CreateRecipientProps {
  id?: string;
  notificationId: string;
  tenantId: string;
  workspaceId?: string | null;
  recipientSequence: number;
  recipientType: RecipientType;
  recipientUserId?: string | null;
  recipientGroupId?: string | null;
  recipientEndpoint: string;
  channelId: string;
  deliveryPreferenceSnapshot?: Record<string, any> | null;
  localization: LocalizationContextProps;
  status?: RecipientStatus;
  suppressionReason?: string | null;
  createdAt?: Date;
  createdBy?: string | null;
  updatedAt?: Date;
  updatedBy?: string | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  version?: number;
}

export class NotificationRecipient {
  private readonly _id: string;
  private readonly _notificationId: string;
  private readonly _tenantId: string;
  private readonly _workspaceId: string | null;
  private readonly _recipientSequence: number;
  private readonly _recipientType: RecipientType;
  private readonly _recipientUserId: string | null;
  private readonly _recipientGroupId: string | null;
  private readonly _recipientEndpoint: string;
  private readonly _channelId: string;
  private readonly _deliveryPreferenceSnapshot: Record<string, any> | null;
  private readonly _localization: LocalizationContext;

  private _status: RecipientStatus;
  private _suppressionReason: string | null;

  private _createdAt: Date;
  private _createdBy: string | null;
  private _updatedAt: Date;
  private _updatedBy: string | null;
  private _isDeleted: boolean;
  private _deletedAt: Date | null;
  private _deletedBy: string | null;
  private _version: number;

  private _domainEvents: IDomainEvent[] = [];

  private constructor(props: CreateRecipientProps) {
    if (!props.notificationId) throw new Error("NotificationId is required");
    if (!props.tenantId) throw new Error("TenantId is required");
    if (props.recipientSequence === undefined || props.recipientSequence < 1) {
      throw new Error("RecipientSequence must be a positive integer >= 1");
    }
    if (!props.recipientEndpoint || !props.recipientEndpoint.trim()) {
      throw new Error("RecipientEndpoint is required");
    }
    if (!props.channelId) throw new Error("ChannelId is required");

    this._id = props.id || crypto.randomUUID();
    this._notificationId = props.notificationId;
    this._tenantId = props.tenantId;
    this._workspaceId = props.workspaceId || null;
    this._recipientSequence = props.recipientSequence;
    this._recipientType = props.recipientType;
    this._recipientUserId = props.recipientUserId || null;
    this._recipientGroupId = props.recipientGroupId || null;
    this._recipientEndpoint = props.recipientEndpoint.trim();
    this._channelId = props.channelId;
    this._deliveryPreferenceSnapshot = props.deliveryPreferenceSnapshot ? { ...props.deliveryPreferenceSnapshot } : null;
    this._localization = new LocalizationContext(props.localization);

    this._status = props.status || "RESOLVED";
    this._suppressionReason = props.suppressionReason || null;

    this._createdAt = props.createdAt || new Date();
    this._createdBy = props.createdBy || null;
    this._updatedAt = props.updatedAt || new Date();
    this._updatedBy = props.updatedBy || null;
    this._isDeleted = props.isDeleted ?? false;
    this._deletedAt = props.deletedAt || null;
    this._deletedBy = props.deletedBy || null;
    this._version = props.version ?? 1;
  }

  // --- Factory Creator ---
  public static create(props: CreateRecipientProps): NotificationRecipient {
    const recipient = new NotificationRecipient(props);
    if (!props.id) {
      recipient.addDomainEvent(
        new RecipientResolvedEvent(
          recipient._id,
          recipient._notificationId,
          recipient._tenantId,
          recipient._recipientSequence,
          recipient._recipientEndpoint,
          recipient._recipientType
        )
      );
    }
    return recipient;
  }

  // --- Domain Getters ---
  get id(): string { return this._id; }
  get notificationId(): string { return this._notificationId; }
  get tenantId(): string { return this._tenantId; }
  get workspaceId(): string | null { return this._workspaceId; }
  get recipientSequence(): number { return this._recipientSequence; }
  get recipientType(): RecipientType { return this._recipientType; }
  get recipientUserId(): string | null { return this._recipientUserId; }
  get recipientGroupId(): string | null { return this._recipientGroupId; }
  get recipientEndpoint(): string { return this._recipientEndpoint; }
  get channelId(): string { return this._channelId; }
  get deliveryPreferenceSnapshot(): Record<string, any> | null {
    return this._deliveryPreferenceSnapshot ? { ...this._deliveryPreferenceSnapshot } : null;
  }
  get localization(): LocalizationContext { return this._localization; }
  get status(): RecipientStatus { return this._status; }
  get suppressionReason(): string | null { return this._suppressionReason; }
  get createdAt(): Date { return this._createdAt; }
  get createdBy(): string | null { return this._createdBy; }
  get updatedAt(): Date { return this._updatedAt; }
  get updatedBy(): string | null { return this._updatedBy; }
  get isDeleted(): boolean { return this._isDeleted; }
  get deletedAt(): Date | null { return this._deletedAt; }
  get deletedBy(): string | null { return this._deletedBy; }
  get version(): number { return this._version; }

  // --- State Machine Transitions ---

  public markEligible(updatedBy?: string): void {
    this.assertNotTerminal();
    if (this._status === "SUPPRESSED") {
      throw new RecipientSuppressedException(this._id, this._suppressionReason || undefined);
    }
    if (this._status !== "RESOLVED") {
      throw new InvalidRecipientStateTransitionException(this._status, "ELIGIBLE");
    }

    this._status = "ELIGIBLE";
    this.touch(updatedBy);
    this.addDomainEvent(
      new RecipientEligibleEvent(this._id, this._notificationId, this._tenantId, this._channelId)
    );
  }

  public suppress(reason: string, updatedBy?: string): void {
    this.assertNotTerminal();
    if (!reason || !reason.trim()) {
      throw new Error("Suppression reason is required when suppressing a recipient");
    }

    if (this._status !== "RESOLVED" && this._status !== "ELIGIBLE") {
      throw new InvalidRecipientStateTransitionException(this._status, "SUPPRESSED");
    }

    this._status = "SUPPRESSED";
    this._suppressionReason = reason.trim();
    this.touch(updatedBy);
    this.addDomainEvent(
      new RecipientSuppressedEvent(this._id, this._notificationId, this._tenantId, this._suppressionReason)
    );
  }

  public updateSuppressionReason(reason: string, updatedBy?: string): void {
    if (this._status !== "SUPPRESSED") {
      throw new Error("Can only update suppression reason when recipient status is SUPPRESSED");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Suppression reason cannot be empty");
    }
    this._suppressionReason = reason.trim();
    this.touch(updatedBy);
  }

  public markCompleted(updatedBy?: string): void {
    this.assertNotTerminal();
    if (this._status !== "ELIGIBLE" && this._status !== "SUPPRESSED") {
      throw new InvalidRecipientStateTransitionException(this._status, "COMPLETED");
    }

    this._status = "COMPLETED";
    this.touch(updatedBy);
    this.addDomainEvent(
      new RecipientCompletedEvent(this._id, this._notificationId, this._tenantId, this._status)
    );
  }

  public softDelete(deletedBy?: string): void {
    this._isDeleted = true;
    this._deletedAt = new Date();
    this._deletedBy = deletedBy || null;
    this.touch(deletedBy);
  }

  // --- Domain Event Management ---
  public popDomainEvents(): IDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  private addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  private assertNotTerminal(): void {
    if (this._status === "COMPLETED") {
      throw new RecipientTerminalStateException(this._id, this._status);
    }
  }

  private touch(updatedBy?: string): void {
    this._updatedAt = new Date();
    if (updatedBy) this._updatedBy = updatedBy;
  }
}
