'use client';

import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';

import { ProposalWorkspaceStatus, QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import {
  ADVANCE_TYPE_LABELS,
  AdvanceType,
  CommercialPaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '@/modules/cat/quotation/domain/commercial-terms-types';
import { ProposalDiscoveryContext } from '@/modules/cat/quotation/components/ProposalDiscoveryContext';
import { WorkspaceStatusBadge } from '@/modules/cat/quotation/components/WorkspaceStatusBadge';

interface CommercialTermsWorkspaceProps {
  quotation: QuotationDetail;
  onSaved: (status: ProposalWorkspaceStatus) => void;
}

// QM-WP03B — Commercial Terms Workspace. All fields live directly on the
// Quotation entity — no child entities, no generic commercial/document
// abstractions. Five sections: Quote Validity, Payment Terms, Commercial
// Notes, read-only Currency, and Terms & Conditions (QM-WP03C, folded into
// this same workspace per Product Review — one workspace, one status).
export function CommercialTermsWorkspace({ quotation, onSaved }: CommercialTermsWorkspaceProps) {
  const [status, setStatus] = useState<ProposalWorkspaceStatus>(quotation.commercialTermsStatus || 'NOT_STARTED');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  const [validUntil, setValidUntil] = useState('');
  const [validityNotes, setValidityNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CommercialPaymentMethod | ''>('');
  const [advanceRequired, setAdvanceRequired] = useState<boolean | undefined>(undefined);
  const [advanceType, setAdvanceType] = useState<AdvanceType | ''>('');
  const [advanceValue, setAdvanceValue] = useState('');
  const [balancePayment, setBalancePayment] = useState('');
  const [commercialNotes, setCommercialNotes] = useState('');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/quotations/${quotation.id}/commercial-terms`);
        const data = await res.json();
        if (data.success) {
          setStatus(data.commercialTermsStatus || 'NOT_STARTED');
          setValidUntil(data.validUntil || '');
          setValidityNotes(data.validityNotes || '');
          setPaymentMethod(data.paymentMethod || '');
          setAdvanceRequired(typeof data.advanceRequired === 'boolean' ? data.advanceRequired : undefined);
          setAdvanceType(data.advanceType || '');
          setAdvanceValue(data.advanceValue !== undefined && data.advanceValue !== null ? String(data.advanceValue) : '');
          setBalancePayment(data.balancePayment || '');
          setCommercialNotes(data.commercialNotes || '');
          setCurrencyCode(data.currencyCode || 'INR');
          setTermsAndConditions(data.termsAndConditions || '');
        }
      } catch (err) {
        console.error('Failed to load Commercial Terms Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  const applyResponse = (data: any) => {
    setStatus(data.commercialTermsStatus || 'NOT_STARTED');
    setValidUntil(data.validUntil || '');
    setValidityNotes(data.validityNotes || '');
    setPaymentMethod(data.paymentMethod || '');
    setAdvanceRequired(typeof data.advanceRequired === 'boolean' ? data.advanceRequired : undefined);
    setAdvanceType(data.advanceType || '');
    setAdvanceValue(data.advanceValue !== undefined && data.advanceValue !== null ? String(data.advanceValue) : '');
    setBalancePayment(data.balancePayment || '');
    setCommercialNotes(data.commercialNotes || '');
    setCurrencyCode(data.currencyCode || 'INR');
    setTermsAndConditions(data.termsAndConditions || '');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/commercial-terms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE',
          validUntil,
          validityNotes,
          paymentMethod: paymentMethod || undefined,
          advanceRequired,
          advanceType: advanceType || undefined,
          advanceValue: advanceValue === '' ? undefined : Number(advanceValue),
          balancePayment,
          commercialNotes,
          termsAndConditions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        applyResponse(data);
        onSaved(data.commercialTermsStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to save Commercial Terms.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Commercial Terms.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/commercial-terms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READY' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.commercialTermsStatus || 'NOT_STARTED');
        onSaved(data.commercialTermsStatus || 'NOT_STARTED');
      } else {
        setError(data.error || 'Failed to mark Commercial Terms Ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark Commercial Terms Ready.');
    } finally {
      setMarkingReady(false);
    }
  };

  const fieldClass =
    'w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary';

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Commercial Terms</h3>
        </div>
        <WorkspaceStatusBadge status={status} />
      </div>

      <div className="p-5 space-y-8">
        <ProposalDiscoveryContext quotation={quotation} />

        {loading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading Commercial Terms...</p>
        ) : (
          <>
            {/* Section 1: Quote Validity */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quote Validity</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Valid Until *</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-muted/30 border border-border/60 rounded-lg px-3 py-2.5 text-sm font-bold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1 col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Validity Notes <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={validityNotes}
                    onChange={(e) => setValidityNotes(e.target.value)}
                    placeholder="e.g. Subject to availability at time of confirmation."
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Payment Terms */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Terms</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as CommercialPaymentMethod)}
                    className={fieldClass}
                  >
                    <option value="">Select a payment method...</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">Advance Required *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdvanceRequired(true)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                        advanceRequired === true
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvanceRequired(false)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                        advanceRequired === false
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {advanceRequired === true && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-foreground">Advance Type *</label>
                      <select value={advanceType} onChange={(e) => setAdvanceType(e.target.value as AdvanceType)} className={fieldClass}>
                        <option value="">Select advance type...</option>
                        {Object.entries(ADVANCE_TYPE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-foreground">Advance Value *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={advanceValue}
                        onChange={(e) => setAdvanceValue(e.target.value)}
                        placeholder={
                          advanceType === 'PERCENTAGE' ? 'e.g. 25 (%)' : advanceType === 'FIXED_AMOUNT' ? 'e.g. ₹50,000' : '0.00'
                        }
                        className={fieldClass}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground">Balance Payment *</label>
                  <input
                    type="text"
                    value={balancePayment}
                    onChange={(e) => setBalancePayment(e.target.value)}
                    placeholder="e.g. Balance due 7 days prior to the event."
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Commercial Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">Commercial Notes</label>
              <p className="text-[11px] text-muted-foreground">
                Record any additional commercial commitments or payment-related notes.
              </p>
              <textarea
                rows={3}
                value={commercialNotes}
                onChange={(e) => setCommercialNotes(e.target.value)}
                placeholder="Optional notes..."
                className={`${fieldClass} py-2.5 leading-relaxed`}
              />
            </div>

            {/* Section 4: Currency — read-only */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Currency</div>
              <span className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-muted/40 text-foreground border border-border/40">
                {currencyCode === 'INR' ? 'Indian Rupee (INR)' : currencyCode}
              </span>
            </div>

            {/* Section 5: Terms & Conditions */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Terms & Conditions</div>
              <p className="text-[11px] text-muted-foreground">
                Review the default terms below and modify them if this proposal requires proposal-specific conditions.
              </p>
              <textarea
                rows={16}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className={`${fieldClass} py-3 leading-relaxed font-mono text-[11px]`}
              />
            </div>
          </>
        )}

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* Workspace Action Bar */}
      <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          <span className="font-semibold text-foreground">Save Draft</span> keeps your terms.{' '}
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
