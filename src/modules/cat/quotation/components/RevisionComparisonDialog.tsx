'use client';

import React from 'react';
import { Scale } from 'lucide-react';

import { ComparisonGroup } from '@/modules/cat/quotation/domain/revision-comparison';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface RevisionComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisionA: number | null;
  revisionB: number | null;
  groups: ComparisonGroup[] | null;
  loading: boolean;
  error: string;
}

// QM-WP04C — Revision Management: Comparison.
// Business differences only — structured fields side by side, free-text
// content collapsed to a Changed/Unchanged flag with a short preview
// snippet when changed (UX Polish). No document diff.
export function RevisionComparisonDialog({
  open,
  onOpenChange,
  revisionA,
  revisionB,
  groups,
  loading,
  error,
}: RevisionComparisonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Compare Revisions
          </DialogTitle>
          {revisionA !== null && revisionB !== null && (
            <DialogDescription>
              Revision {revisionA} vs Revision {revisionB} — business differences only.
            </DialogDescription>
          )}
        </DialogHeader>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

        {loading || !groups ? (
          !error && <p className="text-xs text-muted-foreground animate-pulse">Loading comparison...</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group.title}</div>
                <div className="border border-border/30 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Field</span>
                    <span>Revision {revisionA}</span>
                    <span>Revision {revisionB}</span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {group.rows.map((row) =>
                      row.kind === 'value' ? (
                        <div
                          key={row.label}
                          className={`grid grid-cols-3 gap-2 px-4 py-2 text-xs ${row.changed ? 'bg-amber-500/5' : ''}`}
                        >
                          <span className="font-semibold text-foreground">{row.label}</span>
                          <span className={row.changed ? 'font-bold text-amber-700' : 'text-muted-foreground'}>{row.valueA}</span>
                          <span className={row.changed ? 'font-bold text-amber-700' : 'text-muted-foreground'}>{row.valueB}</span>
                        </div>
                      ) : row.changed ? (
                        <div key={row.label} className="grid grid-cols-3 gap-2 px-4 py-2 text-xs bg-amber-500/5">
                          <span className="font-semibold text-foreground">
                            {row.label} <span className="text-[10px] font-bold text-amber-700 uppercase">Changed</span>
                          </span>
                          <span className="text-[11px] text-amber-700 italic">{row.snippetA || '(empty)'}</span>
                          <span className="text-[11px] text-amber-700 italic">{row.snippetB || '(empty)'}</span>
                        </div>
                      ) : (
                        <div key={row.label} className="grid grid-cols-3 gap-2 px-4 py-2 text-xs">
                          <span className="font-semibold text-foreground">{row.label}</span>
                          <span className="col-span-2 text-muted-foreground">Unchanged</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
