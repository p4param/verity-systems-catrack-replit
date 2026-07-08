"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useEvent, useUpdateEvent } from "@/modules/events/hooks";
import { EditEventForm } from "@/modules/events/components/event-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EditEventPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const { mutateAsync: updateEvent } = useUpdateEvent();

  const handleSubmit = async (data: any) => {
    try {
      if (!event) return;
      await updateEvent({ id, data: { ...data, version: event.version } });
      toast.success("Event updated successfully");
      router.push(`/events/${id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!event) {
    return <div className="p-8 text-red-500 font-semibold">Event not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Event</h1>
        <p className="text-sm text-muted-foreground">Modify the details of your event.</p>
      </div>

      <div className="bg-card p-6 border rounded-lg">
        <EditEventForm defaultValues={event} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
