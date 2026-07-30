'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Plus, ChevronRight, X } from 'lucide-react';

import {
  QuotationPurpose,
  QUOTATION_PURPOSE_LABELS,
  QUOTATION_STATUS_LABELS,
} from '@/modules/cat/quotation/domain/quotation-types';

interface InquiryQuotationPanelProps {
  inquiryId: string;
}

interface QuotationRow {
  id: string;
  quotationNumber: string;
  title: string;
  purpose: QuotationPurpose;
  status: string;
  currentRevisionNumber: number;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border/40',
  INTERNAL_REVIEW: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SHARED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  EXPIRED: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  CANCELLED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

// Reused from the Inquiry Workspace's Requirements tab -> Quotations slot
// (QM-WP01). Supports multiple quotations per inquiry.
export function InquiryQuotationPanel({ inquiryId }: InquiryQuotationPanelProps) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<QuotationPurpose>('STANDARD_PROPOSAL');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cat/quotations?inquiryId=${inquiryId}`);
      const data = await res.json();
      if (data.success) {
        setQuotations(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations for inquiry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inquiryId) fetchQuotations();
  }, [inquiryId]);

  const resetForm = () => {
    setTitle('');
    setPurpose('STANDARD_PROPOSAL');
    setDescription('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !purpose) return;
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
        setShowCreate(false);
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

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Quotations...</div>;
  }

  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Quotations</h3>
        </div>
        {quotations.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </button>
        )}
      </div>

      {quotations.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Quotations Yet</h4>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {quotations.map((q) => (
            <div
              key={q.id}
              onClick={() => router.push(`/cat/quotations/${q.id}`)}
              className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition cursor-pointer group"
            >
              <div className="min-w-0 space-y-1">
                <span className="text-sm font-extrabold text-foreground group-hover:text-primary transition truncate block">
                  {q.title}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded">
                    {q.quotationNumber}
                  </span>
                  <span>{QUOTATION_PURPOSE_LABELS[q.purpose] || q.purpose}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                    Rev {q.currentRevisionNumber}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      STATUS_BADGE_CLASS[q.status] || STATUS_BADGE_CLASS.DRAFT
                    }`}
                  >
                    {QUOTATION_STATUS_LABELS[q.status as keyof typeof QUOTATION_STATUS_LABELS] || q.status}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                  Open Workspace
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border/40 p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="text-sm font-bold text-foreground">Create Quotation</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
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
                  onClick={() => setShowCreate(false)}
                  className="px-3.5 py-2 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg cursor-pointer"
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
