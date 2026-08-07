// PM-WP03B — Purchase Order Workspace navigation. Overview and Order
// Items are real, functional tabs. Activity, Documents, and Notes are
// deliberate placeholders per the PM-WP03A Engineering Package — no
// backing table, no write path, rendered via the same locked/disabled
// tab mechanism the Quotation Proposal Workspace already established
// (ProposalWorkspaceNavigator.tsx), not a new "coming soon" pattern.

export type PurchaseOrderWorkspaceKey = 'OVERVIEW' | 'ORDER_ITEMS' | 'ACTIVITY' | 'DOCUMENTS' | 'NOTES';

export interface PurchaseOrderWorkspaceNavItem {
  key: PurchaseOrderWorkspaceKey;
  label: string;
  description: string;
  disabled: boolean;
  comingIn?: string;
}

export const PURCHASE_ORDER_WORKSPACE_NAV_ITEMS: PurchaseOrderWorkspaceNavItem[] = [
  {
    key: 'OVERVIEW',
    label: 'Overview',
    description: 'Identity, Vendor, Work Date, status, and lifecycle actions.',
    disabled: false,
  },
  {
    key: 'ORDER_ITEMS',
    label: 'Order Items',
    description: 'What is being ordered, and how much — editable while Draft.',
    disabled: false,
  },
  {
    key: 'ACTIVITY',
    label: 'Activity',
    description: 'A full audit trail of everything that happened on this Purchase Order.',
    disabled: true,
    comingIn: 'a future work package',
  },
  {
    key: 'DOCUMENTS',
    label: 'Documents',
    description: 'Attach the issued PDF, Vendor acknowledgements, and related files.',
    disabled: true,
    comingIn: 'a future work package',
  },
  {
    key: 'NOTES',
    label: 'Notes',
    description: 'Free-text notes and internal discussion for this Purchase Order.',
    disabled: true,
    comingIn: 'a future work package',
  },
];
