"use client";

import React from "react";
import { EventDto } from "../types";
import { EventStatusBadge } from "./event-components";

export function EventTable({ events }: { events: EventDto[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b">
          <tr>
            <th className="px-6 py-3">Event Number</th>
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Guest Count</th>
            <th className="px-6 py-3">Budget</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Start Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((event) => (
            <tr key={event.id} className="bg-card hover:bg-accent/10 transition-colors">
              <td className="px-6 py-4 font-semibold text-foreground">{event.eventNumber}</td>
              <td className="px-6 py-4">{event.name}</td>
              <td className="px-6 py-4">{event.guestCount}</td>
              <td className="px-6 py-4">${event.budgetAmount.toLocaleString()}</td>
              <td className="px-6 py-4">
                <EventStatusBadge status={event.statusId} />
              </td>
              <td className="px-6 py-4">{new Date(event.startDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventTaskTable({ tasks }: { tasks: any[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b">
          <tr>
            <th className="px-6 py-3">Task Title</th>
            <th className="px-6 py-3">Priority</th>
            <th className="px-6 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((task) => (
            <tr key={task.id} className="bg-card hover:bg-accent/10 transition-colors">
              <td className="px-6 py-4 font-semibold text-foreground">{task.title}</td>
              <td className="px-6 py-4">{task.priority}</td>
              <td className="px-6 py-4">{task.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventPaymentTable({ payments }: { payments: any[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b">
          <tr>
            <th className="px-6 py-3">Amount</th>
            <th className="px-6 py-3">Method</th>
            <th className="px-6 py-3">Paid At</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((payment) => (
            <tr key={payment.id} className="bg-card hover:bg-accent/10 transition-colors">
              <td className="px-6 py-4 font-semibold text-foreground">${payment.amount.toLocaleString()}</td>
              <td className="px-6 py-4">{payment.method}</td>
              <td className="px-6 py-4">{new Date(payment.paidAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventDocumentTable({ documents }: { documents: any[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b">
          <tr>
            <th className="px-6 py-3">Document Name</th>
            <th className="px-6 py-3">File Size</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc) => (
            <tr key={doc.id} className="bg-card hover:bg-accent/10 transition-colors">
              <td className="px-6 py-4 font-semibold text-foreground">{doc.name}</td>
              <td className="px-6 py-4">{Math.round(doc.fileSize / 1024)} KB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventCommunicationTable({ communications }: { communications: any[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm text-left text-muted-foreground">
        <thead className="text-xs uppercase bg-secondary text-secondary-foreground border-b">
          <tr>
            <th className="px-6 py-3">Channel</th>
            <th className="px-6 py-3">Recipient</th>
            <th className="px-6 py-3">Content</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {communications.map((comm) => (
            <tr key={comm.id} className="bg-card hover:bg-accent/10 transition-colors">
              <td className="px-6 py-4 font-semibold text-foreground">{comm.channel}</td>
              <td className="px-6 py-4">{comm.recipient}</td>
              <td className="px-6 py-4">{comm.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventKanbanBoard({ events, onStatusChange }: { events: EventDto[]; onStatusChange: (id: string, status: string) => void }) {
  const columns = ["INQUIRY", "TENTATIVE", "CONFIRMED", "COMPLETED"];

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnEvents = events.filter((e) => e.statusId === column);
        return (
          <div key={column} className="bg-muted/40 p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">{column} ({columnEvents.length})</h3>
            <div className="space-y-3">
              {columnEvents.map((event) => (
                <div key={event.id} className="bg-card p-3 border rounded shadow-sm hover:shadow transition-shadow">
                  <h4 className="font-semibold text-xs">{event.name}</h4>
                  <p className="text-[10px] text-muted-foreground">Guests: {event.guestCount}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
