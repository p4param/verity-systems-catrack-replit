"use client";

import React, { useState } from "react";
import { useCalendarEvents, useCalendarConflicts, useRescheduleEvent } from "../hooks/use-calendar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function CalendarLegend() {
  return (
    <div className="flex items-center space-x-4 text-xs font-semibold">
      <div className="flex items-center space-x-1">
        <span className="h-3 w-3 rounded-full bg-blue-500"></span>
        <span>Corporate</span>
      </div>
      <div className="flex items-center space-x-1">
        <span className="h-3 w-3 rounded-full bg-green-500"></span>
        <span>Wedding</span>
      </div>
      <div className="flex items-center space-x-1">
        <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
        <span>Private</span>
      </div>
    </div>
  );
}

export function ConflictIndicator({ eventId }: { eventId?: string }) {
  const { data: conflict } = useCalendarConflicts(eventId);
  if (!conflict || !conflict.hasConflict) return null;

  return (
    <div className="text-xs text-red-500 font-bold flex items-center space-x-1">
      <span>⚠️ Conflict Detected: {conflict.message}</span>
    </div>
  );
}

export function CalendarFilters({ onChange }: { onChange: (filters: any) => void }) {
  return (
    <div className="flex space-x-2">
      <Button size="sm" onClick={() => onChange({ type: "WEDDING" })}>Weddings</Button>
      <Button size="sm" onClick={() => onChange({ type: "CORPORATE" })}>Corporate</Button>
      <Button size="sm" variant="outline" onClick={() => onChange({})}>Clear Filters</Button>
    </div>
  );
}

export function CalendarToolbar({ currentView, onViewChange }: { currentView: string; onViewChange: (v: string) => void }) {
  const views = ["DAY", "WEEK", "MONTH", "AGENDA"];
  return (
    <div className="flex items-center justify-between border-b pb-4 mb-4">
      <div className="flex space-x-2">
        {views.map((v) => (
          <Button
            key={v}
            variant={currentView === v ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange(v)}
          >
            {v}
          </Button>
        ))}
      </div>
      <CalendarLegend />
    </div>
  );
}

export function EventSchedulerDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Schedule Event</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Schedule Event</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">Select event details and times to reserve halls.</div>
      </DialogContent>
    </Dialog>
  );
}

export function RecurringEventDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Recurring Setup</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recurring Rule Customization</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">Setup rules for yearly repeat corporate meetings.</div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventCalendar() {
  const [view, setView] = useState("MONTH");
  const [filters, setFilters] = useState({});
  const { data: events, isLoading } = useCalendarEvents(filters);
  const { mutateAsync: reschedule } = useRescheduleEvent();

  const handleDragEnd = async (eventId: string, newStart: Date) => {
    try {
      const end = new Date(newStart.getTime() + 3600000 * 2); // 2 hour duration default
      await reschedule({ id: eventId, startAt: newStart, endAt: end });
      toast.success("Event rescheduled successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to reschedule event");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 border rounded-lg">
        <CalendarFilters onChange={setFilters} />
        <div className="flex space-x-2">
          <EventSchedulerDialog />
          <RecurringEventDialog />
        </div>
      </div>

      <CalendarToolbar currentView={view} onViewChange={setView} />

      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-lg bg-card text-muted-foreground">
          Loading calendar...
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {events && events.length > 0 ? (
              <div className="divide-y space-y-3">
                {events.map((e: any) => (
                  <div key={e.id} className="py-2 flex justify-between items-center text-sm">
                    <div>
                      <h4 className="font-semibold">{e.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.start).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <ConflictIndicator eventId={e.id} />
                      <Button size="sm" variant="outline" onClick={() => handleDragEnd(e.id, new Date(Date.now() + 3600000 * 24))}>
                        Reschedule (Tomorrow)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No events found for the active schedule range.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
