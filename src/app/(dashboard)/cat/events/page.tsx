'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Search,
  Building2,
  FileText,
  MapPin,
  ChefHat,
  Wallet,
} from 'lucide-react';

import { EventStatus, EVENT_STATUS_LABELS } from '@/modules/cat/event/domain/event-types';
import { formatCurrency } from '@/modules/cat/quotation/domain/proposal-pricing-types';

// EM-WP01 — Event Foundation.
// Events Directory: standard CAT directory pattern (KPIs, Grid, Search,
// Filters, Sorting, Row navigation), following the visual convention
// established by the Inquiry and Quotation Directories. Events are
// read-only here — no Quick Create, no manual Event creation. Every Event
// is produced only via Quotation Conversion (QM-WP04E).

interface EventListRow {
  id: string;
  eventNumber: string;
  eventName: string;
  status: EventStatus;
  relationshipId: string;
  relationshipName: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: number;
  grandTotal?: number;
  currencyCode: string;
  originQuotationId: string;
  originQuotationNumber: string;
  originQuotationRevision: number;
  createdAt: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  PLANNING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

export default function EventsDirectoryPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('created_desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (sort) params.set('sort', sort);

      const res = await fetch(`/api/cat/events?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEvents(data.items || []);
      } else {
        console.error('Events API error:', data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEvents();
    }, 300);
    return () => clearTimeout(handler);
  }, [query, dateFrom, dateTo, sort]);

  // KPI Calculations (client-side, matching the Inquiry/Quotation Directory convention)
  const totalCount = events.length;
  const upcomingCount = events.filter((e) => e.eventDate && new Date(e.eventDate) >= new Date()).length;
  const totalGuestCount = events.reduce((sum, e) => sum + (e.guestCount || 0), 0);
  const totalBudget = events.reduce((sum, e) => sum + (e.grandTotal || 0), 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <ChefHat className="w-3.5 h-3.5" />
            <span>EM-WP01 — Event Foundation</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Event Directory</h1>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground tracking-tight">{totalCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Events</div>
          </div>
          <Calendar className="w-4 h-4 text-primary/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{upcomingCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Upcoming</div>
          </div>
          <Calendar className="w-4 h-4 text-blue-500/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{totalGuestCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Guests</div>
          </div>
          <Building2 className="w-4 h-4 text-indigo-500/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(totalBudget)}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Budget</div>
          </div>
          <Wallet className="w-4 h-4 text-emerald-500/70" />
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search event, customer or EVT number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="event_date_asc">Event Date (Earliest)</option>
            <option value="event_date_desc">Event Date (Latest)</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Event date from"
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Event date to"
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
          />
        </div>
      </div>

      {/* 4. Directory Table */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading Event Directory...
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No events yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Events are created automatically when a Quotation is converted from the Sales workspace.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Event Number / Name</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-2">Event Date / Venue</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Budget</div>
              <div className="col-span-2 text-right">Source Quotation</div>
            </div>

            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => router.push(`/cat/events/${ev.id}`)}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded">
                      {ev.eventNumber}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate mt-0.5">
                    {ev.eventName}
                  </div>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  <Building2 className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{ev.relationshipName || 'Unassigned'}</span>
                </div>

                <div className="col-span-2 text-xs">
                  {ev.eventDate ? (
                    <div className="text-foreground flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-muted-foreground/60" />
                      <span>{new Date(ev.eventDate).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                  {ev.venue && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border ${
                      STATUS_BADGE_CLASS[ev.status] || STATUS_BADGE_CLASS.PLANNING
                    }`}
                  >
                    {EVENT_STATUS_LABELS[ev.status] || ev.status}
                  </span>
                </div>

                <div className="col-span-2 text-right text-xs font-bold text-foreground">
                  {ev.grandTotal !== undefined ? formatCurrency(ev.grandTotal) : '—'}
                </div>

                <div className="col-span-2 text-right text-xs text-muted-foreground flex items-center justify-end gap-1.5 truncate">
                  <FileText className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{ev.originQuotationNumber} (R{ev.originQuotationRevision})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
