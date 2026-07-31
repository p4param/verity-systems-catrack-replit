'use client';

import React from 'react';
import { History } from 'lucide-react';

import { DELIVERY_CHANNEL_LABELS, DELIVERY_STATUS_LABELS, ProposalDelivery } from '@/modules/cat/quotation/domain/proposal-delivery-types';

interface DeliveryHistoryListProps {
  title: string;
  deliveries: ProposalDelivery[] | null;
  emptyMessage: string;
}

// Shared delivery list — first introduced in QM-WP04B (Customer Delivery)
// as "Delivery History", reused as-is (same data, same rendering) by
// QM-WP04D (Customer Decision) as its "Delivery Summary" section, rather
// than duplicated. The title and the deliveries passed in are the only
// things that differ between the two callers.
export function DeliveryHistoryList({ title, deliveries, emptyMessage }: DeliveryHistoryListProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
      </div>
      <div className="p-5">
        {!deliveries || deliveries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-border/30 border border-border/30 rounded-xl overflow-hidden">
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-card">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-foreground">Revision {d.revisionNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                      {DELIVERY_CHANNEL_LABELS[d.channel]}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        d.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      }`}
                    >
                      {DELIVERY_STATUS_LABELS[d.status]}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {d.recipientName} &lt;{d.recipientEmail}&gt;
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground shrink-0">
                  <div>{new Date(d.deliveredAt).toLocaleString()}</div>
                  {d.deliveredBy && <div>by {d.deliveredBy.fullName}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
