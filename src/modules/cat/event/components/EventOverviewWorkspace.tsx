'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Calendar, DollarSign, Eye, FileText, MapPin, Users } from 'lucide-react';

import { EventSummary, EVENT_STATUS_LABELS } from '@/modules/cat/event/domain/event-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { PublicationDetail } from '@/modules/cat/quotation/domain/revision-management-types';
import { SnapshotViewerDialog } from '@/modules/cat/quotation/components/SnapshotViewerDialog';

interface EventOverviewWorkspaceProps {
  event: EventSummary;
}

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{label}</div>
      <div className="font-bold text-foreground text-xs mt-0.5">{value}</div>
    </div>
  );
}

// EM-WP01 — Event Foundation: Event Overview.
// The only workspace this Work Package delivers. Purely a read-only
// presentation of what Conversion (QM-WP04E) already wrote onto the
// Event — no field here is editable, and no Planning/Menu/Kitchen/
// Procurement/Inventory/Timeline/Staff/Billing content is included.
// Reuses SnapshotViewerDialog rather than duplicating the Published
// Proposal presentation.
export function EventOverviewWorkspace({ event }: EventOverviewWorkspaceProps) {
  const router = useRouter();

  const [publication, setPublication] = useState<PublicationDetail | null>(null);
  const [publicationLoading, setPublicationLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    setPublicationLoading(true);
    fetch(`/api/cat/quotations/${event.originQuotationId}/publications/${event.originQuotationRevision}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPublication(data.publication);
      })
      .catch((err) => console.error('Failed to load source snapshot for Event Overview:', err))
      .finally(() => setPublicationLoading(false));
  }, [event.originQuotationId, event.originQuotationRevision]);

  return (
    <div className="space-y-4">
      {/* 1. Event Identity */}
      <Section title="Event Identity" icon={Calendar}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Event Number" value={event.eventNumber} />
          <Field label="Event Name" value={event.eventName} />
          <Field
            label="Status"
            value={
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 font-bold rounded-full border bg-blue-500/10 text-blue-600 border-blue-500/20">
                {EVENT_STATUS_LABELS[event.status]}
              </span>
            }
          />
          {event.eventType && <Field label="Event Type" value={event.eventType} />}
        </div>
      </Section>

      {/* 2. Customer */}
      <Section title="Customer" icon={Building2}>
        <button
          type="button"
          onClick={() => router.push(`/cat/relationships/${event.relationshipId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          {event.relationshipName}
        </button>
      </Section>

      {/* 3. Event Details */}
      <Section title="Event Details" icon={MapPin}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Event Date" value={event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Not set'} />
          <Field label="Venue" value={event.venue || 'Not set'} />
          <Field
            label="Guest Count"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3 h-3 text-muted-foreground/60" />
                {event.guestCount ?? 'Not set'}
              </span>
            }
          />
        </div>
      </Section>

      {/* 4. Commercial Summary */}
      <Section title="Commercial Summary" icon={DollarSign}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-primary/80 uppercase tracking-wide font-bold">Budget</div>
            <div className="text-base font-black text-primary mt-0.5">
              {event.grandTotal !== undefined ? formatCurrency(event.grandTotal) : 'Not available'}
            </div>
          </div>
          <Field label="Currency" value={event.currencyCode} />
        </div>
      </Section>

      {/* 5. Source */}
      <Section
        title="Source"
        icon={FileText}
        action={
          <button
            type="button"
            onClick={() => setViewOpen(true)}
            disabled={!publication}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
          >
            <Eye className="w-3.5 h-3.5" />
            View Snapshot
          </button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Field
            label="Source Quotation"
            value={`${event.originQuotationNumber} — Revision ${event.originQuotationRevision}`}
          />
          <button
            type="button"
            onClick={() => router.push(`/cat/quotations/${event.originQuotationId}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer hover:opacity-90 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            Open Source Quotation
          </button>
        </div>
      </Section>

      <SnapshotViewerDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        publication={publication}
        loading={publicationLoading}
        quotationTitle={event.eventName}
        quotationNumber={event.originQuotationNumber}
      />
    </div>
  );
}
