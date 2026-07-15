"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/shared/components/runtime/DynamicForm";
import { RuntimeHost } from "@/shared/components/runtime/components/RuntimeHost";
import { useCreateRecord } from "@/modules/platform/runtime/hooks/use-records";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { RuntimeInspector } from "@/shared/components/runtime/RuntimeInspector";

export default function RuntimeEntityCreatePage({
  params,
}: {
  params: Promise<{ moduleCode: string; entityCode: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [manifest, setManifest] = useState<RuntimeManifest | null>(null);
  
  const createMutation = useCreateRecord(resolvedParams.moduleCode, resolvedParams.entityCode);

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
      await createMutation.mutateAsync(data);
      toast.success("Record created successfully");
      router.push(`/runtime/${resolvedParams.moduleCode}/${resolvedParams.entityCode}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create record");
    }
  };

  if (!manifest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-4 mb-6 shrink-0">
        <Breadcrumb>
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
              <BreadcrumbPage className="font-semibold">New</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight capitalize">
              Create {resolvedParams.entityCode}
            </h1>
            <p className="text-xs text-muted-foreground capitalize">
              Add a new {resolvedParams.entityCode} record.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="runtime-entity-form"
              size="sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-6 border-border overflow-hidden">
        {manifest && (
          <RuntimeHost
            manifest={manifest}
            onSubmit={handleSubmit}
            isSaving={createMutation.isPending}
          >
            <DynamicForm
              manifest={manifest}
              isSaving={createMutation.isPending}
            />
          </RuntimeHost>
        )}
      </Card>
      
      {manifest && <RuntimeInspector manifest={manifest} />}
    </div>
  );
}
