// EM-WP02 — Event Planning.
// The operational planning brief for an Event. Not task management, not
// procurement, not menu planning. Six normalized entities: one singular
// Operational Summary/Notes record (1:1 with the Event) and four
// repeatable lists (Event Timeline, Key Contacts, Risks & Special
// Instructions, Planning Checklist), following the Collection Authoring
// Pattern already established for Quotation list sections. No status,
// revision, workflow, or approval fields anywhere — Planning is editable
// only, saved and reloaded as-is via a single GET/PUT pair.

export interface EventPlanningSummary {
  operationsOwner?: string;
  operationsContactPhone?: string;
  operationsContactEmail?: string;
  operationalSummary?: string;
  operationalNotes?: string;
}

export interface EventTimelineItem {
  id: string;
  timeLabel: string;
  activity: string;
  responsibleParty?: string;
  notes?: string;
  displayOrder: number;
}

export interface EventKeyContact {
  id: string;
  contactName: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
  displayOrder: number;
}

export interface EventRisk {
  id: string;
  statement: string;
  displayOrder: number;
}

export interface EventPlanningChecklistItem {
  id: string;
  itemText: string;
  isComplete: boolean;
  displayOrder: number;
}

export interface EventPlanningDetail {
  summary: EventPlanningSummary;
  timeline: EventTimelineItem[];
  contacts: EventKeyContact[];
  risks: EventRisk[];
  checklist: EventPlanningChecklistItem[];
}

// Input shapes accepted by PUT /api/cat/events/{id}/planning — the client
// always sends the entire current state of every list; the endpoint
// reconciles each list (delete removed, upsert incoming) in one
// transaction, matching the Collection Authoring Pattern's "Save" semantics
// minus any status field (Planning has no workflow).

export interface EventTimelineItemInput {
  id: string;
  timeLabel: string;
  activity: string;
  responsibleParty?: string;
  notes?: string;
}

export interface EventKeyContactInput {
  id: string;
  contactName: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface EventRiskInput {
  id: string;
  statement: string;
}

export interface EventPlanningChecklistItemInput {
  id: string;
  itemText: string;
  isComplete: boolean;
}

export interface EventPlanningSavePayload {
  summary: EventPlanningSummary;
  timeline: EventTimelineItemInput[];
  contacts: EventKeyContactInput[];
  risks: EventRiskInput[];
  checklist: EventPlanningChecklistItemInput[];
}
