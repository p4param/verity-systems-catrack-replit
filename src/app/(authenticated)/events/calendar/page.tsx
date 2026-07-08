"use client";

import React from "react";
import EventCalendar from "@/modules/events/calendar/EventCalendar";

export default function EventCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event Calendar & Scheduling</h1>
        <p className="text-sm text-muted-foreground">View and coordinate bookings across venues, equipment, and staff.</p>
      </div>

      <EventCalendar />
    </div>
  );
}
