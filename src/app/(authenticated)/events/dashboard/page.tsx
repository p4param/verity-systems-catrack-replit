"use client";

import React from "react";
import { useDashboardCards } from "@/modules/events/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDashboardPage() {
  const { data: dashboard, isLoading } = useDashboardCards();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Event Operations & Sales Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time operational dashboards and KPI statistics rollup.</p>
      </div>

      {/* 1. Overview Widgets Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Live Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-blue-600">{dashboard.todayEvents}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Operational live tracks</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-green-600">{dashboard.upcomingEvents}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Schedules in next 30 days</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Confirmations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-yellow-600">{dashboard.pendingPayments}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting customer deposit</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border-purple-500/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-purple-600">{dashboard.eventsRequiringAttention}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Events needing action</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Analytical KPI Charts Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Sales Funnel Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Monthly Sales Revenue ($)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-between">
            <div className="flex items-end h-48 space-x-6 border-b pb-2">
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t h-20"></div>
                <span className="text-[10px] mt-2">May</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t h-32"></div>
                <span className="text-[10px] mt-2">June</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t h-40"></div>
                <span className="text-[10px] mt-2">July</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center">Gross Revenue Trends</div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart mockup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Events Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-around">
            <div className="relative w-32 h-32 mx-auto rounded-full border-8 border-blue-500 flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full border-8 border-green-500"></div>
              <span className="text-xs font-bold text-foreground">67% Confirmed</span>
            </div>
            <div className="flex justify-center space-x-4 text-[10px] text-muted-foreground">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Confirmed</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Draft</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Operational Utilization Indicators */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Resource Allocation Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span>Vehicle Fleet Availability</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded overflow-hidden">
                <div className="bg-blue-600 h-full w-[85%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Warehouse Equipment Stock</span>
                <span>60%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded overflow-hidden">
                <div className="bg-green-600 h-full w-[60%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Kitchen Staff Allocation Capacity</span>
                <span>92%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded overflow-hidden">
                <div className="bg-purple-600 h-full w-[92%]"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Payments Due Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span>Overdue Receivables</span>
              <span className="font-semibold text-red-500">$12,450.00</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Awaiting Deposit Clearance</span>
              <span className="font-semibold text-yellow-500">$5,800.00</span>
            </div>
            <div className="flex justify-between">
              <span>Total Received This Month</span>
              <span className="font-semibold text-green-500">$45,900.00</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
