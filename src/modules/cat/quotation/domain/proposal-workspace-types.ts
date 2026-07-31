// QM-WP02A — Proposal Builder Shell.
// Static definition of the Proposal Workspace Navigator. This is a fixed,
// handcrafted list for QM-WP02A only — not a metadata-driven registry.
// Future work packages may extend this list as new Proposal Workspaces are
// implemented; it is not designed to be generic ahead of that need.

export type ProposalWorkspaceKey =
  | 'EXECUTIVE_SUMMARY'
  | 'SCOPE_OF_SERVICES'
  | 'PROPOSAL_NARRATIVE'
  | 'PROPOSAL_HIGHLIGHTS'
  | 'ASSUMPTIONS_EXCLUSIONS'
  | 'COMMERCIALS'
  | 'TERMS_CONDITIONS'
  | 'PROPOSAL_REVIEW'
  | 'REVISIONS'
  | 'CUSTOMER_DELIVERY'
  | 'CUSTOMER_DECISION';

export interface ProposalWorkspaceNavItem {
  key: ProposalWorkspaceKey;
  label: string;
  // Short description of what the workspace is for — shown on placeholder
  // cards and as navigator hint text. Content only, no behavior change.
  description: string;
  // Only Executive Summary is a fully functional workspace in QM-WP02A.
  implemented: boolean;
  // Commercials and Terms & Conditions are disabled entirely until QM-WP03.
  disabled: boolean;
  comingIn?: string;
}

export const PROPOSAL_WORKSPACE_NAV_ITEMS: ProposalWorkspaceNavItem[] = [
  {
    key: 'EXECUTIVE_SUMMARY',
    label: 'Executive Summary',
    description: 'The commercial overview of the proposal, set before pricing begins.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'SCOPE_OF_SERVICES',
    label: 'Scope of Services',
    description: 'Define the services, packages, and inclusions covered by this proposal.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'PROPOSAL_NARRATIVE',
    label: 'Proposal Narrative',
    description: 'Craft the descriptive narrative that brings the proposal to life for the customer.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'PROPOSAL_HIGHLIGHTS',
    label: 'Proposal Highlights',
    description: 'Curate the standout highlights and signature moments to feature in the proposal.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'ASSUMPTIONS_EXCLUSIONS',
    label: 'Assumptions & Exclusions',
    description: 'Document the assumptions, exclusions, and boundaries of the proposed scope.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'COMMERCIALS',
    label: 'Commercials',
    description: 'Pricing, packages, and commercial terms for this proposal.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'TERMS_CONDITIONS',
    label: 'Terms & Conditions',
    description: 'Legal terms, payment schedule, and cancellation policy.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'PROPOSAL_REVIEW',
    label: 'Proposal Review',
    description: 'Final read-only review of the complete proposal before moving to the next stage.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'REVISIONS',
    label: 'Revisions',
    description: 'View the Working Draft status, published revisions, snapshots, and compare revisions.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'CUSTOMER_DELIVERY',
    label: 'Customer Delivery',
    description: 'Deliver the current published revision to the customer by Email or PDF Download, and review delivery history.',
    implemented: true,
    disabled: false,
  },
  {
    key: 'CUSTOMER_DECISION',
    label: 'Customer Decision',
    description: 'Record the customer\'s decision on the current published revision, and review decision history.',
    implemented: true,
    disabled: false,
  },
];

// The ordered set of workspaces that participate in sequential "Continue
// Building" guidance and the Proposal Health Panel's checklist. Proposal
// Review, Revisions, Customer Delivery, and Customer Decision are
// intentionally excluded — none of them are authoring workspaces with a
// Workspace Status of their own; they're read-only dashboards or
// post-publish actions.
export const PROPOSAL_HEALTH_WORKSPACE_KEYS: ProposalWorkspaceKey[] = [
  'EXECUTIVE_SUMMARY',
  'SCOPE_OF_SERVICES',
  'PROPOSAL_NARRATIVE',
  'PROPOSAL_HIGHLIGHTS',
  'ASSUMPTIONS_EXCLUSIONS',
  'COMMERCIALS',
  'TERMS_CONDITIONS',
];

export const PROPOSAL_WORKSPACE_LABELS: Record<ProposalWorkspaceKey, string> = PROPOSAL_WORKSPACE_NAV_ITEMS.reduce(
  (acc, item) => {
    acc[item.key] = item.label;
    return acc;
  },
  {} as Record<ProposalWorkspaceKey, string>,
);
