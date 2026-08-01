// EM-WP01 — Event Foundation.
// The Event Workspace's tab structure. Only Overview exists in this Work
// Package — Planning, Menu, Kitchen, Procurement, Inventory, Timeline,
// Staff, and Billing are explicitly out of scope and will each get their
// own key here once built, following the same pattern as
// proposal-workspace-types.ts for the Quotation Workspace.

export type EventWorkspaceKey = 'OVERVIEW';

export interface EventWorkspaceNavItem {
  key: EventWorkspaceKey;
  label: string;
  description: string;
}

export const EVENT_WORKSPACE_NAV_ITEMS: EventWorkspaceNavItem[] = [
  { key: 'OVERVIEW', label: 'Overview', description: 'Event identity, customer, details, commercial summary, and source proposal.' },
];
