'use client';

import React, { useEffect, useState } from 'react';

import { PurchaseOrderItemRow, PurchaseOrderItemsEditor } from '@/modules/cat/purchase-order/components/PurchaseOrderItemsEditor';
import { PurchaseOrderDetail } from '@/modules/cat/purchase-order/domain/purchase-order-types';

interface PurchaseOrderItemsWorkspaceProps {
  po: PurchaseOrderDetail;
}

// PM-WP03B — Purchase Order Items, post-save. The same
// PurchaseOrderItemsEditor Purchase Order Review uses, now wired to real
// API calls instead of local array state — the architectural reuse the
// PM-WP03A Engineering Package calls for. Every write here follows the
// pattern established (and, for Vendor Supply Portfolio, corrected) in
// this project: await the response, check success, resync/roll back on
// failure, THEN surface the error — never set the error message before a
// resync that would immediately clear it.
export function PurchaseOrderItemsWorkspace({ po }: PurchaseOrderItemsWorkspaceProps) {
  const [items, setItems] = useState<PurchaseOrderItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}/items`);
      const data = await res.json();
      if (data.success) setItems(data.items || []);
      else setError(data.error || 'Failed to load Order Items.');
    } catch (err: any) {
      setError(err.message || 'Failed to load Order Items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po.id]);

  const handleAdd = async (item: { id: string; ingredientCode: string; name: string }) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId: item.id, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) setItems(data.items || []);
      else setError(data.error || 'Failed to add Item.');
    } catch (err: any) {
      setError(err.message || 'Failed to add Item.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (ingredientId: string) => {
    const item = items.find((i) => i.ingredientId === ingredientId);
    if (!item?.id) return;
    const itemId = item.id;
    setItems((prev) => prev.filter((i) => i.ingredientId !== ingredientId));
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        await load();
        setError(data.error || 'Failed to remove Item.');
      }
    } catch (err: any) {
      await load();
      setError(err.message || 'Failed to remove Item.');
    }
  };

  const handleQuantityChange = async (ingredientId: string, quantity: number) => {
    const item = items.find((i) => i.ingredientId === ingredientId);
    if (!item?.id) return;
    const itemId = item.id;
    const previousQuantity = item.quantity;
    setItems((prev) => prev.map((i) => (i.ingredientId === ingredientId ? { ...i, quantity } : i)));
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!data.success) {
        setItems((prev) => prev.map((i) => (i.ingredientId === ingredientId ? { ...i, quantity: previousQuantity } : i)));
        setError(data.error || 'Failed to update quantity.');
      }
    } catch (err: any) {
      setItems((prev) => prev.map((i) => (i.ingredientId === ingredientId ? { ...i, quantity: previousQuantity } : i)));
      setError(err.message || 'Failed to update quantity.');
    }
  };

  const readOnly = po.status !== 'DRAFT';

  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-5 space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-foreground">Order Items</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {readOnly
            ? `Locked — this Purchase Order is ${po.status.charAt(0) + po.status.slice(1).toLowerCase()}, Order Items can no longer be changed.`
            : "Editable while Draft — add, remove, or adjust quantities. Every change saves immediately, there's no separate Save button."}
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground animate-pulse py-4">Loading Order Items...</p>
      ) : (
        <PurchaseOrderItemsEditor
          items={items}
          vendorId={po.vendorId}
          readOnly={readOnly}
          busy={busy}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onQuantityChange={handleQuantityChange}
        />
      )}

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
    </div>
  );
}
