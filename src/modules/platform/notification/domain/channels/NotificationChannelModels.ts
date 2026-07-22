// VS09 EWP-002: NotificationChannel domain models
// Record, enum, command, and query types for the NotificationChannel aggregate.

// ─── Channel Type ────────────────────────────────────────────────────────────

export const CHANNEL_TYPE = {
  Email:           'EMAIL',
  Sms:             'SMS',
  Push:            'PUSH',
  InApp:           'IN_APP',
  Webhook:         'WEBHOOK',
  InternalMessage: 'INTERNAL_MESSAGE',
} as const;

export type NotificationChannelType = typeof CHANNEL_TYPE[keyof typeof CHANNEL_TYPE];

// ─── Channel Status ──────────────────────────────────────────────────────────

export const CHANNEL_STATUS = {
  Draft:     'DRAFT',
  Active:    'ACTIVE',
  Suspended: 'SUSPENDED',
  Archived:  'ARCHIVED',
} as const;

export type NotificationChannelStatus = typeof CHANNEL_STATUS[keyof typeof CHANNEL_STATUS];

// ─── Aggregate Record ─────────────────────────────────────────────────────────
// Internal data record mirroring the notification_channels DB schema (ES-001).

export interface NotificationChannelRecord {
  // Identity
  id:                         string;
  tenantId:                   string;
  workspaceId:                string | null;
  // Business identity
  channelCode:                string;
  channelName:                string;
  description:                string | null;
  channelType:                NotificationChannelType;
  status:                     NotificationChannelStatus;
  priority:                   number;
  isDefault:                  boolean;
  isEnabled:                  boolean;
  supportedTemplateCategories: string[]; // RC-005 represented as string[] within aggregate
  configurationMetadata:      Record<string, unknown> | null; // RC-002 only business configuration metadata

  // ES-001 audit
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;

  // ES-001 OCC
  version: bigint;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export interface CreateChannelCommand {
  tenantId:                     string;
  workspaceId?:                 string;
  channelCode:                  string;
  channelName:                  string;
  description?:                 string;
  channelType:                  NotificationChannelType;
  priority?:                    number;
  supportedTemplateCategories?: string[];
  configurationMetadata?:       Record<string, unknown>;
  actorUserId:                  string;
}

export interface UpdateChannelMetadataCommand {
  channelId:                    string;
  tenantId:                     string;
  channelName?:                 string;
  description?:                 string;
  priority?:                    number;
  supportedTemplateCategories?: string[];
  configurationMetadata?:       Record<string, unknown>;
  actorUserId:                  string;
}

export interface ActivateChannelCommand {
  channelId:   string;
  tenantId:    string;
  actorUserId: string;
}

export interface SuspendChannelCommand {
  channelId:   string;
  tenantId:    string;
  actorUserId: string;
}

export interface ArchiveChannelCommand {
  channelId:   string;
  tenantId:    string;
  actorUserId: string;
}

export interface EnableChannelCommand {
  channelId:   string;
  tenantId:    string;
  actorUserId: string;
}

export interface DisableChannelCommand {
  channelId:   string;
  tenantId:    string;
  actorUserId: string;
}

export interface SetDefaultChannelCommand {
  channelId:   string;
  tenantId:    string;
  actorUserId: string;
}
