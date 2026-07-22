/**
 * EWP-005 Domain Aggregate Root — ProviderProfile
 * Governed by CC-005, ES-001, ES-008, ES-009, ES-010
 */

import {
  InvalidProviderStateTransitionException,
  ProviderRetiredException,
} from "./ProviderProfileErrors";

import {
  DefaultProviderChangedEvent,
  IDomainEvent,
  ProviderDisabledEvent,
  ProviderEnabledEvent,
  ProviderHealthUpdatedEvent,
  ProviderRegisteredEvent,
  ProviderRetiredEvent,
} from "./ProviderProfileEvents";

export type ProviderStatus = "CONFIGURED" | "ACTIVE" | "DISABLED" | "RETIRED";

export type ProviderHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "CIRCUIT_BROKEN";

export type ProviderType = "SMTP" | "SENDGRID" | "TWILIO" | "GRAPH_API" | "FIREBASE" | "CUSTOM";

export interface CreateProviderProfileProps {
  id?: string;
  tenantId: string;
  workspaceId?: string | null;
  providerCode: string;
  providerName: string;
  description?: string | null;
  providerType: ProviderType;
  status?: ProviderStatus;
  healthStatus?: ProviderHealthStatus;
  priority?: number;
  isDefault?: boolean;
  isEnabled?: boolean;
  supportedChannels: string[];
  capabilityMetadata: Record<string, any>;
  configurationMetadata?: Record<string, any> | null;
  createdAt?: Date;
  createdBy?: string | null;
  updatedAt?: Date;
  updatedBy?: string | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  version?: number;
}

export class ProviderProfile {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _workspaceId: string | null;
  private readonly _providerCode: string;
  private readonly _providerType: ProviderType;

  private _providerName: string;
  private _description: string | null;
  private _status: ProviderStatus;
  private _healthStatus: ProviderHealthStatus;
  private _priority: number;
  private _isDefault: boolean;
  private _isEnabled: boolean;
  private _supportedChannels: string[];
  private _capabilityMetadata: Record<string, any>;
  private _configurationMetadata: Record<string, any> | null;

  private _createdAt: Date;
  private _createdBy: string | null;
  private _updatedAt: Date;
  private _updatedBy: string | null;
  private _isDeleted: boolean;
  private _deletedAt: Date | null;
  private _deletedBy: string | null;
  private _version: number;

  private _domainEvents: IDomainEvent[] = [];

  private constructor(props: CreateProviderProfileProps) {
    if (!props.tenantId) throw new Error("TenantId is required");
    if (!props.providerCode || !props.providerCode.trim()) throw new Error("ProviderCode is required");
    if (!props.providerName || !props.providerName.trim()) throw new Error("ProviderName is required");
    if (!props.providerType) throw new Error("ProviderType is required");
    if (!props.supportedChannels || !Array.isArray(props.supportedChannels) || props.supportedChannels.length === 0) {
      throw new Error("SupportedChannels array must contain at least one NotificationChannel reference");
    }

    this._id = props.id || crypto.randomUUID();
    this._tenantId = props.tenantId;
    this._workspaceId = props.workspaceId || null;
    this._providerCode = props.providerCode.trim().toUpperCase();
    this._providerType = props.providerType;

    this._providerName = props.providerName.trim();
    this._description = props.description?.trim() || null;
    this._status = props.status || "CONFIGURED";
    this._healthStatus = props.healthStatus || "HEALTHY";
    this._priority = props.priority !== undefined ? props.priority : 100;
    this._isDefault = props.isDefault ?? false;
    this._isEnabled = props.isEnabled ?? true;
    this._supportedChannels = Array.from(new Set(props.supportedChannels));
    this._capabilityMetadata = props.capabilityMetadata ? { ...props.capabilityMetadata } : {};
    this._configurationMetadata = props.configurationMetadata ? { ...props.configurationMetadata } : null;

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
  public static create(props: CreateProviderProfileProps): ProviderProfile {
    const provider = new ProviderProfile(props);
    if (!props.id) {
      provider.addDomainEvent(
        new ProviderRegisteredEvent(
          provider._id,
          provider._tenantId,
          provider._providerCode,
          provider._providerType
        )
      );
    }
    return provider;
  }

  // --- Domain Getters ---
  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get workspaceId(): string | null { return this._workspaceId; }
  get providerCode(): string { return this._providerCode; }
  get providerName(): string { return this._providerName; }
  get description(): string | null { return this._description; }
  get providerType(): ProviderType { return this._providerType; }
  get status(): ProviderStatus { return this._status; }
  get healthStatus(): ProviderHealthStatus { return this._healthStatus; }
  get priority(): number { return this._priority; }
  get isDefault(): boolean { return this._isDefault; }
  get isEnabled(): boolean { return this._isEnabled; }
  get supportedChannels(): string[] { return [...this._supportedChannels]; }
  get capabilityMetadata(): Record<string, any> { return { ...this._capabilityMetadata }; }
  get configurationMetadata(): Record<string, any> | null {
    return this._configurationMetadata ? { ...this._configurationMetadata } : null;
  }
  get createdAt(): Date { return this._createdAt; }
  get createdBy(): string | null { return this._createdBy; }
  get updatedAt(): Date { return this._updatedAt; }
  get updatedBy(): string | null { return this._updatedBy; }
  get isDeleted(): boolean { return this._isDeleted; }
  get deletedAt(): Date | null { return this._deletedAt; }
  get deletedBy(): string | null { return this._deletedBy; }
  get version(): number { return this._version; }

  // --- Domain State Transitions ---

  public enable(updatedBy?: string): void {
    this.assertNotRetired();
    if (this._status === "ACTIVE" && this._isEnabled) return;

    this._status = "ACTIVE";
    this._isEnabled = true;
    this.touch(updatedBy);
    this.addDomainEvent(new ProviderEnabledEvent(this._id, this._tenantId, this._providerCode));
  }

  public disable(updatedBy?: string): void {
    this.assertNotRetired();
    if (this._status === "DISABLED" && !this._isEnabled) return;

    this._status = "DISABLED";
    this._isEnabled = false;
    this.touch(updatedBy);
    this.addDomainEvent(new ProviderDisabledEvent(this._id, this._tenantId, this._providerCode));
  }

  public retire(updatedBy?: string): void {
    this.assertNotRetired();

    this._status = "RETIRED";
    this._isEnabled = false;
    this._isDefault = false;
    this.touch(updatedBy);
    this.addDomainEvent(new ProviderRetiredEvent(this._id, this._tenantId, this._providerCode));
  }

  public updateHealthStatus(newHealth: ProviderHealthStatus, updatedBy?: string): void {
    this.assertNotRetired();
    if (this._healthStatus === newHealth) return;

    const previousHealth = this._healthStatus;
    this._healthStatus = newHealth;
    this.touch(updatedBy);
    this.addDomainEvent(
      new ProviderHealthUpdatedEvent(this._id, this._tenantId, previousHealth, newHealth)
    );
  }

  public setDefault(isDefault: boolean, channelId: string, updatedBy?: string): void {
    this.assertNotRetired();
    if (!this._supportedChannels.includes(channelId)) {
      throw new Error(`Provider ${this._providerCode} does not support channel ${channelId}`);
    }

    if (this._isDefault === isDefault) return;

    this._isDefault = isDefault;
    this.touch(updatedBy);
    this.addDomainEvent(
      new DefaultProviderChangedEvent(this._id, this._tenantId, channelId, isDefault)
    );
  }

  public setPriority(priority: number, updatedBy?: string): void {
    this.assertNotRetired();
    if (priority < 0) throw new Error("Priority must be a non-negative integer");
    this._priority = priority;
    this.touch(updatedBy);
  }

  public updateMetadata(
    providerName?: string,
    description?: string | null,
    capabilityMetadata?: Record<string, any>,
    configurationMetadata?: Record<string, any> | null,
    updatedBy?: string
  ): void {
    this.assertNotRetired();
    if (providerName !== undefined) {
      if (!providerName || !providerName.trim()) throw new Error("ProviderName cannot be empty");
      this._providerName = providerName.trim();
    }
    if (description !== undefined) {
      this._description = description ? description.trim() : null;
    }
    if (capabilityMetadata !== undefined) {
      this._capabilityMetadata = { ...capabilityMetadata };
    }
    if (configurationMetadata !== undefined) {
      this._configurationMetadata = configurationMetadata ? { ...configurationMetadata } : null;
    }
    this.touch(updatedBy);
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

  private assertNotRetired(): void {
    if (this._status === "RETIRED") {
      throw new ProviderRetiredException(this._id);
    }
  }

  private touch(updatedBy?: string): void {
    this._updatedAt = new Date();
    if (updatedBy) this._updatedBy = updatedBy;
  }
}
