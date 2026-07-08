"use client";

import React from "react";
import Link from "next/link";
import {
  Box, Shirt, Calendar, ShoppingBag, Truck, Database, HelpCircle, ChevronRight, BarChart3
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function InventoryPortalPage() {
  const portalItems = [
    {
      name: "Dashboard",
      description: "Analyze stock levels, executive KPIs, margins, and trends.",
      href: "/inventory/dashboard",
      icon: BarChart3,
      color: "text-violet-500 bg-violet-50 dark:bg-violet-950/20",
    },
    {
      name: "Overview & Stock",
      description: "Monitor real-time inventory levels, stock status, and general overview.",
      href: "/inventory",
      icon: Box,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      name: "Help & Guide",
      description: "Access user guides, system documentation, and walkthroughs.",
      href: "/inventory/help",
      icon: HelpCircle,
      color: "text-slate-500 bg-slate-50 dark:bg-slate-950/20",
    },
    {
      name: "Apparel Catalog",
      description: "Browse clothing collections, categories, and apparel master metadata.",
      href: "/inventory/apparels",
      icon: Shirt,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      name: "Event Reservations",
      description: "Schedule and manage apparel holds, reservations, and wedding schedules.",
      href: "/inventory/reservations",
      icon: Calendar,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      name: "Purchase Orders",
      description: "Initiate supplier procurement, purchase orders, and tracking records.",
      href: "/inventory/purchases",
      icon: ShoppingBag,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      name: "Orders & Dispatches",
      description: "Manage laundry logs, vendor deliveries, and item dispatches.",
      href: "/inventory/laundry",
      icon: Truck,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20",
    },
    {
      name: "Master Data",
      description: "Configure system masters, departments, branches, and custom options.",
      href: "/inventory/masters",
      icon: Database,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Inventory Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an inventory module to manage stock, catalog, reservations, procurement, and dispatches.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {portalItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className="group block">
              <Card className="h-full border hover:border-primary/50 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className={`p-2.5 rounded-lg shrink-0 ${item.color}`}>
                    <Icon size={20} />
                  </div>
                  <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-primary font-semibold pt-1">
                    <span>Manage Module</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
