"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/modules/events/hooks";
import { EventTable } from "@/modules/events/components/event-tables";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

export default function EventReportsPage() {
  const { data } = useEvents();
  const events = data?.events ?? [];
  const [selectedReport, setSelectedReport] = useState("REGISTER");

  const handleExport = (format: "CSV" | "PDF" | "EXCEL") => {
    toast.success(`Exporting ${selectedReport} report as ${format}...`);
  };

  const reportsList = [
    { code: "REGISTER", name: "Event Register" },
    { code: "PROFITABILITY", name: "Event Profitability Report" },
    { code: "REVENUE", name: "Event Revenue Report" },
    { code: "COSTING", name: "Event Costing Report" },
    { code: "STATUS", name: "Event Status Report" },
    { code: "RESOURCE", name: "Event Resource Report" },
  ];

  const activeReport = reportsList.find((r) => r.code === selectedReport);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Event Manager Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Generate list register exports, margin statements, and staff audits.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Report Catalog Dropdown */}
          <div className="relative">
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer font-medium"
            >
              {reportsList.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={() => handleExport("PDF")}>Export PDF</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("EXCEL")}>Export Excel</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("CSV")}>Export CSV</Button>
        </div>
      </div>

      {/* Report Preview Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Report Preview: {activeReport?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <EventTable events={events} />
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No report data matches current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
