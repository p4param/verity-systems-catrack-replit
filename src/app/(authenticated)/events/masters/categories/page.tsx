/**
 * @deprecated LEGACY — Event Categories master page.
 * Superseded by Core Master Data Engine (MDE). Do not extend.
 * Migration target: /api/masters/categories with module=EVENT, masterKey=EVENT_CATEGORY
 */
"use client";

import { Tag } from "lucide-react";
import { MasterCodeTable } from "@/shared";

export default function CategoriesPage() {
  return (
    <MasterCodeTable
      title="Event Categories (Legacy)"
      description="[DEPRECATED] This will be migrated to the Core Master Data Engine. Do not add new records here."
      apiPath="/api/events/masters/categories"
      icon={<Tag size={20} />}
      codeHelp="e.g. SOCIAL"
    />
  );
}
