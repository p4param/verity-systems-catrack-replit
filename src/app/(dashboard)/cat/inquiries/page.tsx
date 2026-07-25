'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Filter,
  X,
  ChevronRight,
  UserCheck,
  Building2,
  DollarSign,
  AlertCircle
} from 'lucide-react';

import { RelationshipPicker } from '@/components/cat/RelationshipPicker';

interface InquiryItem {
  id: string;
  inquiryNumber: string;
  title: string;
  relationshipId: string;
  relationshipName?: string;
  eventType: string;
  tentativeEventDate?: string;
  expectedGuestCount?: number;
  budgetRange?: string;
  priority: string;
  inquiryStage: string;
  assignedSalesperson?: string;
  createdAt: string;
  updatedAt: string;
}

interface RelationshipOption {
  id: string;
  name: string;
  relationshipNumber: string;
}

export default function InquiriesDirectoryDashboardPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');

  // Quick Create Drawer State
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [relId, setRelId] = useState('');
  const [inqTitle, setInqTitle] = useState('');
  const [evtType, setEvtType] = useState('WEDDING');
  const [tentativeDate, setTentativeDate] = useState('');
  const [venue, setVenue] = useState(''); // PR-IM-002 Item 3: Lightweight Venue Indicator
  const [guestCount, setGuestCount] = useState('');
  const [salesperson, setSalesperson] = useState('Sales Team');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Inquiries with debounced search
  const fetchInquiries = async (searchQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (stageFilter) params.set('stage', stageFilter);
      if (eventTypeFilter) params.set('eventType', eventTypeFilter);
      if (salespersonFilter) params.set('salesperson', salespersonFilter);

      const res = await fetch(`/api/cat/inquiries?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setInquiries(data.items || []);
      } else {
        console.error('Inquiries API error:', data);
      }
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setLoading(false);
    }
  };


  // Fetch Relationships for Quick Create selector
  const fetchRelationshipsOptions = async () => {
    try {
      const res = await fetch('/api/cat/relationships');
      const data = await res.json();
      if (data.success) {
        setRelationships(data.items || []);
        if (data.items?.length > 0 && !relId) {
          setRelId(data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load relationships options:', err);
    }
  };

  // Instant Debounced Search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInquiries(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, stageFilter, eventTypeFilter, salespersonFilter]);

  useEffect(() => {
    fetchRelationshipsOptions();
  }, []);

  // Quick Create Submit - Auto-navigates directly to workspace (AG Revision 6 & PR-IM-002 Item 3)
  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relId || !inqTitle.trim() || !evtType) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/cat/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId: relId,
          title: inqTitle,
          eventType: evtType,
          tentativeEventDate: tentativeDate || undefined,
          venue: venue.trim() || undefined,
          expectedGuestCount: guestCount ? parseInt(guestCount) : undefined,
          assignedSalesperson: salesperson,
        }),
      });

      const data = await res.json();

      if (data.success && data.inquiry?.id) {
        setShowQuickCreate(false);
        resetForm();
        // Direct Navigation to Workspace (AG Revision 6)
        router.push(`/cat/inquiries/${data.inquiry.id}`);
      } else {
        alert(`Error creating inquiry: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setInqTitle('');
    setEvtType('WEDDING');
    setTentativeDate('');
    setVenue('');
    setGuestCount('');
    setSalesperson('Sales Team');
  };

  // Sales Pipeline KPI Calculations (AG Revision 5)
  const totalCount = inquiries.length;
  const newDiscoveryCount = inquiries.filter(i => i.inquiryStage === 'NEW' || i.inquiryStage === 'DISCOVERY').length;
  const qualifiedCount = inquiries.filter(i => i.inquiryStage === 'QUALIFIED').length;
  const quoteActiveCount = inquiries.filter(i => i.inquiryStage === 'QUOTATION_REQUESTED' || i.inquiryStage === 'QUOTATION_SUBMITTED').length;
  const negotiationCount = inquiries.filter(i => i.inquiryStage === 'NEGOTIATION').length;
  const wonBookedCount = inquiries.filter(i => i.inquiryStage === 'WON' || i.inquiryStage === 'BOOKED').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <FileText className="w-3.5 h-3.5" />
            <span>IM-WP01 — Inquiry Foundation</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Inquiry Directory</h1>
        </div>

        <button
          onClick={() => setShowQuickCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Create Inquiry</span>
        </button>
      </div>

      {/* 2. Sales Pipeline KPI Cards (PR-IM-002 Item 6: Increased number emphasis, reduced label weight) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground tracking-tight">{totalCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Total Inquiries</div>
          </div>
          <FileText className="w-4 h-4 text-primary/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{newDiscoveryCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">New & Discovery</div>
          </div>
          <Clock className="w-4 h-4 text-blue-500/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{qualifiedCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Qualified</div>
          </div>
          <UserCheck className="w-4 h-4 text-amber-500/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{quoteActiveCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Quotation Active</div>
          </div>
          <DollarSign className="w-4 h-4 text-indigo-500/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{negotiationCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Negotiation</div>
          </div>
          <TrendingUp className="w-4 h-4 text-purple-500/70" />
        </div>

        <div className="bg-card py-3 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{wonBookedCount}</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 tracking-tight">Won & Booked</div>
          </div>
          <Award className="w-4 h-4 text-emerald-500/70" />
        </div>
      </div>

      {/* 3. Search & Multi-Filter Toolbar (PR-IM-002 Item 7: Updated placeholder) */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search inquiry, relationship or INQ number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
            <span className="text-[10px] text-muted-foreground font-medium px-2">Stage:</span>
            {['', 'NEW', 'DISCOVERY', 'QUALIFIED', 'QUOTATION_SUBMITTED', 'WON', 'BOOKED'].map((st) => (
              <button
                key={st}
                onClick={() => setStageFilter(st)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  stageFilter === st
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === '' ? 'All' : st}
              </button>
            ))}
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Event Types</option>
            <option value="WEDDING">Wedding</option>
            <option value="CORPORATE">Corporate</option>
            <option value="BIRTHDAY">Birthday</option>
            <option value="ANNIVERSARY">Anniversary</option>
            <option value="SOCIAL">Social</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* 4. Directory Table (Full Clickable Rows -> Direct Workspace Navigation) */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading Inquiry Directory...
          </div>
        ) : inquiries.length === 0 ? (
          /* PR-IM-002 Item 5: Refined Empty State Message */
          <div className="p-10 text-center space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No inquiries yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click &apos;Quick Create Inquiry&apos; to record your first customer inquiry.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-4">Inquiry / Title</div>
              <div className="col-span-3 sm:col-span-3">Relationship</div>
              <div className="col-span-2 sm:col-span-2">Event Type & Date</div>
              <div className="col-span-3 sm:col-span-3 text-right">Stage</div>
            </div>

            {/* Clickable Table Rows */}
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                onClick={() => router.push(`/cat/inquiries/${inq.id}`)}
                className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                {/* Inquiry Number & Title */}
                <div className="col-span-4 sm:col-span-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded">
                      {inq.inquiryNumber}
                    </span>
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                      {inq.title}
                    </span>
                  </div>
                </div>

                {/* Relationship */}
                <div className="col-span-3 sm:col-span-3 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  <Building2 className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{inq.relationshipName || 'Unassigned Account'}</span>
                </div>

                {/* Event Type & Date */}
                <div className="col-span-2 sm:col-span-2 text-xs">
                  <div className="font-medium text-foreground capitalize">{inq.eventType.toLowerCase()}</div>
                  {inq.tentativeEventDate && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{new Date(inq.tentativeEventDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Inquiry Stage Badge */}
                <div className="col-span-3 sm:col-span-3 text-right">
                  <span
                    className={`inline-flex items-center text-[10px] px-2.5 py-0.5 font-bold rounded-full border ${
                      inq.inquiryStage === 'BOOKED' || inq.inquiryStage === 'WON'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : inq.inquiryStage === 'QUOTATION_SUBMITTED' || inq.inquiryStage === 'NEGOTIATION'
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        : inq.inquiryStage === 'QUALIFIED' || inq.inquiryStage === 'QUOTATION_REQUESTED'
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    }`}
                  >
                    {inq.inquiryStage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Quick Create Drawer (PR-IM-002: Venue field + Approx. Guests label) */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border/40 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Quick Create Inquiry</h3>
                <p className="text-[11px] text-muted-foreground">Minimal friction entry (under 2 minutes)</p>
              </div>
              <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="space-y-3 text-xs">
              {/* Field 1: Searchable Relationship Picker */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Relationship Account *</label>
                <RelationshipPicker
                  value={relId}
                  onChange={(id) => setRelId(id)}
                  required
                />
              </div>

              {/* Field 2: Inquiry Title */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Inquiry Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Gala Dinner 2026"
                  value={inqTitle}
                  onChange={(e) => setInqTitle(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              {/* Field 3: Event Type */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Event Type *</label>
                <select
                  value={evtType}
                  onChange={(e) => setEvtType(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="WEDDING">Wedding</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="BIRTHDAY">Birthday</option>
                  <option value="ANNIVERSARY">Anniversary</option>
                  <option value="SOCIAL">Social</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Field 4: Tentative Event Date */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Tentative Event Date</label>
                <input
                  type="date"
                  value={tentativeDate}
                  onChange={(e) => setTentativeDate(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              {/* Field 5: Venue (PR-IM-002 Item 3: Initial Venue Indicator) */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Grand Ballroom, Taj Palace"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              {/* Field 6: Approx. Guests (PR-IM-002 Item 4: Renamed Label) */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Approx. Guests</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              {/* Field 7: Assigned Salesperson */}
              <div>
                <label className="block font-semibold text-foreground mb-1">Assigned Salesperson</label>
                <input
                  type="text"
                  placeholder="Salesperson name"
                  value={salesperson}
                  onChange={(e) => setSalesperson(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="px-3.5 py-2 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Open Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
