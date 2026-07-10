"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { DynamicForm } from "@/shared/components/runtime/DynamicForm";
import { useRecord, useUpdateRecord } from "@/modules/platform/runtime/hooks/use-records";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { RuntimeInspector } from "@/shared/components/runtime/RuntimeInspector";

export default function RuntimeEntityEditPage({
  params,
}: {
  params: Promise<{ moduleCode: string; entityCode: string; recordId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [manifest, setManifest] = useState<RuntimeManifest | null>(null);
  
  const { data: record, isLoading } = useRecord(
    resolvedParams.moduleCode,
    resolvedParams.entityCode,
    resolvedParams.recordId
  );
  
  const updateMutation = useUpdateRecord(resolvedParams.moduleCode, resolvedParams.entityCode);

  useEffect(() => {
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
  }, [resolvedParams.entityCode, resolvedParams.moduleCode]);

  const handleSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: resolvedParams.recordId, data });
      toast.success("Record updated successfully");
      router.push(`/runtime/${resolvedParams.moduleCode}/${resolvedParams.entityCode}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update record");
    }
  };

  if (!manifest || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading...
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
            <BreadcrumbLink href={`/runtime/${resolvedParams.moduleCode}/${resolvedParams.entityCode}`} className="capitalize">
              {resolvedParams.entityCode}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold">{record?.recordNumber || "Edit"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            Edit {resolvedParams.entityCode}
          </h1>
          <p className="text-muted-foreground">
            {record?.recordNumber || resolvedParams.recordId}
          </p>
        </div>
      </div>

      <Card className="p-6 border-border">
        <DynamicForm
          manifest={manifest}
          initialData={record}
          onSubmit={handleSubmit}
          isSaving={updateMutation.isPending}
        />
      </Card>

      {manifest && <RuntimeInspector manifest={manifest} />}
    </div>
  );
}
