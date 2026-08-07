'use client';

import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, Send, XCircle } from 'lucide-react';

import { inputClass } from '@/modules/cat/event/components/EventListEditing';
import { VendorSelect } from '@/modules/cat/purchase-order/components/VendorSelect';
import { PURCHASE_ORDER_ORIGIN_LABELS, PurchaseOrderDetail } from '@/modules/cat/purchase-order/domain/purchase-order-types';

interface PurchaseOrderOverviewWorkspaceProps {
  po: PurchaseOrderDetail;
  onChanged: () => void;
}

// PM-WP03B — Purchase Order Overview. Vendor is editable here while
// Draft (auto-saves on change, no Save button — matching this app's
// established Draft-editing convention) and locks the instant Approval
// happens, the single freeze point shared with Order Items. Changing
// Vendor never touches Order Items — no automatic removal, no
// revalidation — only a non-blocking reminder.
export function PurchaseOrderOverviewWorkspace({ po, onChanged }: PurchaseOrderOverviewWorkspaceProps) {
  const [savingVendor, setSavingVendor] = useState(false);
  const [workDate, setWorkDate] = useState(po.workDate || '');
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');

  const isDraft = po.status === 'DRAFT';

  const handleVendorChange = async (vendorId: string) => {
    if (!vendorId || vendorId === po.vendorId) return;
    setSavingVendor(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, workDate: workDate || undefined }),
      });
      const data = await res.json();
      if (data.success) onChanged();
      else setError(data.error || 'Failed to change Vendor.');
    } catch (err: any) {
      setError(err.message || 'Failed to change Vendor.');
    } finally {
      setSavingVendor(false);
    }
  };

  const handleWorkDateBlur = async () => {
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: po.vendorId, workDate: workDate || undefined }),
      });
      const data = await res.json();
      if (data.success) onChanged();
      else setError(data.error || 'Failed to save Work Date.');
    } catch (err: any) {
      setError(err.message || 'Failed to save Work Date.');
    }
  };

  const runAction = async (action: 'approve' | 'issue' | 'cancel', confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setActionBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/cat/purchase-orders/${po.id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) onChanged();
      else setError(data.error || `Failed to ${action} Purchase Order.`);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} Purchase Order.`);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-5 space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-foreground">Identity</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">PO Number</label>
            <input type="text" value={po.poNumber} readOnly disabled className={`${inputClass} font-mono text-muted-foreground bg-muted/30 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Origin</label>
            <input type="text" value={PURCHASE_ORDER_ORIGIN_LABELS[po.origin]} readOnly disabled className={`${inputClass} text-muted-foreground bg-muted/30 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Vendor {isDraft && <span className="normal-case font-medium text-muted-foreground/70">(editable while Draft)</span>}
            </label>
            {isDraft ? (
              <VendorSelect value={po.vendorId} onChange={handleVendorChange} disabled={savingVendor} />
            ) : (
              <input type="text" value={po.vendorName} readOnly disabled className={`${inputClass} text-muted-foreground bg-muted/30 cursor-not-allowed`} />
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Work Date</label>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {isDraft ? (
                <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} onBlur={handleWorkDateBlur} className={inputClass} />
              ) : (
                <input type="text" value={po.workDate || '—'} readOnly disabled className={`${inputClass} text-muted-foreground bg-muted/30 cursor-not-allowed`} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-extrabold text-foreground">Lifecycle</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          {po.approvedAt && <p>Approved {new Date(po.approvedAt).toLocaleString()}</p>}
          {po.issuedAt && <p>Issued {new Date(po.issuedAt).toLocaleString()}</p>}
          {po.cancelledAt && <p>Cancelled {new Date(po.cancelledAt).toLocaleString()}</p>}
          {!po.approvedAt && !po.issuedAt && !po.cancelledAt && <p>Still in Draft — nothing has been Approved, Issued, or Cancelled yet.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {po.status === 'DRAFT' && (
            <>
              <button
                type="button"
                onClick={() => runAction('approve')}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-primary/90 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => runAction('cancel', 'Cancel this Draft Purchase Order?')}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-rose-600 font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-rose-500/10 transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            </>
          )}
          {po.status === 'APPROVED' && (
            <>
              <button
                type="button"
                onClick={() => runAction('issue')}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-primary/90 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Issue
              </button>
              <button
                type="button"
                onClick={() => runAction('cancel', 'Cancel this Approved Purchase Order?')}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 text-rose-600 font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:bg-rose-500/10 transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            </>
          )}
          {po.status === 'ISSUED' && <p className="text-xs text-muted-foreground italic">Issued Purchase Orders cannot be Cancelled in this release.</p>}
          {po.status === 'CANCELLED' && <p className="text-xs text-muted-foreground italic">This Purchase Order is Cancelled — no further actions available.</p>}
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
    </div>
  );
}
