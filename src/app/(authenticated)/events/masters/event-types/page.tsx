/**
 * @deprecated LEGACY — Event Types master page.
 * Superseded by Core Master Data Engine (MDE). Do not extend.
 * Migration target: /api/masters/categories with module=EVENT, masterKey=EVENT_TYPE
 */
"use client";

import { CalendarDays } from "lucide-react";
import { MasterCodeTable } from "@/shared";

export default function EventTypesPage() {
  return (
    <MasterCodeTable
      title="Event Types (Legacy)"
      description="[DEPRECATED] This will be migrated to the Core Master Data Engine. Do not add new records here."
      apiPath="/api/events/masters/types"
      icon={<CalendarDays size={20} />}
      codeHelp="e.g. WEDDING"
    />
  );
}
