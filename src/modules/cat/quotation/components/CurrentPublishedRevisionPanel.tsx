'use client';

import React from 'react';
import { CheckCircle2, Eye, FileCheck } from 'lucide-react';

// Only the fields this panel actually renders — deliberately narrower than
// revision-management-types.ts's full PublishedRevisionSummary (which also
// carries `id`/`status`, meaningful to the Published Revisions list but
// not to this panel). QM-WP04E's conversion-eligibility endpoint returns
// exactly this shape without needing to fabricate the extra fields.
interface PublishedRevisionInfo {
  revisionNumber: number;
  publishedAt: string;
  publishedBy?: {
    id: string;
    fullName: string;
  };
}

interface CurrentPublishedRevisionPanelProps {
  latestPublished: PublishedRevisionInfo | null;
  onViewSnapshot: () => void;
  emptyMessage: string;
  // Optional — QM-WP04E's "Current Proposal" section wants the Quotation
  // Number shown alongside the revision; QM-WP04B/QM-WP04D don't pass it
  // and render exactly as before.
  quotationNumber?: string;
}

// Shared "Current Published Revision" panel — first introduced in
// QM-WP04B (Customer Delivery), reused as-is by QM-WP04D (Customer
// Decision) and QM-WP04E (Event Conversion) rather than duplicated. All
// three workspaces act on the same concept: whatever the latest entry in
// cat_quotation_publications is for this quotation, never a working draft.
export function CurrentPublishedRevisionPanel({
  latestPublished,
  onViewSnapshot,
  emptyMessage,
  quotationNumber,
}: CurrentPublishedRevisionPanelProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center gap-2">
        <FileCheck className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground">Current Published Revision</h3>
      </div>
      <div className="p-5">
        {!latestPublished ? (
          <div className="text-xs text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-black text-foreground">Revision {latestPublished.revisionNumber}</div>
                {quotationNumber && <div className="text-[11px] text-muted-foreground font-mono">{quotationNumber}</div>}
                <div className="text-[11px] text-muted-foreground">
                  Published {new Date(latestPublished.publishedAt).toLocaleString()}
                  {latestPublished.publishedBy ? ` by ${latestPublished.publishedBy.fullName}` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onViewSnapshot}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              View Snapshot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
