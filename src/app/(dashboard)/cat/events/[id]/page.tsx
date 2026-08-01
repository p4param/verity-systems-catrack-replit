'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, FileText } from 'lucide-react';

import { EventSummary, EVENT_STATUS_LABELS } from '@/modules/cat/event/domain/event-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';

// QM-WP04E — Event Conversion.
// Deliberately minimal: this Work Package ends immediately after
// successful Event creation. No planning, menu, procurement, kitchen,
// billing, contract, portal, or e-signature UI — just a read-only record
// of what was created and where it came from, reached via "Open Event"
// from the Event Conversion workspace.
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/events/${id}`);
        const data = await res.json();
        if (data.success) setEvent(data.event);
      } catch (err) {
        console.error('Failed to load Event:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Event...</div>;
  }

  if (!event) {
    return (
      <div className="p-10 text-center space-y-2">
        <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Event not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push(`/cat/quotations/${event.originQuotationId}`)}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Source Quotation</span>
      </button>

      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-2">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wide">{event.eventNumber}</span>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">{event.eventName}</h1>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">
            {EVENT_STATUS_LABELS[event.status]}
          </span>
          {event.eventType && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">{event.eventType}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push(`/cat/relationships/${event.relationshipId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer pt-1"
        >
          {event.relationshipName}
        </button>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <h3 className="text-sm font-extrabold text-foreground">Event Details</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Event Date</div>
            <div className="font-bold text-foreground">{event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Not set'}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Venue</div>
            <div className="font-bold text-foreground">{event.venue || 'Not set'}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Guest Count</div>
            <div className="font-bold text-foreground">{event.guestCount ?? 'Not set'}</div>
          </div>
          <div>
            <div className="text-[10px] text-primary/80 uppercase tracking-wide font-bold">Commercial Total</div>
            <div className="text-base font-black text-primary">
              {event.grandTotal !== undefined ? formatCurrency(event.grandTotal) : 'Not available'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Currency</div>
            <div className="font-bold text-foreground">{event.currencyCode}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Created</div>
            <div className="font-bold text-foreground">{new Date(event.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Source Proposal</h3>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={() => router.push(`/cat/quotations/${event.originQuotationId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            {event.originQuotationNumber} — Revision {event.originQuotationRevision}
          </button>
        </div>
      </div>
    </div>
  );
}
