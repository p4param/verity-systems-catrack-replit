'use client';

import React from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileText,
  ListChecks,
  Lock,
  ScrollText,
  Sparkles,
  Star,
} from 'lucide-react';

import { PROPOSAL_WORKSPACE_NAV_ITEMS, ProposalWorkspaceKey } from '@/modules/cat/quotation/domain/proposal-workspace-types';

const WORKSPACE_ICONS: Record<ProposalWorkspaceKey, React.ComponentType<{ className?: string }>> = {
  EXECUTIVE_SUMMARY: Sparkles,
  SCOPE_OF_SERVICES: ListChecks,
  PROPOSAL_NARRATIVE: ScrollText,
  PROPOSAL_HIGHLIGHTS: Star,
  ASSUMPTIONS_EXCLUSIONS: ClipboardList,
  COMMERCIALS: DollarSign,
  TERMS_CONDITIONS: FileText,
  PROPOSAL_REVIEW: ClipboardCheck,
};

interface ProposalWorkspaceNavigatorProps {
  activeWorkspace: ProposalWorkspaceKey;
  onSelect: (key: ProposalWorkspaceKey) => void;
}

// Consistent with the existing Inquiry Workspace and QM-WP01 Quotation
// Workspace navigation: horizontal, no layout redesign. Styled as a titled
// navigator card (spaced pill items, clear active state) rather than a
// browser-style connected tab strip.
export function ProposalWorkspaceNavigator({ activeWorkspace, onSelect }: ProposalWorkspaceNavigatorProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-3.5 space-y-2.5">
      <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider px-0.5">
        Proposal Workspaces
      </div>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
        {PROPOSAL_WORKSPACE_NAV_ITEMS.map((item) => {
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
        })}
      </div>
    </div>
  );
}
