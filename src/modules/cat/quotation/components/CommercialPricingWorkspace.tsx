'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, DollarSign, Plus, Receipt, Trash2 } from 'lucide-react';

import { ProposalWorkspaceStatus, QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import {
  computePricingSummary,
  formatCurrency,
  GST_RATE_PERCENT,
  ProposalAdjustment,
  ProposalCharge,
  ProposalDiscount,
} from '@/modules/cat/quotation/domain/proposal-pricing-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface CommercialPricingWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (status: ProposalWorkspaceStatus) => void;
}

interface EditableLine {
  id: string;
  description: string;
  amount: string;
}

function toEditable(item: ProposalCharge | ProposalDiscount | ProposalAdjustment): EditableLine {
  return { id: item.id, description: item.description, amount: String(item.amount) };
}

// A single managed pricing-line section (Charges, Discounts, or
// Adjustments). Local to this workspace only — not a shared/generic list
// component — since all three sections need identical add/edit/delete/
// reorder behavior within the same screen (Collection Authoring Pattern
// from QM-WP02B-01, applied to a description + amount pair).
function PricingLineSection({
  title,
  helperText,
  addLabel,
  emptyLabel,
  descriptionPlaceholder,
  allowNegative,
  items,
  loading,
  onAdd,
  onUpdateDescription,
  onUpdateAmount,
  onDelete,
  onMove,
}: {
  title: string;
  helperText: string;
  addLabel: string;
  emptyLabel: string;
  descriptionPlaceholder: string;
  allowNegative: boolean;
  items: EditableLine[];
  loading: boolean;
  onAdd: () => void;
  onUpdateDescription: (id: string, value: string) => void;
  onUpdateAmount: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{helperText}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{addLabel}</span>
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-6 space-y-2 bg-muted/10 border border-dashed border-border/40 rounded-xl">
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addLabel}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="bg-card border border-border/50 rounded-xl shadow-xs p-2 flex items-center gap-2.5">
              <input
                type="text"
                value={item.description}
                onChange={(e) => onUpdateDescription(item.id, e.target.value)}
                placeholder={descriptionPlaceholder}
                className="flex-1 bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <div className="relative w-32 shrink-0">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={allowNegative ? undefined : '0'}
                  value={item.amount}
                  onChange={(e) => onUpdateAmount(item.id, e.target.value)}
                  placeholder={allowNegative ? '±0.00' : '0.00'}
                  className="w-full bg-muted/30 border border-border/40 rounded-lg pl-5 pr-2.5 py-1.5 text-xs text-foreground text-right focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === items.length - 1}
                  title="Move down"
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  title="Delete"
                  className="p-1 rounded text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-500/10 focus-visible:text-rose-600 focus-visible:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500/40 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-primary py-2.5 rounded-xl border border-dashed border-primary/30 hover:bg-primary/5 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// QM-WP03A — Commercial Pricing Workspace. Three independent managed lists
// (ProposalCharge, ProposalDiscount, ProposalAdjustment) — dedicated
// business entities, not a generic pricing-line abstraction — sharing one
// workspace status, plus a live read-only Pricing Summary. Save Draft
// persists all three lists in a single explicit call.
export function CommercialPricingWorkspace({ quotation, onSaved }: CommercialPricingWorkspaceProps) {
  const [status, setStatus] = useState<ProposalWorkspaceStatus>(quotation.commercialPricingStatus || 'NOT_STARTED');
  const [charges, setCharges] = useState<EditableLine[]>([]);
  const [discounts, setDiscounts] = useState<EditableLine[]>([]);
  const [adjustments, setAdjustments] = useState<EditableLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/commercial-pricing`);
        const data = await res.json();
        if (data.success) {
          setStatus(data.commercialPricingStatus || 'NOT_STARTED');
          setCharges((data.charges || []).map(toEditable));
          setDiscounts((data.discounts || []).map(toEditable));
          setAdjustments((data.adjustments || []).map(toEditable));
        }
      } catch (err) {
        console.error('Failed to load Commercial Pricing Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const addTo = (setter: React.Dispatch<React.SetStateAction<EditableLine[]>>) => () => {
    setter((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);
  };

  const updateDescriptionIn = (setter: React.Dispatch<React.SetStateAction<EditableLine[]>>) => (id: string, value: string) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, description: value } : item)));
  };

  const updateAmountIn = (setter: React.Dispatch<React.SetStateAction<EditableLine[]>>) => (id: string, value: string) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, amount: value } : item)));
  };

  const deleteFrom = (setter: React.Dispatch<React.SetStateAction<EditableLine[]>>) => (id: string) => {
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const moveIn = (setter: React.Dispatch<React.SetStateAction<EditableLine[]>>) => (index: number, direction: -1 | 1) => {
    setter((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const summary = useMemo(
    () =>
      computePricingSummary(
        charges.map((c) => ({ amount: Number(c.amount) || 0 })),
        discounts.map((d) => ({ amount: Number(d.amount) || 0 })),
        adjustments.map((a) => ({ amount: Number(a.amount) || 0 })),
      ),
    [charges, discounts, adjustments],
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/commercial-pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE',
          charges: charges.map((c) => ({ id: c.id, description: c.description, amount: Number(c.amount) || 0 })),
          discounts: discounts.map((d) => ({ id: d.id, description: d.description, amount: Number(d.amount) || 0 })),
          adjustments: adjustments.map((a) => ({ id: a.id, description: a.description, amount: Number(a.amount) || 0 })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.commercialPricingStatus || 'NOT_STARTED');
        setCharges((data.charges || []).map(toEditable));
        setDiscounts((data.discounts || []).map(toEditable));
        setAdjustments((data.adjustments || []).map(toEditable));
        onSaved(data.commercialPricingStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to save Commercial Pricing.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Commercial Pricing.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/commercial-pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.commercialPricingStatus || 'NOT_STARTED');
        onSaved(data.commercialPricingStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to mark Commercial Pricing Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Commercial Pricing Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Commercial Pricing</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-10">
        <ProposalDiscoveryContext quotation={quotation} />

        {/* Pricing Summary — live, read-only, recalculates on every change */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-primary" />
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pricing Summary</div>
          </div>
          <div className="bg-muted/20 border border-border/30 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Charges Total</div>
                <div className="font-bold text-foreground">{formatCurrency(summary.chargesTotal)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Discount Total</div>
                <div className="font-bold text-foreground">{formatCurrency(summary.discountTotal)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Adjustment Total</div>
                <div className="font-bold text-foreground">{formatCurrency(summary.adjustmentTotal)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Subtotal</div>
                <div className="font-bold text-foreground">{formatCurrency(summary.subtotal)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                  GST <span className="text-muted-foreground/40 normal-case">({GST_RATE_PERCENT}%)</span>
                </div>
                <div className="font-bold text-foreground">{formatCurrency(summary.gstAmount)}</div>
              </div>
            </div>

            <div className="pt-3 mt-1 border-t border-primary/20 flex items-center justify-between">
              <span className="text-xs font-black text-primary uppercase tracking-wide">Grand Total</span>
              <span className="text-2xl font-black text-primary tracking-tight">{formatCurrency(summary.grandTotal)}</span>
            </div>
          </div>
        </div>

        <PricingLineSection
          title="Charges"
          helperText="List the commercial charges included in this proposal."
          addLabel="Add Charge"
          emptyLabel="No Charges yet."
          descriptionPlaceholder="e.g. Catering service — 120 guests"
          allowNegative={false}
          items={charges}
          loading={loading}
          onAdd={addTo(setCharges)}
          onUpdateDescription={updateDescriptionIn(setCharges)}
          onUpdateAmount={updateAmountIn(setCharges)}
          onDelete={deleteFrom(setCharges)}
          onMove={moveIn(setCharges)}
        />

        <PricingLineSection
          title="Discounts"
          helperText="Record any commercial discounts offered to the customer."
          addLabel="Add Discount"
          emptyLabel="No Discounts yet."
          descriptionPlaceholder="e.g. Early booking discount"
          allowNegative={false}
          items={discounts}
          loading={loading}
          onAdd={addTo(setDiscounts)}
          onUpdateDescription={updateDescriptionIn(setDiscounts)}
          onUpdateAmount={updateAmountIn(setDiscounts)}
          onDelete={deleteFrom(setDiscounts)}
          onMove={moveIn(setDiscounts)}
        />

        <PricingLineSection
          title="Adjustments"
          helperText="Capture manual pricing adjustments, surcharges, or corrections."
          addLabel="Add Adjustment"
          emptyLabel="No adjustments added."
          descriptionPlaceholder="e.g. Peak-season surcharge"
          allowNegative
          items={adjustments}
          loading={loading}
          onAdd={addTo(setAdjustments)}
          onUpdateDescription={updateDescriptionIn(setAdjustments)}
          onUpdateAmount={updateAmountIn(setAdjustments)}
          onDelete={deleteFrom(setAdjustments)}
          onMove={moveIn(setAdjustments)}
        />

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your pricing.{' '}
          <span className="font-semibold text-foreground">Mark Ready</span> flags this workspace as complete once the draft is saved.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-muted/60 text-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleMarkReady}
            disabled={markingReady || status === 'READY'}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition"
          >
            {markingReady ? 'Marking Ready...' : status === 'READY' ? '✓ Ready' : 'Mark Ready'}
          </button>
        </div>
      </div>
    </div>
  );
}
