'use client';

import React, { useEffect, useState } from 'react';
import { Banknote, MapPin, Phone, Tag, Truck, ListChecks } from 'lucide-react';

import { VENDOR_STATUS_LABELS, VendorDetail, VendorStatus } from '@/modules/cat/vendor/domain/vendor-types';
import { inputClass, textareaClass } from '@/modules/cat/event/components/EventListEditing';

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface VendorOverviewWorkspaceProps {
  vendorId: string;
}

// PM-WP01 — Vendor Master, Overview tab.
// Identity, Business Category (the Vendor's own trade classification —
// distinct from what it supplies, see Supply Portfolio), contact,
// address, and commercial terms (payment terms merged in here per
// Product Review — no separate Commercial tab yet). Editable in place,
// no versioning.
export function VendorOverviewWorkspace({ vendorId }: VendorOverviewWorkspaceProps) {
  const [item, setItem] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!vendorId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/vendors/${vendorId}`);
        const data = await res.json();
        if (data.success) setItem(data.item);
        else setNotFound(true);
      } catch (err) {
        console.error('Failed to load Vendor Overview:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vendorId]);

  const patch = (fields: Partial<VendorDetail>) => setItem((prev) => (prev ? { ...prev, ...fields } : prev));

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const res = await fetch(`/api/cat/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          businessCategory: item.businessCategory,
          contactPerson: item.contactPerson,
          phone: item.phone,
          email: item.email,
          address: item.address,
          city: item.city,
          state: item.state,
          taxId: item.taxId,
          paymentTerms: item.paymentTerms,
          status: item.status,
          notes: item.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItem(data.item);
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to save Vendor.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Vendor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Vendor Overview...</div>;
  }

  if (notFound || !item) {
    return (
      <div className="p-10 text-center space-y-2">
        <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Vendor not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Identity */}
      <Section title="Identity" icon={Truck}>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Vendor Code</label>
            <input type="text" value={item.vendorCode} readOnly disabled className={`${inputClass} font-mono text-muted-foreground bg-muted/30 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Name *</label>
            <input
              type="text"
              value={item.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Fresh Farms Produce Co."
              className={`${inputClass} text-sm font-bold`}
            />
          </div>
        </div>
      </Section>

      {/* Business Category */}
      <Section title="Business Category" icon={Tag}>
        <input
          type="text"
          value={item.businessCategory || ''}
          onChange={(e) => patch({ businessCategory: e.target.value })}
          placeholder="e.g. Food Supplier, Equipment Rental, Packaging, Transport, Cleaning, Utility"
          className={inputClass}
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">The Vendor&apos;s own trade classification — distinct from what it supplies (see Supply Portfolio).</p>
      </Section>

      {/* Contact */}
      <Section title="Contact" icon={Phone}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Contact Person</label>
            <input type="text" value={item.contactPerson || ''} onChange={(e) => patch({ contactPerson: e.target.value })} placeholder="e.g. Ramesh Kumar" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Phone</label>
            <input type="text" value={item.phone || ''} onChange={(e) => patch({ phone: e.target.value })} placeholder="e.g. +91 98450 12345" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Email</label>
            <input type="text" value={item.email || ''} onChange={(e) => patch({ email: e.target.value })} placeholder="e.g. orders@vendor.com" className={inputClass} />
          </div>
        </div>
      </Section>

      {/* Address */}
      <Section title="Address" icon={MapPin}>
        <div className="space-y-3">
          <textarea rows={2} value={item.address || ''} onChange={(e) => patch({ address: e.target.value })} placeholder="Street address" className={textareaClass} />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={item.city || ''} onChange={(e) => patch({ city: e.target.value })} placeholder="City" className={inputClass} />
            <input type="text" value={item.state || ''} onChange={(e) => patch({ state: e.target.value })} placeholder="State" className={inputClass} />
          </div>
        </div>
      </Section>

      {/* Commercial */}
      <Section title="Commercial Terms" icon={Banknote}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Tax ID (GSTIN)</label>
            <input type="text" value={item.taxId || ''} onChange={(e) => patch({ taxId: e.target.value })} placeholder="e.g. 27AAAAA0000A1Z5" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Payment Terms</label>
            <input type="text" value={item.paymentTerms || ''} onChange={(e) => patch({ paymentTerms: e.target.value })} placeholder="e.g. Net 30, Advance, COD" className={inputClass} />
          </div>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes" icon={ListChecks}>
        <textarea rows={3} value={item.notes || ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Internal notes about this Vendor." className={textareaClass} />
      </Section>

      {/* Status */}
      <Section title="Status" icon={ListChecks}>
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Status *</label>
          <select value={item.status} onChange={(e) => patch({ status: e.target.value as VendorStatus })} className={inputClass}>
            {(Object.keys(VENDOR_STATUS_LABELS) as VendorStatus[]).map((s) => (
              <option key={s} value={s}>
                {VENDOR_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      {/* Action Bar */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-sm">
          {savedAt ? <span className="font-semibold text-emerald-600">Saved at {savedAt}.</span> : 'Vendor identity and terms — what this Vendor supplies is on the Supply Portfolio tab.'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
