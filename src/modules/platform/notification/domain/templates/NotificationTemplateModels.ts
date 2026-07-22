// VS09 EWP-001: NotificationTemplate domain models
// Record, enum, command, and query types for the NotificationTemplate aggregate.

// ─── Status Lifecycle ─────────────────────────────────────────────────────────
// DRAFT → PUBLISHED → DEPRECATED → ARCHIVED
// PUBLISHED → ARCHIVED (direct archive without deprecation)

export const TEMPLATE_STATUS = {
  Draft:      'DRAFT',
  Published:  'PUBLISHED',
  Deprecated: 'DEPRECATED',
  Archived:   'ARCHIVED',
} as const;

export type TemplateStatus = typeof TEMPLATE_STATUS[keyof typeof TEMPLATE_STATUS];

// ─── Category ─────────────────────────────────────────────────────────────────

export const TEMPLATE_CATEGORY = {
  Transactional: 'TRANSACTIONAL',
  Security:      'SECURITY',
  Workflow:      'WORKFLOW',
  Marketing:     'MARKETING',
} as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORY[keyof typeof TEMPLATE_CATEGORY];

// ─── Delivery Channel ─────────────────────────────────────────────────────────

export const DELIVERY_CHANNEL = {
  Email:   'EMAIL',
  Sms:     'SMS',
  Push:    'PUSH',
  InApp:   'IN_APP',
  Webhook: 'WEBHOOK',
} as const;

export type DeliveryChannel = typeof DELIVERY_CHANNEL[keyof typeof DELIVERY_CHANNEL];

// ─── Aggregate Record ─────────────────────────────────────────────────────────
// Internal data record mirroring the notification_templates DB schema (ES-001).

export interface NotificationTemplateRecord {
  // Identity
  id:               string;
  tenantId:         string;
  workspaceId:      string | null;
  // Business identity: (tenantId, templateCode, templateVersion) is unique
  templateCode:     string;
  templateName:     string;
  description:      string | null;
  category:         TemplateCategory;
  status:           TemplateStatus;
  templateVersion:  string;
  parentTemplateId: string | null;
  // Configuration
  supportedChannels:  DeliveryChannel[];
  supportedLanguages: string[];
  defaultLanguage:    string;
  brandingProfileId:  string | null;
  isSystemTemplate:   boolean;
  isActive:           boolean;
  variableSchema:     Record<string, unknown>;
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

export interface CreateTemplateCommand {
  tenantId:          string;
  workspaceId?:      string;
  templateCode:      string;
  templateName:      string;
  description?:      string;
  category:          TemplateCategory;
  defaultLanguage:   string;
  supportedChannels: DeliveryChannel[];
  supportedLanguages?: string[];
  variableSchema:    Record<string, unknown>;
  isSystemTemplate?: boolean;
  actorUserId:       string;
}

export interface PublishTemplateCommand {
  templateId:  string;
  tenantId:    string;
  actorUserId: string;
}

export interface CreateVersionCommand {
  templateId:  string;
  tenantId:    string;
  newVersion:  string;
  actorUserId: string;
}

export interface DeprecateTemplateCommand {
  templateId:  string;
  tenantId:    string;
  actorUserId: string;
}

export interface ArchiveTemplateCommand {
  templateId:  string;
  tenantId:    string;
  actorUserId: string;
}

export interface AddLanguageCommand {
  templateId:   string;
  tenantId:     string;
  languageCode: string;
  actorUserId:  string;
}

export interface RemoveLanguageCommand {
  templateId:   string;
  tenantId:     string;
  languageCode: string;
  actorUserId:  string;
}

export interface AddChannelCommand {
  templateId:  string;
  tenantId:    string;
  channel:     DeliveryChannel;
  actorUserId: string;
}

export interface RemoveChannelCommand {
  templateId:  string;
  tenantId:    string;
  channel:     DeliveryChannel;
  actorUserId: string;
}

export interface UpdateTemplateMetadataCommand {
  templateId:        string;
  tenantId:          string;
  templateName?:     string;
  description?:      string | null;
  brandingProfileId?: string | null;
  actorUserId:       string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListPublishedQuery {
  tenantId:  string;
  category?: TemplateCategory;
}

export interface ListByChannelQuery {
  tenantId: string;
  channel:  DeliveryChannel;
  status?:  TemplateStatus;
}

export interface ListByLanguageQuery {
  tenantId:     string;
  languageCode: string;
}
