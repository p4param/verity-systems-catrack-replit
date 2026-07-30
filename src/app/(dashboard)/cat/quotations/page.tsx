'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Plus,
  Search,
  Building2,
  FileText,
  Calendar,
  X,
} from 'lucide-react';

import { InquiryPicker, InquiryItemOption } from '@/components/cat/InquiryPicker';
import {
  QuotationPurpose,
  QUOTATION_PURPOSE_LABELS,
  QUOTATION_STATUS_LABELS,
} from '@/modules/cat/quotation/domain/quotation-types';

interface QuotationListRow {
  id: string;
  quotationNumber: string;
  title: string;
  purpose: QuotationPurpose;
  status: string;
  inquiryId: string;
  inquiryNumber: string;
  inquiryTitle: string;
  relationshipId: string;
  relationshipName: string;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTER_OPTIONS = ['', 'DRAFT', 'INTERNAL_REVIEW', 'SHARED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'];

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border/40',
  INTERNAL_REVIEW: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SHARED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  EXPIRED: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  CANCELLED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

export default function QuotationsDirectoryPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilterId, setCustomerFilterId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('created_desc');

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [inquiryId, setInquiryId] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItemOption | null>(null);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<QuotationPurpose>('STANDARD_PROPOSAL');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (statusFilter) params.set('status', statusFilter);
      if (customerFilterId) params.set('relationshipId', customerFilterId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (sort) params.set('sort', sort);

      const res = await fetch(`/api/cat/quotations?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setQuotations(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchQuotations();
    }, 300);
    return () => clearTimeout(handler);
  }, [query, statusFilter, customerFilterId, dateFrom, dateTo, sort]);

  const resetForm = () => {
    setInquiryId('');
    setSelectedInquiry(null);
    setTitle('');
    setPurpose('STANDARD_PROPOSAL');
    setDescription('');
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryId || !title.trim() || !purpose) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/cat/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId,
          title,
          purpose,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.quotation?.id) {
        setShowQuickCreate(false);
        resetForm();
        router.push(`/cat/quotations/${data.quotation.id}`);
      } else {
        alert(`Error creating quotation: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <DollarSign className="w-3.5 h-3.5" />
            <span>QM-WP01 — Quotation Foundation</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Quotation Directory</h1>
        </div>

        <button
          onClick={() => setShowQuickCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Create Quotation</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quotation, customer or QT number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
            <span className="text-[10px] text-muted-foreground font-medium px-2">Status:</span>
            {STATUS_FILTER_OPTIONS.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  statusFilter === st ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === '' ? 'All' : QUOTATION_STATUS_LABELS[st as keyof typeof QUOTATION_STATUS_LABELS]}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="updated_desc">Recently Updated</option>
            <option value="title_asc">Title (A-Z)</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Created from"
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Created to"
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
          />

          {customerFilterId && (
            <button
              onClick={() => setCustomerFilterId('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 cursor-pointer"
            >
              <Building2 className="w-3 h-3" />
              <span>Customer filtered</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading Quotation Directory...
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <h3 className="text-sm font-bold text-foreground">No quotations yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click &apos;Quick Create Quotation&apos; to prepare your first commercial proposal.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Number / Title</div>
              <div className="col-span-2">Purpose</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-2">Inquiry</div>
              <div className="col-span-2">Status / Revision</div>
              <div className="col-span-1 text-right">Updated</div>
            </div>

            {quotations.map((q) => (
              <div
                key={q.id}
                onClick={() => router.push(`/cat/quotations/${q.id}`)}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded">
                      {q.quotationNumber}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate mt-0.5">
                    {q.title}
                  </div>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground truncate">
                  {QUOTATION_PURPOSE_LABELS[q.purpose] || q.purpose}
                </div>

                <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  <Building2 className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{q.relationshipName || 'Unassigned'}</span>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  <FileText className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{q.inquiryNumber}</span>
                </div>

                <div className="col-span-2 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border ${
                      STATUS_BADGE_CLASS[q.status] || STATUS_BADGE_CLASS.DRAFT
                    }`}
                  >
                    {QUOTATION_STATUS_LABELS[q.status as keyof typeof QUOTATION_STATUS_LABELS] || q.status}
                  </span>
                  <span className="inline-flex items-center text-[9px] px-2 py-0.5 font-bold rounded-full border bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                    R{q.currentRevisionNumber}
                  </span>
                </div>

                <div className="col-span-1 text-right text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{new Date(q.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border/40 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Quick Create Quotation</h3>
                <p className="text-[11px] text-muted-foreground">Start a new commercial proposal from an existing inquiry</p>
              </div>
              <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Inquiry *</label>
                <InquiryPicker
                  value={inquiryId}
                  onChange={(id, selected) => {
                    setInquiryId(id);
                    setSelectedInquiry(selected || null);
                  }}
                  required
                />
              </div>

              {selectedInquiry && (
                <div className="bg-muted/20 border border-border/30 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Inquiry Summary
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Relationship</div>
                      <div className="font-bold text-foreground truncate">
                        {selectedInquiry.relationshipName || 'Unassigned'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Event Name</div>
                      <div className="font-bold text-foreground truncate">{selectedInquiry.title}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Event Date</div>
                      <div className="font-bold text-foreground">
                        {selectedInquiry.tentativeEventDate
                          ? new Date(selectedInquiry.tentativeEventDate).toLocaleDateString()
                          : 'Not set'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Inquiry Status</div>
                      <div className="font-bold text-foreground">{selectedInquiry.inquiryStage}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-foreground mb-1">Quotation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corporate Gala — Standard Proposal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Purpose *</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as QuotationPurpose)}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                >
                  {Object.entries(QUOTATION_PURPOSE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional internal note about this proposal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
