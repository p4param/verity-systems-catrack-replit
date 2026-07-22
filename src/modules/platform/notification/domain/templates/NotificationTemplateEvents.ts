// VS09 EWP-001: NotificationTemplate domain events
// Immutable domain event definitions per CC-001.
// All events are readonly value types — no methods, no mutation.
// Events are collected by the aggregate and surfaced via pullDomainEvents().

// ─── TemplateCreated ──────────────────────────────────────────────────────────

export interface TemplateCreatedEvent {
  readonly type:            'TemplateCreated';
  readonly templateId:      string;
  readonly tenantId:        string;
  readonly templateCode:    string;
  readonly templateVersion: string;
  readonly createdBy:       string | null;
  readonly occurredAt:      Date;
}

// ─── TemplatePublished ────────────────────────────────────────────────────────

export interface TemplatePublishedEvent {
  readonly type:            'TemplatePublished';
  readonly templateId:      string;
  readonly tenantId:        string;
  readonly templateCode:    string;
  readonly templateVersion: string;
  readonly publishedBy:     string | null;
  readonly occurredAt:      Date;
}

// ─── TemplateVersionCreated ───────────────────────────────────────────────────

export interface TemplateVersionCreatedEvent {
  readonly type:              'TemplateVersionCreated';
  readonly templateId:        string;
  readonly tenantId:          string;
  readonly templateCode:      string;
  readonly predecessorVersion: string;
  readonly newVersion:         string;
  readonly createdBy:          string | null;
  readonly occurredAt:         Date;
}

// ─── TemplateDeprecated ───────────────────────────────────────────────────────

export interface TemplateDeprecatedEvent {
  readonly type:            'TemplateDeprecated';
  readonly templateId:      string;
  readonly tenantId:        string;
  readonly templateCode:    string;
  readonly templateVersion: string;
  readonly deprecatedBy:    string | null;
  readonly occurredAt:      Date;
}

// ─── TemplateArchived ─────────────────────────────────────────────────────────

export interface TemplateArchivedEvent {
  readonly type:            'TemplateArchived';
  readonly templateId:      string;
  readonly tenantId:        string;
  readonly templateCode:    string;
  readonly templateVersion: string;
  readonly archivedBy:      string | null;
  readonly occurredAt:      Date;
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type NotificationTemplateDomainEvent =
  | TemplateCreatedEvent
  | TemplatePublishedEvent
  | TemplateVersionCreatedEvent
  | TemplateDeprecatedEvent
  | TemplateArchivedEvent;
