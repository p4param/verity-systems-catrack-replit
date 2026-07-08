"use client";

import React, { useState, useEffect } from "react";
import { useMobileDashboard, useOfflineTasks, useSyncQueue } from "@/modules/events/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Prevent static pre-rendering — this page uses browser APIs (navigator, geolocation)
export const dynamic = "force-dynamic";

export default function MobileDashboardPage() {
  const { data: dashboard, isLoading } = useMobileDashboard();
  const { syncQueue, addTaskToQueue } = useOfflineTasks();
  const { sync, isSyncing } = useSyncQueue();
  const [gpsActive, setGpsActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Safely read navigator.onLine on client only
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleGps = () => {
    if (!gpsActive) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsActive(true);
          toast.success(`GPS tracking active: ${pos.coords.latitude}, ${pos.coords.longitude}`);
        },
        () => {
          toast.error("Failed to acquire GPS position access.");
        }
      );
    } else {
      setGpsActive(false);
      toast.success("GPS location tracking deactivated.");
    }
  };

  const handleCapture = () => {
    toast.success("Initializing device camera integration...");
  };

  return (
    <div className="space-y-6 max-w-md mx-auto pb-16">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mobile Field Ops</h1>
          <p className="text-xs text-muted-foreground">Offline-first portal for supervisors &amp; drivers.</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`}></span>
      </div>

      {/* Sync Status Banner */}
      {syncQueue.length > 0 && (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs flex justify-between items-center text-yellow-800">
          <span>You have {syncQueue.length} unsynced offline changes.</span>
          <Button size="sm" onClick={sync} disabled={isSyncing}>
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      )}

      {/* Field Integration Controls */}
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={toggleGps} variant={gpsActive ? "default" : "outline"} className="text-xs">
          {gpsActive ? "🔴 Disable GPS" : "🛰️ Track Location"}
        </Button>
        <Button onClick={handleCapture} variant="outline" className="text-xs">
          📷 Camera Scan
        </Button>
      </div>

      {/* Active Runs / Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Today's Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="divide-y space-y-3">
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Loading operations...</div>
          ) : (
            <div className="space-y-3 text-xs pt-3">
              <div className="flex justify-between py-2 items-center">
                <div>
                  <h4 className="font-bold">EV-1002 - Corporate Luncheon</h4>
                  <p className="text-[10px] text-muted-foreground">Main Banquet Hall</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">Active</span>
              </div>

              <div className="flex justify-between py-2 items-center">
                <div>
                  <h4 className="font-bold">EV-1005 - Wedding Reception</h4>
                  <p className="text-[10px] text-muted-foreground">Royal Palace Gardens</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">Planned</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
