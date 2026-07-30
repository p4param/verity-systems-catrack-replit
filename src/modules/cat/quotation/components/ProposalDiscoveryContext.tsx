'use client';

import React from 'react';
import { Building2, Calendar, FileText, MapPin, Users } from 'lucide-react';

import { QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';

interface ProposalDiscoveryContextProps {
  quotation: QuotationDetail;
}

// Shared read-only Discovery Context block, reused across Proposal
// Workspaces (Executive Summary, Scope of Services, ...). Extracted here
// because it is now required by more than one workspace — not built ahead
// of need. Discovery remains the source of truth; these values are
// inherited from the Inquiry at fetch time and never duplicated/persisted
// onto the Quotation or any Proposal Workspace.
export function ProposalDiscoveryContext({ quotation }: ProposalDiscoveryContextProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discovery Context</div>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
          Read-only from Inquiry
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 border border-border/30 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground/60 mt-1 shrink-0" />
          <div>
            <div className="text-[9px] text-muted-foreground/70 font-normal uppercase tracking-wide">Relationship</div>
            <div className="text-sm font-bold text-foreground">{quotation.relationshipName || 'Unassigned'}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground/60 mt-1 shrink-0" />
          <div>
            <div className="text-[9px] text-muted-foreground/70 font-normal uppercase tracking-wide">Inquiry</div>
            <div className="text-sm font-bold text-foreground">
              <span className="font-mono text-[10px] font-bold px-1 py-0.2 bg-muted/60 text-muted-foreground rounded mr-1 align-middle">
                {quotation.inquiryNumber}
              </span>
              {quotation.inquiryTitle}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground/60 mt-1 shrink-0" />
          <div>
            <div className="text-[9px] text-muted-foreground/70 font-normal uppercase tracking-wide">Event</div>
            <div className="text-sm font-bold text-foreground">
              {quotation.occasion || 'Not set'}
              {quotation.eventDate ? ` • ${new Date(quotation.eventDate).toLocaleDateString()}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground/60 mt-1 shrink-0" />
          <div>
            <div className="text-[9px] text-muted-foreground/70 font-normal uppercase tracking-wide">Guest Count</div>
            <div className="text-sm font-bold text-foreground">{quotation.guestCount ?? 'Not set'}</div>
          </div>
        </div>
        <div className="flex items-start gap-2 sm:col-span-2">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 mt-1 shrink-0" />
          <div>
            <div className="text-[9px] text-muted-foreground/70 font-normal uppercase tracking-wide">Venue</div>
            <div className="text-sm font-bold text-foreground">{quotation.venueName || 'Not set'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
