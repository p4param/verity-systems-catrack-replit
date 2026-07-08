"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventListFilters {
  query?: string;
  statusId?: string;
  typeId?: string;
  branchId?: string;
  salesExecId?: string;
  managerId?: string;
  customerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface EventPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EventListResponse {
  events: any[];
  pagination: EventPagination;
}

export interface DashboardKpis {
  totalEvents: number;
  todayEvents: number;
  upcomingEvents: number;
  revenueThisMonth: number;
  pendingPayments: number;
  overduePayments: number;
  eventsRequiringAttention: number;
  eventsByStatus: Record<string, number>;
}

export interface FilterOptions {
  statuses: { id: string; name: string; code: string }[];
  types: { id: string; name: string; code: string }[];
  priorities: { id: string; name: string; code: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSearchParams(filters: EventListFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return params.toString();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useEvents(filters: EventListFilters = {}) {
  const { fetchWithAuth } = useAuth();
  return useQuery<EventListResponse>({
    queryKey: ["events", filters],
    queryFn: async () => {
      const qs = buildSearchParams(filters);
      return fetchWithAuth(`/api/events?${qs}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useEventFilters() {
  const { fetchWithAuth } = useAuth();
  return useQuery<FilterOptions>({
    queryKey: ["event-filters"],
    queryFn: async () => {
      return fetchWithAuth("/api/events/filters");
    },
    staleTime: 5 * 60_000,
  });
}

export function useDashboardCards() {
  const { fetchWithAuth } = useAuth();
  return useQuery<DashboardKpis>({
    queryKey: ["events-dashboard-kpis"],
    queryFn: async () => {
      return fetchWithAuth("/api/events/dashboard");
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useBulkUpdate() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ids: string[];
      action: "change_status" | "assign_manager" | "archive" | "delete";
      payload?: Record<string, any>;
    }) => {
      return fetchWithAuth("/api/events/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events-dashboard-kpis"] });
    },
  });
}

export function useExportEvents() {
  const { fetchWithAuth } = useAuth();
  return useMutation({
    mutationFn: async (params: { ids?: string[]; format: "csv" | "json" }) => {
      if (params.format === "csv") {
        // Need raw response for blob
        const token = localStorage.getItem("refreshToken"); // fallback or direct header
        // Since blob download is custom, let's fetch with headers manually or use fetchWithAuth if supported
        // But fetchWithAuth handles JWT refresh and headers automatically and resolves JSON.
        // Let's implement a clean fetch with auth token directly for blob:
        const sessionToken = document.cookie
          .split("; ")
          .find(row => row.startsWith("accessToken="))
          ?.split("=")[1];
        
        const res = await fetch("/api/events/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionToken ? { "Authorization": `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error("Export failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `events-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true };
      }
      
      return fetchWithAuth("/api/events/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    },
  });
}

export function useCreateEvent() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return fetchWithAuth("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events-dashboard-kpis"] });
    },
  });
}

export function useEvent(id: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      return fetchWithAuth(`/api/events/${id}`);
    },
    enabled: !!id,
  });
}

export function useEventTasks(eventId: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["event-tasks", eventId],
    queryFn: async () => {
      return fetchWithAuth(`/api/events/tasks?eventId=${eventId}`);
    },
    enabled: !!eventId,
  });
}

export function useEventTimeline(eventId: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["event-timeline", eventId],
    queryFn: async () => {
      return fetchWithAuth(`/api/events/timeline?eventId=${eventId}`);
    },
    enabled: !!eventId,
  });
}

export function useEventPayments(eventId: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["event-payments", eventId],
    queryFn: async () => {
      return fetchWithAuth(`/api/events/payments?eventId=${eventId}`);
    },
    enabled: !!eventId,
  });
}

export function useEventDocuments(eventId: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["event-documents", eventId],
    queryFn: async () => {
      return fetchWithAuth(`/api/events/documents?eventId=${eventId}`);
    },
    enabled: !!eventId,
  });
}

export function useUpdateEvent() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return fetchWithAuth(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", vars.id] });
    },
  });
}

export function useDeleteEvent() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return fetchWithAuth(`/api/events/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Debounce helper hook
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (val: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDebounced(val), delay);
    },
    [delay]
  );

  useEffect(() => {
    update(value);
  }, [value, update]);

  return debounced;
}
