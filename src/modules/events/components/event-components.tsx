"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EventDto } from "../types";

export function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    INQUIRY: "bg-blue-50 text-blue-700 border-blue-200",
    TENTATIVE: "bg-yellow-50 text-yellow-700 border-yellow-200",
    CONFIRMED: "bg-green-50 text-green-700 border-green-200",
    COMPLETED: "bg-purple-50 text-purple-700 border-purple-200",
    CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
  };
  const activeStyle = styles[status] || styles.CLOSED;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${activeStyle}`}>
      {status}
    </span>
  );
}

export function EventPriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    MEDIUM: "bg-orange-50 text-orange-700 border-orange-200",
    LOW: "bg-green-50 text-green-700 border-green-200",
  };
  const activeStyle = styles[priority] || styles.LOW;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${activeStyle}`}>
      {priority}
    </span>
  );
}

export function EventHeader({ event }: { event: EventDto }) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
        <p className="text-sm text-muted-foreground">Number: {event.eventNumber}</p>
      </div>
      <div className="flex space-x-2">
        <EventStatusBadge status={event.statusId} />
        <EventPriorityBadge priority={event.priorityId} />
      </div>
    </div>
  );
}

export function EventCard({ event }: { event: EventDto }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">{event.name}</CardTitle>
        <EventStatusBadge status={event.statusId} />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">Number: {event.eventNumber}</p>
        <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
          <span>Date: {new Date(event.startDate).toLocaleDateString()}</span>
          <span>Guests: {event.guestCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function EventSummaryCard({ event }: { event: EventDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Event Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Manager</span>
          <span className="font-semibold">{event.managerId || "Unassigned"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Booking Date</span>
          <span className="font-semibold">{new Date(event.bookingDate).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Budget</span>
          <span className="font-semibold">${event.budgetAmount.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function EventFunctionCard({ func }: { func: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{func.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>Time: {new Date(func.startAt).toLocaleString()} - {new Date(func.endAt).toLocaleString()}</div>
        <div>Guests: {func.guestCount}</div>
      </CardContent>
    </Card>
  );
}

export function EventFinancialCard({ financial }: { financial: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Realized Margin & Profitability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex justify-between">
          <span>Estimated Margin</span>
          <span className="font-bold">{financial.estimatedMargin}%</span>
        </div>
        <div className="flex justify-between">
          <span>Actual Margin</span>
          <span className="font-bold">{financial.actualMargin}%</span>
        </div>
        <div className="flex justify-between">
          <span>Outstanding Balance</span>
          <span className="font-bold">${financial.balance}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function EventHealthCard({ score }: { score: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Event Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{score}%</div>
        <p className="text-[10px] text-muted-foreground">Based on task completion and schedule delay checks.</p>
      </CardContent>
    </Card>
  );
}

export function EventCountdownCard({ targetDate }: { targetDate: Date }) {
  const days = Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Countdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{days > 0 ? `${days} Days Left` : "Happening Today / Past"}</div>
      </CardContent>
    </Card>
  );
}

export function EventTimelineItem({ item }: { item: any }) {
  return (
    <div className="flex space-x-3 py-2 border-l-2 border-muted pl-4 ml-2">
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{item.summary}</h3>
          <span className="text-xs text-muted-foreground">{new Date(item.loggedAt).toLocaleTimeString()}</span>
        </div>
        <p className="text-xs text-muted-foreground">{item.details}</p>
      </div>
    </div>
  );
}

export function EventTaskCard({ task }: { task: any }) {
  return (
    <div className="p-3 border rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-between">
      <div>
        <h4 className="text-sm font-semibold">{task.title}</h4>
        <p className="text-xs text-muted-foreground">{task.description}</p>
      </div>
      <div className="flex space-x-2">
        <span className="text-[10px] px-2 py-0.5 border rounded-full font-medium">{task.priority}</span>
        <span className="text-[10px] px-2 py-0.5 border rounded-full font-medium bg-secondary">{task.status}</span>
      </div>
    </div>
  );
}

export function EventDocumentCard({ doc }: { doc: any }) {
  return (
    <div className="p-3 border rounded-lg flex items-center justify-between text-xs">
      <div>
        <h4 className="font-semibold">{doc.name}</h4>
        <p className="text-muted-foreground">{Math.round(doc.fileSize / 1024)} KB</p>
      </div>
      <a href={doc.filePath} download className="text-blue-500 font-bold hover:underline">Download</a>
    </div>
  );
}

export function EventCommunicationCard({ comm }: { comm: any }) {
  return (
    <Card className="p-3 text-xs space-y-2">
      <div className="flex justify-between text-muted-foreground">
        <span>Channel: {comm.channel}</span>
        <span>To: {comm.recipient}</span>
      </div>
      {comm.subject && <div className="font-semibold">{comm.subject}</div>}
      <div>{comm.content}</div>
    </Card>
  );
}

export function EventCalendarCard({ item }: { item: any }) {
  return (
    <div className="p-2 border rounded bg-secondary/20 text-xs">
      <div className="font-semibold">{item.title}</div>
      <div className="text-muted-foreground">{new Date(item.startAt).toLocaleDateString()}</div>
    </div>
  );
}
