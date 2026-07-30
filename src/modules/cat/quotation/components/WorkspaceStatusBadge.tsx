'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

import { ProposalWorkspaceStatus, PROPOSAL_WORKSPACE_STATUS_LABELS } from '@/modules/cat/quotation/domain/quotation-types';

const BADGE_CLASS: Record<ProposalWorkspaceStatus, string> = {
  NOT_STARTED: 'bg-muted text-muted-foreground border-border/40',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  READY: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const STATUS_ICON: Record<ProposalWorkspaceStatus, React.ReactNode> = {
  NOT_STARTED: <Circle className="w-3 h-3" />,
  IN_PROGRESS: <Clock className="w-3 h-3" />,
  READY: <CheckCircle2 className="w-3 h-3" />,
};

// Shared workspace status badge, reused across Proposal Workspace headers.
// Extracted because it is now required identically by more than one
// workspace (Executive Summary, Scope of Services) — not built ahead of need.
export function WorkspaceStatusBadge({ status }: { status: ProposalWorkspaceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${BADGE_CLASS[status]}`}>
      {STATUS_ICON[status]}
      {PROPOSAL_WORKSPACE_STATUS_LABELS[status]}
    </span>
  );
}
