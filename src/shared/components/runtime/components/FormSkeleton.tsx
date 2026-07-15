import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full animate-pulse" aria-hidden="true">
      {/* Tabs list skeleton */}
      <div className="flex gap-2 p-1 bg-muted/20 rounded-lg max-w-xs">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Card Form container skeleton */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <div className="p-6 space-y-6">
          {/* Row 1: Two Columns */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>

          {/* Row 2: Full Width */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormSkeleton;
