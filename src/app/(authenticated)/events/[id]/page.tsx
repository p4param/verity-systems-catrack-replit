"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useEvent, useEventTasks, useEventTimeline, useEventPayments, useEventDocuments } from "@/modules/events/hooks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventStatusBadge, EventSummaryCard, EventCountdownCard, EventTimelineItem, EventTaskCard, EventDocumentCard, EventCommunicationCard } from "@/modules/events/components/event-components";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventWorkspacePage() {
  const { id } = useParams() as { id: string };
  const { data: event, isLoading } = useEvent(id);
  const { data: tasks } = useEventTasks(id);
  const { data: timeline } = useEventTimeline(id);
  const { data: payments } = useEventPayments(id);
  const { data: documents } = useEventDocuments(id);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-sm text-muted-foreground">Event Number: {event.eventNumber}</p>
        </div>
        <EventStatusBadge status={event.statusId} />
      </div>

      <Tabs defaultValue="summary" className="w-full space-y-4">
        <TabsList className="border-b rounded-none bg-transparent p-0 flex flex-wrap gap-2 sm:gap-6">
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Summary
          </TabsTrigger>
          <TabsTrigger value="functions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Functions
          </TabsTrigger>
          <TabsTrigger value="venues" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Venues
          </TabsTrigger>
          <TabsTrigger value="menus" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Menus
          </TabsTrigger>
          <TabsTrigger value="production" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Production
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="procurement" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Procurement
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Staff
          </TabsTrigger>
          <TabsTrigger value="logistics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Logistics
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Documents
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Payments
          </TabsTrigger>
          <TabsTrigger value="communications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Communications
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 pt-4">
          <div className="grid md:grid-cols-3 gap-6">
            <EventSummaryCard event={event} />
            <EventCountdownCard targetDate={event.startDate} />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Guest Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{event.guestCount} Guests</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Sub-function components planning grid.</div>
        </TabsContent>

        <TabsContent value="venues" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Linked venue details and layout mapping.</div>
        </TabsContent>

        <TabsContent value="menus" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Menu selection and packages planner.</div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Kitchen recipe scale sheet scheduler.</div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Locked warehouse items allocation tables.</div>
        </TabsContent>

        <TabsContent value="procurement" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Supplier purchasing logic links.</div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Staff roster management and timesheet planner.</div>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Transit run-sheet scheduler mapping coordinates.</div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents && documents.length > 0 ? (
                documents.map((doc: any) => (
                  <EventDocumentCard key={doc.id} doc={doc} />
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">No documents attached.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks && tasks.length > 0 ? (
                tasks.map((task: any) => (
                  <EventTaskCard key={task.id} task={task} />
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">No tasks scheduled.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payments && payments.length > 0 ? (
                payments.map((payment: any) => (
                  <div key={payment.id} className="p-3 border rounded flex justify-between items-center text-xs">
                    <span>Paid Amount: <strong>${payment.amount}</strong> via {payment.method}</span>
                    <span className="text-muted-foreground">Paid At: {new Date(payment.paidAt).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">No payments received yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">Omnichannel messaging logs.</div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline && timeline.length > 0 ? (
                timeline.map((item: any) => (
                  <EventTimelineItem key={item.id} item={item} />
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">No activities logged yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 pt-4">
          <div className="text-muted-foreground text-sm">System audit log mappings.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
