# Event Manager Frontend Implementation (Next.js + ShadCN + React Query)

## 1. File: `src/modules/events/components/event-status-badge.tsx`

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface EventStatusBadgeProps {
  status: string; // e.g. "INQUIRY", "TENTATIVE", "CONFIRMED", "COMPLETED", "CLOSED"
  className?: string;
}

const statusStyles: Record<string, string> = {
  INQUIRY: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  TENTATIVE: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  CONFIRMED: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  COMPLETED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  CLOSED: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  const styles = statusStyles[status] || statusStyles.CLOSED;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        styles,
        className
      )}
    >
      {status}
    </span>
  );
}
```

---

## 2. File: `src/modules/events/hooks/use-events.ts`

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EventDto } from "../types/dto";

async function fetchEvents(filters?: any): Promise<EventDto[]> {
  const queryParams = new URLSearchParams(filters).toString();
  const res = await fetch(`/api/events?${queryParams}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

async function fetchEventById(id: string): Promise<EventDto> {
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) throw new Error("Failed to fetch event");
  return res.json();
}

async function createEvent(data: any): Promise<EventDto> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create event");
  return res.json();
}

export function useEvents(filters?: any) {
  return useQuery<EventDto[]>({
    queryKey: ["events", filters],
    queryFn: () => fetchEvents(filters),
  });
}

export function useEvent(id: string) {
  return useQuery<EventDto>({
    queryKey: ["event", id],
    queryFn: () => fetchEventById(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
```

---

## 3. File: `src/modules/events/forms/create-event-form.tsx`

```tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateEventSchema } from "../validations/schemas";
import { useCreateEvent } from "../hooks/use-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function CreateEventForm({ onSuccess }: { onSuccess?: () => void }) {
  const { mutateAsync: createEvent, isPending } = useCreateEvent();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(CreateEventSchema),
    defaultValues: {
      name: "",
      guestCount: 50,
      budgetAmount: 1500,
      currency: "USD",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await createEvent(data);
      toast.success("Event created successfully");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="guestCount">Guest Count</Label>
          <Input id="guestCount" type="number" {...register("guestCount", { valueAsNumber: true })} />
          {errors.guestCount && <p className="text-xs text-red-500">{errors.guestCount.message as string}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="budgetAmount">Budget</Label>
          <Input id="budgetAmount" type="number" {...register("budgetAmount", { valueAsNumber: true })} />
          {errors.budgetAmount && <p className="text-xs text-red-500">{errors.budgetAmount.message as string}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating..." : "Create Event"}
      </Button>
    </form>
  );
}
```

---

## 4. File: `src/app/(authenticated)/events/[id]/page.tsx`

```tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useEvent } from "@/modules/events/hooks/use-events";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventStatusBadge } from "@/modules/events/components/event-status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventWorkspacePage() {
  const { id } = useParams() as { id: string };
  const { data: event, isLoading, error } = useEvent(id);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !event) {
    return <div className="p-8 text-red-500 font-semibold">Error loading event workspace.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Event Workspace Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">Event Number: {event.eventNumber}</p>
        </div>
        <EventStatusBadge status={event.statusId} />
      </div>

      {/* Tabs Interface */}
      <Tabs defaultValue="summary" className="w-full space-y-4">
        <TabsList className="flex flex-wrap border-b rounded-none bg-transparent p-0">
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Summary
          </TabsTrigger>
          <TabsTrigger value="functions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Functions
          </TabsTrigger>
          <TabsTrigger value="financials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Financials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 pt-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Guest Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{event.guestCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${event.budgetAmount.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Event Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold">
                  {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="functions">
          <div className="text-muted-foreground text-sm">Sub-function components planning grid.</div>
        </TabsContent>

        <TabsContent value="financials">
          <div className="text-muted-foreground text-sm">Real-time costing, payables, and margins charts.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```
