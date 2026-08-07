'use client';

import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { inputClass } from '@/modules/cat/event/components/EventListEditing';
import { VendorSelect } from '@/modules/cat/purchase-order/components/VendorSelect';
import { PurchaseOrderItemRow, PurchaseOrderItemsEditor } from '@/modules/cat/purchase-order/components/PurchaseOrderItemsEditor';
import { PurchaseOrderOrigin } from '@/modules/cat/purchase-order/domain/purchase-order-types';

interface PurchaseOrderReviewPanelProps {
  origin: PurchaseOrderOrigin;
  initialVendorId?: string;
  initialWorkDate?: string;
  initialItems?: PurchaseOrderItemRow[];
  onSaved: (id: string, poNumber: string) => void;
  onCancel: () => void;
}

// PM-WP03B — Purchase Order Review. The one, explicit, pre-persistence
// concept both origins converge into (PM-WP03A §5 refined): nothing here
// is saved until Save Draft. Used two ways — inline within Purchase
// Planning (pre-filled Vendor + items, origin PLANNING) and as the body
// of /cat/purchase-orders/review (empty, origin MANUAL, reached from the
// Directory's "New Purchase Order" entry point). Same component either
// way — not a parallel, similar-looking screen.
export function PurchaseOrderReviewPanel({ origin, initialVendorId, initialWorkDate, initialItems, onSaved, onCancel }: PurchaseOrderReviewPanelProps) {
  const [vendorId, setVendorId] = useState(initialVendorId || '');
  const [workDate, setWorkDate] = useState(initialWorkDate || '');
  const [items, setItems] = useState<PurchaseOrderItemRow[]>(initialItems || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = (item: { id: string; ingredientCode: string; name: string; baseUnit?: string }) => {
    setItems((prev) => [
      ...prev,
      { ingredientId: item.id, ingredientCode: item.ingredientCode, ingredientName: item.name, unit: item.baseUnit || '', quantity: 1, source: 'MANUAL' },
    ]);
  };

  const handleRemove = (ingredientId: string) => {
    setItems((prev) => prev.filter((i) => i.ingredientId !== ingredientId));
  };

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.ingredientId === ingredientId ? { ...i, quantity } : i)));
  };

  // Changing Vendor never touches Order Items — no automatic removal, no
  // revalidation against the new Vendor's Supply Portfolio (PM-WP03A §3).
  // A non-blocking reminder only, shown when there's something to review.
  const showVendorChangeReminder = items.length > 0;

  const handleSaveDraft = async () => {
    if (!vendorId) {
      setError('Select a Vendor before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/cat/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          workDate: workDate || undefined,
          origin,
          items: items.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity, source: i.source })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.id, data.poNumber);
      } else {
        setError(data.error || 'Failed to save Draft.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Draft.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Vendor *</label>
          <VendorSelect value={vendorId} onChange={setVendorId} disabled={saving} />
          {showVendorChangeReminder && (
            <p className="text-[10px] text-amber-600 mt-1">Changing Vendor does not remove or re-check existing Order Items — review them yourself.</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Work Date</label>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} disabled={saving} className={inputClass} />
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Order Items ({items.length})</div>
        <PurchaseOrderItemsEditor
          items={items}
          vendorId={vendorId || null}
          readOnly={false}
          busy={saving}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onQuantityChange={handleQuantityChange}
        />
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3.5 py-2 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving || !vendorId}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>
    </div>
  );
}
