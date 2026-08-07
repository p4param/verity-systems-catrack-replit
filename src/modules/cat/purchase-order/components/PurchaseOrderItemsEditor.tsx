'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

import { IngredientMasterOption, IngredientMasterPicker } from '@/modules/cat/vendor/components/IngredientMasterPicker';
import { inputClass } from '@/modules/cat/event/components/EventListEditing';

export interface PurchaseOrderItemRow {
  // Present once the row is persisted (the real cat_purchase_order_items
  // row id) — absent for Purchase Order Review's in-memory, pre-save rows.
  id?: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  source: 'PLANNING' | 'MANUAL';
}

interface PurchaseOrderItemsEditorProps {
  items: PurchaseOrderItemRow[];
  vendorId: string | null;
  readOnly: boolean;
  busy?: boolean;
  onAdd: (item: IngredientMasterOption) => void;
  onRemove: (ingredientId: string) => void;
  onQuantityChange: (ingredientId: string, quantity: number) => void;
}

const SOURCE_BADGE_CLASS: Record<'PLANNING' | 'MANUAL', string> = {
  PLANNING: 'bg-primary/10 text-primary border-primary/20',
  MANUAL: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};

// PM-WP03B — Purchase Order Items, the reusable core. Purely presentational
// and callback-driven — it knows nothing about persistence. Purchase
// Order Review (pre-save) wires these callbacks to local array state;
// the Workspace's Order Items tab (post-save, still Draft) wires them to
// real API calls. This is the "architectural, not just visual" reuse the
// PM-WP03A Engineering Package calls for — one component, two consumers,
// not two similar-looking implementations. Read-only whenever the parent
// Purchase Order has left Draft — one freeze point, matching Vendor.
export function PurchaseOrderItemsEditor({ items, vendorId, readOnly, busy, onAdd, onRemove, onQuantityChange }: PurchaseOrderItemsEditorProps) {
  return (
    <div className="space-y-3">
      {!readOnly && (
        <div>
          {vendorId ? (
            <IngredientMasterPicker
              vendorId={vendorId}
              onSelect={onAdd}
              excludeIds={items.map((i) => i.ingredientId)}
              placeholder="Search this Vendor's Supply Portfolio to add an item..."
            />
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Select a Vendor before adding Order Items.</p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6 bg-muted/10 border border-dashed border-border/40 rounded-xl">
          No Order Items yet{readOnly ? '.' : ' — search above to add one.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-2">Code</div>
            <div className="col-span-3">Ingredient</div>
            <div className="col-span-2 text-right">Quantity</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2" />
          </div>
          {items.map((item) => (
            <div key={item.ingredientId} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center bg-muted/10 border border-border/30 rounded-lg px-3 py-2">
              <div className="sm:col-span-2 font-mono text-[10px] text-muted-foreground">{item.ingredientCode}</div>
              <div className="sm:col-span-3 text-xs font-bold text-foreground truncate">{item.ingredientName}</div>
              <div className="sm:col-span-2 flex justify-end">
                {readOnly ? (
                  <span className="text-xs font-semibold text-foreground">{item.quantity}</span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={item.quantity}
                    disabled={busy}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) onQuantityChange(item.ingredientId, v);
                    }}
                    className={`${inputClass} text-right w-24`}
                  />
                )}
              </div>
              <div className="sm:col-span-1 text-xs text-muted-foreground">{item.unit}</div>
              <div className="sm:col-span-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SOURCE_BADGE_CLASS[item.source]}`}>
                  {item.source === 'PLANNING' ? 'Purchase Planning' : 'Manual'}
                </span>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.ingredientId)}
                    disabled={busy}
                    title="Remove Item"
                    className="p-1.5 rounded text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
