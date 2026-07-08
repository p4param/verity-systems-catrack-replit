/**
 * @deprecated LEGACY — Event Priorities master page.
 * Superseded by Core Master Data Engine (MDE). Do not extend.
 * Migration target: /api/masters/categories with module=EVENT, masterKey=EVENT_PRIORITY
 */
"use client";

import { Flag } from "lucide-react";
import { MasterCodeTable } from "@/shared";

export default function PrioritiesPage() {
  return (
    <MasterCodeTable
      title="Event Priorities (Legacy)"
      description="[DEPRECATED] This will be migrated to the Core Master Data Engine. Do not add new records here."
      apiPath="/api/events/masters/priorities"
      icon={<Flag size={20} />}
      codeHelp="e.g. HIGH"
    />
  );
}
