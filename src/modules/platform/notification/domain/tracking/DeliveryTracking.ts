/**
 * EWP-006 Domain Aggregate Root — DeliveryTracking
 * Governed by CC-006, ES-001, ES-008, ES-009, ES-010
 */

import {
  InvalidTrackingStateTransitionException,
  TrackingArchivedException,
} from "./DeliveryTrackingErrors";

import {
  AcknowledgementReceivedEvent,
  DeliveryConfirmedEvent,
  IDomainEvent,
  TimelineEventAppendedEvent,
  TrackingArchivedEvent,
  TrackingStartedEvent,
} from "./DeliveryTrackingEvents";

import { TimelineEntryProps, TrackingTimeline } from "./value-objects/TrackingTimeline";

export type TrackingStatus =
  | "TRACKING_STARTED"
  | "TRACKING_ACTIVE"
  | "TRACKING_COMPLETED"
  | "ARCHIVED";

export interface CreateDeliveryTrackingProps {
  id?: string;
  notificationId: string;
  tenantId: string;
  workspaceId?: string | null;
  correlationId: string;
  providerProfileId?: string | null;
  trackingStatus?: TrackingStatus;
  providerAcknowledgementId?: string | null;
  providerStatus?: string | null;
  providerTimestamp?: Date | null;
  deliveryTimestamp?: Date | null;
  readTimestamp?: Date | null;
  trackingTimeline?: TrackingTimeline | any[];
  telemetryMetadata?: Record<string, any> | null;
  auditMetadata?: Record<string, any> | null;
  createdAt?: Date;
  createdBy?: string | null;
  updatedAt?: Date;
  updatedBy?: string | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  version?: number;
}

export class DeliveryTracking {
  private readonly _id: string;
  private readonly _notificationId: string;
  private readonly _tenantId: string;
  private readonly _workspaceId: string | null;
  private readonly _correlationId: string;

  private _providerProfileId: string | null;
  private _trackingStatus: TrackingStatus;
  private _providerAcknowledgementId: string | null;
  private _providerStatus: string | null;
  private _providerTimestamp: Date | null;
  private _deliveryTimestamp: Date | null;
  private _readTimestamp: Date | null;
  private _trackingTimeline: TrackingTimeline;
  private _telemetryMetadata: Record<string, any> | null;
  private _auditMetadata: Record<string, any> | null;

  private _createdAt: Date;
  private _createdBy: string | null;
  private _updatedAt: Date;
  private _updatedBy: string | null;
  private _isDeleted: boolean;
  private _deletedAt: Date | null;
  private _deletedBy: string | null;
  private _version: number;

  private _domainEvents: IDomainEvent[] = [];

  private constructor(props: CreateDeliveryTrackingProps) {
    if (!props.notificationId) throw new Error("NotificationId is required");
    if (!props.tenantId) throw new Error("TenantId is required");
    if (!props.correlationId) throw new Error("CorrelationId is required");

    this._id = props.id || crypto.randomUUID();
    this._notificationId = props.notificationId;
    this._tenantId = props.tenantId;
    this._workspaceId = props.workspaceId || null;
    this._correlationId = props.correlationId;

    this._providerProfileId = props.providerProfileId || null;
    this._trackingStatus = props.trackingStatus || "TRACKING_STARTED";
    this._providerAcknowledgementId = props.providerAcknowledgementId || null;
    this._providerStatus = props.providerStatus || null;
    this._providerTimestamp = props.providerTimestamp || null;
    this._deliveryTimestamp = props.deliveryTimestamp || null;
    this._readTimestamp = props.readTimestamp || null;

    if (props.trackingTimeline instanceof TrackingTimeline) {
      this._trackingTimeline = props.trackingTimeline;
    } else if (Array.isArray(props.trackingTimeline)) {
      this._trackingTimeline = TrackingTimeline.fromJSON(props.trackingTimeline);
    } else {
      this._trackingTimeline = new TrackingTimeline();
    }

    this._telemetryMetadata = props.telemetryMetadata ? { ...props.telemetryMetadata } : null;
    this._auditMetadata = props.auditMetadata ? { ...props.auditMetadata } : null;

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
  public static create(props: CreateDeliveryTrackingProps): DeliveryTracking {
    const tracking = new DeliveryTracking(props);
    if (!props.id) {
      // Append initial TrackingStarted milestone entry to timeline (REC-005)
      tracking._trackingTimeline = tracking._trackingTimeline.append({
        eventType: "TrackingStarted",
        timestamp: tracking._createdAt,
        details: { correlationId: tracking._correlationId },
      });

      tracking.addDomainEvent(
        new TrackingStartedEvent(
          tracking._id,
          tracking._notificationId,
          tracking._tenantId,
          tracking._correlationId
        )
      );
    }
    return tracking;
  }

  // --- Domain Getters ---
  get id(): string { return this._id; }
  get notificationId(): string { return this._notificationId; }
  get tenantId(): string { return this._tenantId; }
  get workspaceId(): string | null { return this._workspaceId; }
  get correlationId(): string { return this._correlationId; }
  get providerProfileId(): string | null { return this._providerProfileId; }
  get trackingStatus(): TrackingStatus { return this._trackingStatus; }
  get providerAcknowledgementId(): string | null { return this._providerAcknowledgementId; }
  get providerStatus(): string | null { return this._providerStatus; }
  get providerTimestamp(): Date | null { return this._providerTimestamp; }
  get deliveryTimestamp(): Date | null { return this._deliveryTimestamp; }
  get readTimestamp(): Date | null { return this._readTimestamp; }
  get trackingTimeline(): TrackingTimeline { return this._trackingTimeline; }
  get telemetryMetadata(): Record<string, any> | null {
    return this._telemetryMetadata ? { ...this._telemetryMetadata } : null;
  }
  get auditMetadata(): Record<string, any> | null {
    return this._auditMetadata ? { ...this._auditMetadata } : null;
  }
  get createdAt(): Date { return this._createdAt; }
  get createdBy(): string | null { return this._createdBy; }
  get updatedAt(): Date { return this._updatedAt; }
  get updatedBy(): string | null { return this._updatedBy; }
  get isDeleted(): boolean { return this._isDeleted; }
  get deletedAt(): Date | null { return this._deletedAt; }
  get deletedBy(): string | null { return this._deletedBy; }
  get version(): number { return this._version; }

  // --- Domain Commands & State Machine ---

  public recordAcknowledgement(
    providerAcknowledgementId: string,
    providerStatus: string,
    providerTimestamp: Date,
    providerProfileId?: string,
    updatedBy?: string
  ): void {
    this.assertNotArchived();
    if (!providerAcknowledgementId || !providerAcknowledgementId.trim()) {
      throw new Error("ProviderAcknowledgementId is required");
    }

    if (this._providerAcknowledgementId) {
      throw new Error("ProviderAcknowledgementId is immutable once recorded");
    }

    this._providerAcknowledgementId = providerAcknowledgementId.trim();
    this._providerStatus = providerStatus;
    // Externally supplied timestamp fact (REC-004)
    this._providerTimestamp = new Date(providerTimestamp);
    if (providerProfileId) this._providerProfileId = providerProfileId;

    if (this._trackingStatus === "TRACKING_STARTED") {
      this._trackingStatus = "TRACKING_ACTIVE";
    }

    this.appendTimelineEntry({
      eventType: "AcknowledgementReceived",
      timestamp: this._providerTimestamp,
      details: {
        providerAcknowledgementId: this._providerAcknowledgementId,
        providerStatus,
      },
    });

    this.touch(updatedBy);
    this.addDomainEvent(
      new AcknowledgementReceivedEvent(
        this._id,
        this._notificationId,
        this._tenantId,
        this._providerAcknowledgementId,
        providerStatus
      )
    );
  }

  public recordDeliveryConfirmation(
    deliveryTimestamp: Date,
    details?: Record<string, any>,
    updatedBy?: string
  ): void {
    this.assertNotArchived();
    // Externally supplied timestamp fact (REC-004)
    this._deliveryTimestamp = new Date(deliveryTimestamp);

    if (this._trackingStatus === "TRACKING_ACTIVE" || this._trackingStatus === "TRACKING_STARTED") {
      this._trackingStatus = "TRACKING_COMPLETED";
    }

    this.appendTimelineEntry({
      eventType: "DeliveryConfirmed",
      timestamp: this._deliveryTimestamp,
      details: details || null,
    });

    this.touch(updatedBy);
    this.addDomainEvent(
      new DeliveryConfirmedEvent(
        this._id,
        this._notificationId,
        this._tenantId,
        this._deliveryTimestamp
      )
    );
  }

  public recordReadConfirmation(
    readTimestamp: Date,
    details?: Record<string, any>,
    updatedBy?: string
  ): void {
    this.assertNotArchived();
    // Externally supplied timestamp fact (REC-004)
    this._readTimestamp = new Date(readTimestamp);

    this.appendTimelineEntry({
      eventType: "ReadReceiptReceived",
      timestamp: this._readTimestamp,
      details: details || null,
    });

    this.touch(updatedBy);
  }

  public appendTimelineEntry(entryProps: TimelineEntryProps, updatedBy?: string): void {
    this.assertNotArchived();
    this._trackingTimeline = this._trackingTimeline.append(entryProps);
    this.touch(updatedBy);
    this.addDomainEvent(
      new TimelineEventAppendedEvent(
        this._id,
        this._notificationId,
        this._tenantId,
        entryProps.eventType
      )
    );
  }

  public archive(updatedBy?: string): void {
    this.assertNotArchived();
    if (this._trackingStatus !== "TRACKING_COMPLETED") {
      throw new InvalidTrackingStateTransitionException(this._trackingStatus, "ARCHIVED");
    }

    this.appendTimelineEntry({
      eventType: "Archived",
      timestamp: new Date(),
    });
    this._trackingStatus = "ARCHIVED";

    this.touch(updatedBy);
    this.addDomainEvent(
      new TrackingArchivedEvent(this._id, this._notificationId, this._tenantId)
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

  private assertNotArchived(): void {
    if (this._trackingStatus === "ARCHIVED") {
      throw new TrackingArchivedException(this._id);
    }
  }

  private touch(updatedBy?: string): void {
    this._updatedAt = new Date();
    if (updatedBy) this._updatedBy = updatedBy;
  }
}
