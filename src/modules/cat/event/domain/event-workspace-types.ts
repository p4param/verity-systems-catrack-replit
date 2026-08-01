// EM-WP01 — Event Foundation, extended by EM-WP02 — Event Planning and
// EM-WP03 — Menu Planning.
// The Event Workspace's tab structure. Overview (EM-WP01), Planning
// (EM-WP02), and Menu Planning (EM-WP03) exist so far — Kitchen,
// Procurement, Inventory, Timeline engine, Tasks, Documents, Billing,
// Recipes, Costing, and Vendors are explicitly out of scope and will each
// get their own key here once built, following the same pattern as
// proposal-workspace-types.ts for the Quotation Workspace.

export type EventWorkspaceKey = 'OVERVIEW' | 'PLANNING' | 'MENU_PLANNING';

export interface EventWorkspaceNavItem {
  key: EventWorkspaceKey;
  label: string;
  description: string;
}

export const EVENT_WORKSPACE_NAV_ITEMS: EventWorkspaceNavItem[] = [
  { key: 'OVERVIEW', label: 'Overview', description: 'Event identity, customer, details, commercial summary, and source proposal.' },
  { key: 'PLANNING', label: 'Planning', description: 'Operational planning brief: summary, timeline, key contacts, notes, risks, and checklist.' },
  { key: 'MENU_PLANNING', label: 'Menu Planning', description: 'What will be served: Meals, Categories, Menu Items, Dietary Requirements, and Service Instructions.' },
];
