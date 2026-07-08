/**
 * @deprecated LEGACY — Event Statuses master page.
 * Superseded by Core Master Data Engine (MDE). Do not extend.
 * Migration target: /api/masters/categories with module=EVENT, masterKey=EVENT_STATUS
 */
"use client";

import { CheckCircle } from "lucide-react";
import { MasterCodeTable } from "@/shared";

export default function StatusesPage() {
  return (
    <MasterCodeTable
      title="Event Statuses (Legacy)"
      description="[DEPRECATED] This will be migrated to the Core Master Data Engine. Do not add new records here."
      apiPath="/api/events/masters/statuses"
      icon={<CheckCircle size={20} />}
      codeHelp="e.g. CONFIRMED"
    />
  );
}
