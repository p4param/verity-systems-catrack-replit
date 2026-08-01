'use client';

import React from 'react';
import {
  ArrowRightLeft,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileText,
  Gavel,
  History,
  ListChecks,
  Lock,
  ScrollText,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';

import {
  PROPOSAL_WORKSPACE_NAV_ITEMS,
  ProposalWorkspaceKey,
  ProposalWorkspaceNavItem,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';

const WORKSPACE_ICONS: Record<ProposalWorkspaceKey, React.ComponentType<{ className?: string }>> = {
  EXECUTIVE_SUMMARY: Sparkles,
  SCOPE_OF_SERVICES: ListChecks,
  PROPOSAL_NARRATIVE: ScrollText,
  PROPOSAL_HIGHLIGHTS: Star,
  ASSUMPTIONS_EXCLUSIONS: ClipboardList,
  COMMERCIALS: DollarSign,
  TERMS_CONDITIONS: FileText,
  PROPOSAL_REVIEW: ClipboardCheck,
  REVISIONS: History,
  CUSTOMER_DELIVERY: Send,
  CUSTOMER_DECISION: Gavel,
  EVENT_CONVERSION: ArrowRightLeft,
};

// UX Polish — presentation-only grouping for the navigator's layout. Not a
// data source: PROPOSAL_WORKSPACE_NAV_ITEMS in proposal-workspace-types.ts
// remains the single source of truth for workspace order, labels, and
// disabled/comingIn state. This just says which row each key renders in.
interface WorkspaceRow {
  label: string;
  keys: ProposalWorkspaceKey[];
}

const WORKSPACE_ROWS: WorkspaceRow[] = [
  {
    label: 'Proposal Authoring',
    keys: ['EXECUTIVE_SUMMARY', 'SCOPE_OF_SERVICES', 'PROPOSAL_NARRATIVE', 'PROPOSAL_HIGHLIGHTS'],
  },
  {
    label: 'Commercial',
    keys: ['ASSUMPTIONS_EXCLUSIONS', 'COMMERCIALS', 'TERMS_CONDITIONS'],
  },
  {
    label: 'Proposal Lifecycle',
    keys: ['PROPOSAL_REVIEW', 'REVISIONS', 'CUSTOMER_DELIVERY', 'CUSTOMER_DECISION', 'EVENT_CONVERSION'],
  },
];

const NAV_ITEM_BY_KEY: Record<ProposalWorkspaceKey, ProposalWorkspaceNavItem> = PROPOSAL_WORKSPACE_NAV_ITEMS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<ProposalWorkspaceKey, ProposalWorkspaceNavItem>,
);

interface ProposalWorkspaceNavigatorProps {
  activeWorkspace: ProposalWorkspaceKey;
  onSelect: (key: ProposalWorkspaceKey) => void;
}

// Consistent with the existing Inquiry Workspace and QM-WP01 Quotation
// Workspace navigation: horizontal, no layout redesign. Styled as a titled
// navigator card (spaced pill items, clear active state) rather than a
// browser-style connected tab strip. Grown from 7 to 11 workspaces, the
// items are now grouped into three rows reflecting the business workflow
// (Proposal Authoring → Commercial → Proposal Lifecycle) — visual grouping
// only, identical click behavior and identical underlying order.
export function ProposalWorkspaceNavigator({ activeWorkspace, onSelect }: ProposalWorkspaceNavigatorProps) {
  const renderItem = (item: ProposalWorkspaceNavItem) => {
    const Icon = WORKSPACE_ICONS[item.key];
    const isActive = activeWorkspace === item.key;

    if (item.disabled) {
      return (
        <span
          key={item.key}
          title={`${item.description} — Coming in ${item.comingIn}`}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap text-muted-foreground/40 border border-dashed border-border/40 cursor-not-allowed"
        >
          <Lock className="w-3 h-3" />
          <span>{item.label}</span>
        </span>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onSelect(item.key)}
        title={item.description}
        className={`px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
          isActive
            ? 'bg-primary text-primary-foreground font-extrabold shadow-sm'
            : 'font-bold text-muted-foreground border border-transparent hover:border-border/50 hover:text-foreground hover:bg-muted/40'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-3.5 space-y-3">
      <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-0.5">
        Proposal Workspaces
      </div>
      <div className="space-y-2.5">
        {WORKSPACE_ROWS.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider px-0.5">{row.label}</div>
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
              {row.keys.map((key) => renderItem(NAV_ITEM_BY_KEY[key]))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
