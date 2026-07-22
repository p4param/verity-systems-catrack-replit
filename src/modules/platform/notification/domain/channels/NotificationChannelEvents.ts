// VS09 EWP-002: NotificationChannel domain events
// Immutable domain event definitions per CC-002.

export interface ChannelCreatedEvent {
  readonly type:        'ChannelCreated';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly channelCode: string;
  readonly channelType: string;
  readonly createdBy:   string | null;
  readonly occurredAt:  Date;
}

export interface ChannelActivatedEvent {
  readonly type:        'ChannelActivated';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly activatedBy: string | null;
  readonly occurredAt:  Date;
}

export interface ChannelSuspendedEvent {
  readonly type:        'ChannelSuspended';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly suspendedBy: string | null;
  readonly occurredAt:  Date;
}

export interface ChannelArchivedEvent {
  readonly type:        'ChannelArchived';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly archivedBy:  string | null;
  readonly occurredAt:  Date;
}

export interface ChannelEnabledEvent {
  readonly type:        'ChannelEnabled';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly enabledBy:   string | null;
  readonly occurredAt:  Date;
}

export interface ChannelDisabledEvent {
  readonly type:        'ChannelDisabled';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly disabledBy:  string | null;
  readonly occurredAt:  Date;
}

export interface DefaultChannelChangedEvent {
  readonly type:        'DefaultChannelChanged';
  readonly channelId:   string;
  readonly tenantId:    string;
  readonly channelType: string;
  readonly isDefault:   boolean;
  readonly changedBy:   string | null;
  readonly occurredAt:  Date;
}

export type NotificationChannelDomainEvent =
  | ChannelCreatedEvent
  | ChannelActivatedEvent
  | ChannelSuspendedEvent
  | ChannelArchivedEvent
  | ChannelEnabledEvent
  | ChannelDisabledEvent
  | DefaultChannelChangedEvent;
