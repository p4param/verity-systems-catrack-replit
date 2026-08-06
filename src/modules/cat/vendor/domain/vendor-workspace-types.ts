// PM-WP01 — Vendor Master. The Vendor Workspace's tab structure. Overview
// and Supply Portfolio exist so far. Unlike the Event Workspace (a new tab
// per capability), Supply Portfolio stays a single tab as future resource
// types (Equipment, Packaging, Consumables, Rentals, Transport, Services)
// are added — they become new sections/groups inside that one tab, per
// Product Review, not new top-level tabs.

export type VendorWorkspaceKey = 'OVERVIEW' | 'SUPPLY_PORTFOLIO';

export interface VendorWorkspaceNavItem {
  key: VendorWorkspaceKey;
  label: string;
  description: string;
}

export const VENDOR_WORKSPACE_NAV_ITEMS: VendorWorkspaceNavItem[] = [
  { key: 'OVERVIEW', label: 'Overview', description: 'Identity, classification, contact, and commercial terms.' },
  {
    key: 'SUPPLY_PORTFOLIO',
    label: 'Supply Portfolio',
    description: 'What this Vendor supplies — Ingredients today, other resource types as they are built.',
  },
];
