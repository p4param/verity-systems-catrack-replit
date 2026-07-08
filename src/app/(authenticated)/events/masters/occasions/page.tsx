/**
 * @deprecated LEGACY — Occasions static reference page.
 * Superseded by Core Master Data Engine (MDE). Do not extend.
 * Migration target: /api/masters/categories with module=EVENT, masterKey=OCCASION_TYPE
 */
"use client";

import { Hash, AlertTriangle } from "lucide-react";

// Legacy hardcoded occasion list — to be seeded into Core MDE during migration
const OCCASIONS = [
  "Engagement", "Mehendi", "Sangeet", "Wedding", "Reception",
  "Birthday", "Anniversary", "Corporate Lunch", "Corporate Dinner",
  "High Tea", "Seminar", "Conference", "Cocktail Party", "Product Launch",
  "Graduation", "Farewell", "Religious Ceremony", "Other"
];

export default function OccasionsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Hash size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Occasions (Legacy)</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            [DEPRECATED] Standard occasion types. Will be migrated to Core MDE.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>
          <strong>Deprecated:</strong> This page is a legacy reference view. Occasions will be managed
          through the Core Master Data Engine (MDE) after migration. The list below is the seed data
          for that migration.
        </span>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occasion Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {OCCASIONS.map((occasion, i) => (
              <tr key={occasion} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3.5 text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, "0")}</td>
                <td className="px-6 py-3.5 text-sm font-medium text-foreground">{occasion}</td>
                <td className="px-6 py-3.5">
                  <span className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-700 font-medium border border-amber-200">
                    Pending MDE Migration
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">{OCCASIONS.length} occasions — legacy seed data</p>
        </div>
      </div>
    </div>
  );
}
