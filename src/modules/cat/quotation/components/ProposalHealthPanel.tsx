'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, HeartPulse } from 'lucide-react';

import { ProposalWorkspaceStatus } from '@/modules/cat/quotation/domain/quotation-types';
import {
  PROPOSAL_HEALTH_WORKSPACE_KEYS,
  PROPOSAL_WORKSPACE_LABELS,
  ProposalWorkspaceKey,
} from '@/modules/cat/quotation/domain/proposal-workspace-types';

interface ProposalHealthPanelProps {
  // Only implemented workspaces (Executive Summary, Scope of Services) have
  // a real status. Workspaces not present in this map are still placeholders
  // and always read as Not Started — health is updated only from each
  // workspace's own status, never inferred or validated here.
  workspaceStatuses: Partial<Record<ProposalWorkspaceKey, ProposalWorkspaceStatus>>;
}

const STATUS_ICON: Record<ProposalWorkspaceStatus, React.ReactNode> = {
  NOT_STARTED: <Circle className="w-3.5 h-3.5 text-muted-foreground/50" />,
  IN_PROGRESS: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  READY: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
};

export function ProposalHealthPanel({ workspaceStatuses }: ProposalHealthPanelProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
        <HeartPulse className="w-4 h-4 text-primary" />
        <span>Proposal Health</span>
        <span className="text-[10px] font-medium text-muted-foreground normal-case">(informational only)</span>
      </div>

      <div className="space-y-1.5">
        {PROPOSAL_HEALTH_WORKSPACE_KEYS.map((key) => {
          const status = workspaceStatuses[key] ?? 'NOT_STARTED';
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              {STATUS_ICON[status]}
              <span className="text-foreground font-medium">{PROPOSAL_WORKSPACE_LABELS[key]}</span>
            </div>
          );
        })}

        <div className="pt-1.5 mt-1.5 border-t border-border/30 space-y-1.5">
          {(['COMMERCIALS', 'TERMS_CONDITIONS'] as ProposalWorkspaceKey[]).map((key) => (
            <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/40 uppercase tracking-wider">
                Waiting
              </span>
              <span className="font-medium">{PROPOSAL_WORKSPACE_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
