/**
 * VS08B Commercial Foundation — Subscription Domain Aggregate Root
 *
 * Mapped to table: tenant_subscriptions
 * ADR Compliance: ADR-008-018 through ADR-008-024
 */
import {
  InvalidSubscriptionStateTransitionError,
  SubscriptionImmutableError,
  SubscriptionValidationError,
} from "./errors/SubscriptionErrors";

export type SubscriptionStatus =
  | "Draft"
  | "Trial"
  | "Active"
  | "Suspended"
  | "Expired"
  | "Cancelled"
  | "Archived";

export type RenewalPolicy = "AUTO_RENEW" | "MANUAL" | "NON_RENEWING";

export interface CreateSubscriptionProps {
  id?: string;
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

export interface ReconstituteSubscriptionProps {
  id: string;
  tenantId: string;
  subscriptionPlanId: string;
  code: string;
  name: string;
  renewalPolicy: RenewalPolicy;
  externalReferenceId: string | null;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  trialEndDate: Date | null;
  renewedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  version: bigint;
}

export class Subscription {
  private _id: string;
  private readonly _tenantId: string;
  private readonly _subscriptionPlanId: string;
  private _code: string;
  private _name: string;
  private _renewalPolicy: RenewalPolicy;
  private _externalReferenceId: string | null;
  private _status: SubscriptionStatus;
  private _startDate: Date;
  private _endDate: Date | null;
  private _trialEndDate: Date | null;
  private _renewedAt: Date | null;
  private _cancelledAt: Date | null;
  private _createdAt: Date;
  private _createdBy: string | null;
  private _updatedAt: Date;
  private _updatedBy: string | null;
  private _isDeleted: boolean;
  private _deletedAt: Date | null;
  private _deletedBy: string | null;
  private _version: bigint;

  private constructor(props: ReconstituteSubscriptionProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._subscriptionPlanId = props.subscriptionPlanId;
    this._code = props.code;
    this._name = props.name;
    this._renewalPolicy = props.renewalPolicy;
    this._externalReferenceId = props.externalReferenceId;
    this._status = props.status;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
    this._trialEndDate = props.trialEndDate;
    this._renewedAt = props.renewedAt;
    this._cancelledAt = props.cancelledAt;
    this._createdAt = props.createdAt;
    this._createdBy = props.createdBy;
    this._updatedAt = props.updatedAt;
    this._updatedBy = props.updatedBy;
    this._isDeleted = props.isDeleted;
    this._deletedAt = props.deletedAt;
    this._deletedBy = props.deletedBy;
    this._version = props.version;
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  get id(): string {
    return this._id;
  }
  get tenantId(): string {
    return this._tenantId;
  }
  get subscriptionPlanId(): string {
    return this._subscriptionPlanId;
  }
  get code(): string {
    return this._code;
  }
  get name(): string {
    return this._name;
  }
  get renewalPolicy(): RenewalPolicy {
    return this._renewalPolicy;
  }
  get externalReferenceId(): string | null {
    return this._externalReferenceId;
  }
  get status(): SubscriptionStatus {
    return this._status;
  }
  get startDate(): Date {
    return this._startDate;
  }
  get endDate(): Date | null {
    return this._endDate;
  }
  get trialEndDate(): Date | null {
    return this._trialEndDate;
  }
  get renewedAt(): Date | null {
    return this._renewedAt;
  }
  get cancelledAt(): Date | null {
    return this._cancelledAt;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get createdBy(): string | null {
    return this._createdBy;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get updatedBy(): string | null {
    return this._updatedBy;
  }
  get isDeleted(): boolean {
    return this._isDeleted;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }
  get deletedBy(): string | null {
    return this._deletedBy;
  }
  get version(): bigint {
    return this._version;
  }

  // ─── Static Factory Methods ──────────────────────────────────────────────

  public static create(props: CreateSubscriptionProps): Subscription {
    if (!props.tenantId || props.tenantId.trim() === "") {
      throw new SubscriptionValidationError("TenantId is required.");
    }
    if (!props.subscriptionPlanId || props.subscriptionPlanId.trim() === "") {
      throw new SubscriptionValidationError("SubscriptionPlanId is required.");
    }
    if (!props.code || props.code.trim() === "") {
      throw new SubscriptionValidationError("Code is required.");
    }
    if (!props.name || props.name.trim() === "") {
      throw new SubscriptionValidationError("Name is required.");
    }

    const startDate = props.startDate ?? new Date();
    if (props.endDate && props.endDate.getTime() <= startDate.getTime()) {
      throw new SubscriptionValidationError("EndDate must be strictly after StartDate.");
    }

    const id = props.id ?? crypto.randomUUID();
    const now = new Date();

    return new Subscription({
      id,
      tenantId: props.tenantId,
      subscriptionPlanId: props.subscriptionPlanId,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      renewalPolicy: props.renewalPolicy ?? "AUTO_RENEW",
      externalReferenceId: props.externalReferenceId?.trim() ?? null,
      status: "Draft",
      startDate,
      endDate: props.endDate ?? null,
      trialEndDate: props.trialEndDate ?? null,
      renewedAt: null,
      cancelledAt: null,
      createdAt: now,
      createdBy: props.createdBy ?? null,
      updatedAt: now,
      updatedBy: props.createdBy ?? null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1n,
    });
  }

  public static reconstitute(props: ReconstituteSubscriptionProps): Subscription {
    return new Subscription(props);
  }

  // ─── Lifecycle State Transitions ─────────────────────────────────────────

  private ensureMutable(): void {
    if (this._status === "Archived") {
      throw new SubscriptionImmutableError(this._id);
    }
  }

  public startTrial(trialEndDate: Date, actorUserId?: string): void {
    this.ensureMutable();
    if (this._status !== "Draft") {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Trial");
    }
    if (trialEndDate.getTime() <= Date.now()) {
      throw new SubscriptionValidationError("TrialEndDate must be in the future.");
    }

    this._status = "Trial";
    this._trialEndDate = trialEndDate;
    this.touch(actorUserId);
  }

  public activate(actorUserId?: string, newEndDate?: Date): void {
    this.ensureMutable();
    if (
      this._status !== "Draft" &&
      this._status !== "Trial" &&
      this._status !== "Suspended" &&
      this._status !== "Expired"
    ) {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Active");
    }

    if (newEndDate) {
      if (newEndDate.getTime() <= Date.now()) {
        throw new SubscriptionValidationError("New EndDate must be in the future.");
      }
      this._endDate = newEndDate;
    }

    this._status = "Active";
    this.touch(actorUserId);
  }

  public suspend(actorUserId?: string): void {
    this.ensureMutable();
    if (this._status !== "Active") {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Suspended");
    }

    this._status = "Suspended";
    this.touch(actorUserId);
  }

  public resume(actorUserId?: string): void {
    this.ensureMutable();
    if (this._status !== "Suspended") {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Active");
    }

    this._status = "Active";
    this.touch(actorUserId);
  }

  public expire(actorUserId?: string): void {
    this.ensureMutable();
    if (
      this._status !== "Active" &&
      this._status !== "Trial" &&
      this._status !== "Suspended"
    ) {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Expired");
    }

    this._status = "Expired";
    this.touch(actorUserId);
  }

  public cancel(actorUserId?: string): void {
    this.ensureMutable();
    if (
      this._status !== "Draft" &&
      this._status !== "Trial" &&
      this._status !== "Active" &&
      this._status !== "Suspended"
    ) {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Cancelled");
    }

    const now = new Date();
    this._status = "Cancelled";
    this._cancelledAt = now;
    this.touch(actorUserId);
  }

  public renew(newEndDate: Date, actorUserId?: string): void {
    this.ensureMutable();
    if (this._status !== "Active" && this._status !== "Expired") {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Active (Renew)");
    }
    if (newEndDate.getTime() <= Date.now()) {
      throw new SubscriptionValidationError("Renewal EndDate must be in the future.");
    }

    const now = new Date();
    this._status = "Active";
    this._endDate = newEndDate;
    this._renewedAt = now;
    this.touch(actorUserId);
  }

  public archive(actorUserId?: string): void {
    this.ensureMutable();
    if (this._status !== "Expired" && this._status !== "Cancelled") {
      throw new InvalidSubscriptionStateTransitionError(this._status, "Archived");
    }

    this._status = "Archived";
    this.touch(actorUserId);
  }

  public updateDetails(
    props: {
      name?: string;
      renewalPolicy?: RenewalPolicy;
      externalReferenceId?: string | null;
    },
    actorUserId?: string
  ): void {
    this.ensureMutable();
    if (props.name !== undefined) {
      if (!props.name || props.name.trim() === "") {
        throw new SubscriptionValidationError("Name cannot be empty.");
      }
      this._name = props.name.trim();
    }
    if (props.renewalPolicy !== undefined) {
      this._renewalPolicy = props.renewalPolicy;
    }
    if (props.externalReferenceId !== undefined) {
      this._externalReferenceId = props.externalReferenceId?.trim() ?? null;
    }
    this.touch(actorUserId);
  }

  public softDelete(actorUserId?: string): void {
    this.ensureMutable();
    const now = new Date();
    this._isDeleted = true;
    this._deletedAt = now;
    this._deletedBy = actorUserId ?? null;
    this.touch(actorUserId);
  }

  private touch(actorUserId?: string): void {
    this._updatedAt = new Date();
    if (actorUserId) {
      this._updatedBy = actorUserId;
    }
  }
}
