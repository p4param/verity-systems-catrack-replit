'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

// Shared list-editing chrome and helpers for the Event Workspace's
// editable areas. Established by EM-WP02 (Event Planning) as a local
// pattern within EventPlanningWorkspace, then extracted here so EM-WP03
// (Menu Planning) reuses the exact same add/edit/delete/reorder
// interaction and styling instead of re-implementing it. Not a
// general-purpose app-wide list component — scoped to the Event Workspace.

export const inputClass =
  'w-full bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary';
export const textareaClass = `${inputClass} leading-relaxed`;

export function useListEditor<T extends { id: string }>(makeBlank: () => T) {
  const [items, setItems] = useState<T[]>([]);

  const add = () => setItems((prev) => [...prev, makeBlank()]);
  const update = (id: string, patch: Partial<T>) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));
  const move = (index: number, direction: -1 | 1) =>
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return { items, setItems, add, update, remove, move };
}

// Generic list chrome (add button, empty state, per-row move/delete) — the
// row content itself is supplied by the caller via renderRow, so this
// works for both single-field lists (a textarea) and multi-field rows
// (e.g. a Menu Item's Name/Quantity/Unit/Remarks) uniformly.
export function ListSection<T extends { id: string }>({
  title,
  helperText,
  addLabel,
  emptyLabel,
  items,
  loading,
  onAdd,
  onDelete,
  onMove,
  renderRow,
}: {
  title: string;
  helperText: string;
  addLabel: string;
  emptyLabel: string;
  items: T[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  renderRow: (item: T, index: number) => React.ReactNode;
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
        <div className="text-center py-8 space-y-2 bg-muted/10 border border-dashed border-border/40 rounded-xl">
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
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="bg-card border border-border/50 rounded-xl shadow-xs p-2.5 flex items-start gap-2.5">
              <div className="flex-1 min-w-0">{renderRow(item, index)}</div>
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
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
                  className="mt-0.5 p-1 rounded text-muted-foreground/50 hover:text-rose-600 hover:bg-rose-500/10 focus-visible:text-rose-600 focus-visible:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500/40 cursor-pointer transition"
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
