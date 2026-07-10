"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useMobileDashboard() {
  return useQuery({
    queryKey: ["mobile-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/events/dashboard");
      if (!res.ok) throw new Error("Failed to load mobile dashboard data");
      return res.json();
    },
  });
}

export function useOfflineEvents() {
  const [offlineEvents, setOfflineEvents] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("offline_events");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  const saveOfflineEvents = (events: any[]) => {
    localStorage.setItem("offline_events", JSON.stringify(events));
    setOfflineEvents(events);
  };

  return { offlineEvents, saveOfflineEvents };
}

export function useOfflineTasks() {
  const [syncQueue, setSyncQueue] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const queue = localStorage.getItem("task_sync_queue");
      if (queue) return JSON.parse(queue);
    }
    return [];
  });

  const addTaskToQueue = (task: any) => {
    const updated = [...syncQueue, { ...task, id: `offline-${Date.now()}`, pendingSync: true }];
    localStorage.setItem("task_sync_queue", JSON.stringify(updated));
    setSyncQueue(updated);
  };

  return { syncQueue, addTaskToQueue };
}

export function useSyncQueue() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = async () => {
    const queue = localStorage.getItem("task_sync_queue");
    if (!queue) return;

    const items = JSON.parse(queue);
    if (items.length === 0) return;

    setIsSyncing(true);
    try {
      // Process sync queue items sequentially
      for (const item of items) {
        await fetch("/api/events/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      localStorage.setItem("task_sync_queue", JSON.stringify([]));
      queryClient.invalidateQueries({ queryKey: ["events-tasks"] });
    } catch (e) {
      console.error("Offline sync failed: ", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return { sync, isSyncing };
}
