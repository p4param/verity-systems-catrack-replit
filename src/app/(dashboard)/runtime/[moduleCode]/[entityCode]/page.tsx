"use client";

import React, { use, useEffect, useState } from "react";
import { useRecords } from "@/modules/platform/runtime/hooks/use-records";
import { DynamicGrid } from "@/shared/components/runtime/DynamicGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { RuntimeInspector } from "@/shared/components/runtime/RuntimeInspector";

export default function RuntimeEntityListPage({
  params,
}: {
  params: Promise<{ moduleCode: string; entityCode: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const { data: records, isLoading, error } = useRecords(
    resolvedParams.moduleCode,
    resolvedParams.entityCode
  );

  const [manifest, setManifest] = useState<RuntimeManifest | null>(null);

  useEffect(() => {
    // We can fetch the manifest dynamically from another endpoint, 
    // or extract it from the first record, but properly it should be fetched by its own hook.
    // For now we assume the backend can provide the manifest via an API if we want it statically,
    // or we fetch it from the entity directly.
    const fetchManifest = async () => {
      try {
        const res = await fetch(`/api/runtime/${resolvedParams.moduleCode}/${resolvedParams.entityCode}/manifest`);
        if (res.ok) {
          const fetchedManifest = await res.json();
          if (fetchedManifest) {
            setManifest(fetchedManifest);
          }
        }
      } catch (err) {
        console.error("Failed to load manifest", err);
      }
    };
    fetchManifest();
  }, [resolvedParams.entityCode]);

  if (error) {
    return (
      <div className="p-6 text-center text-rose-500">
        <h3 className="text-xl font-bold">Failed to load records</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="capitalize">{resolvedParams.moduleCode}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="capitalize font-semibold">{resolvedParams.entityCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            {resolvedParams.entityCode} Records
          </h1>
          <p className="text-muted-foreground capitalize">
            Manage {resolvedParams.entityCode} data.
          </p>
        </div>
        
        <Button onClick={() => router.push(`/runtime/${resolvedParams.moduleCode}/${resolvedParams.entityCode}/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      <Card className="p-4 border-border">
        {manifest ? (
          <DynamicGrid 
            manifest={manifest} 
            records={records || []} 
            isLoading={isLoading} 
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {isLoading ? "Loading..." : "Manifest not available"}
          </div>
        )}
      </Card>
      
      {manifest && <RuntimeInspector manifest={manifest} />}
    </div>
  );
}
