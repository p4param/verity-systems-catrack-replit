"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useCalendar() {
  return useQuery({
    queryKey: ["calendar-metadata"],
    queryFn: async () => {
      const res = await fetch("/api/events/calendar");
      if (!res.ok) throw new Error("Failed to fetch calendar metadata");
      return res.json();
    },
  });
}

export function useCalendarEvents(filters?: any) {
  return useQuery({
    queryKey: ["calendar-events", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/events/calendar?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
  });
}

export function useCalendarResources() {
  return useQuery({
    queryKey: ["calendar-resources"],
    queryFn: async () => {
      const res = await fetch("/api/events/calendar/resources");
      if (!res.ok) throw new Error("Failed to fetch calendar resources");
      return res.json();
    },
  });
}

export function useCalendarConflicts(eventId?: string) {
  return useQuery({
    queryKey: ["calendar-conflicts", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/calendar/conflicts?eventId=${eventId}`);
      if (!res.ok) throw new Error("Failed to check calendar conflicts");
      return res.json();
    },
    enabled: !!eventId,
  });
}

export function useRescheduleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, startAt, endAt }: { id: string; startAt: Date; endAt: Date }) => {
      const res = await fetch("/api/events/calendar/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, startAt, endAt }),
      });
      if (!res.ok) throw new Error("Failed to reschedule event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}

export function useRecurringEvents() {
  return useQuery({
    queryKey: ["calendar-recurring"],
    queryFn: async () => {
      const res = await fetch("/api/events/calendar/recurring");
      if (!res.ok) throw new Error("Failed to fetch recurring calendar items");
      return res.json();
    },
  });
}
