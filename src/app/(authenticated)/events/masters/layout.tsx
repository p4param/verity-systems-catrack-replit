/**
 * @deprecated LEGACY — Event Master Data layout.
 *
 * This layout and all sub-routes under /events/masters/* are superseded by
 * the platform-wide Core Master Data Engine (MDE).
 *
 * STATUS: Deprecated. Pages are intentionally left unreachable from navigation.
 * Do not add new tabs here. Remove this file when the MDE migration is complete
 * and data has been migrated from catering_event_types / statuses / priorities / categories.
 *
 * Migration target: /api/masters/* (Core MDE API)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle } from "lucide-react";

export default function EventMastersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 p-6 pb-0">
      {/* Deprecation banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
        <AlertTriangle size={16} className="shrink-0" />
        <span>
          <strong>Legacy — Event Master Data</strong> — These pages are deprecated and will be removed
          after migration to the Core Master Data Engine (MDE). Do not use for new configuration.
        </span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/events" className="hover:text-foreground hover:underline transition-colors">
          Events
        </Link>
        <span className="opacity-50">/</span>
        <span className="font-medium text-foreground">Master Data (Legacy)</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Master Data</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Legacy — Configure event types, statuses, priorities, and other reference data.
          Migration to Core MDE is in progress.
        </p>
      </div>

      <div className="min-h-[400px] -mx-6">{children}</div>
    </div>
  );
}
