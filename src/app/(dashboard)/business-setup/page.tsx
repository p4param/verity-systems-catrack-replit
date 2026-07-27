"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  Users,
  Building2,
  UtensilsCrossed,
  Sparkles,
  CalendarDays,
  ChefHat,
  Coffee,
  Truck,
  UsersRound,
  ArrowRight,
  Clock,
} from "lucide-react";

interface SetupCard {
  title: string;
  description: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  status: "LIVE" | "COMING_SOON";
}

const setupCards: SetupCard[] = [
  {
    title: "Contacts",
    description: "Customers, Corporate Clients & Individual Contacts",
    href: "/cat/relationships",
    icon: Users,
    status: "LIVE",
  },
  {
    title: "Venues",
    description: "Venue directory and lookup foundation for discovery workflows.",
    href: "/cat/venues",
    icon: Building2,
    status: "LIVE",
  },
  {
    title: "Menus",
    description: "Menu catalog management is scheduled for a future release.",
    icon: UtensilsCrossed,
    status: "COMING_SOON",
  },
  {
    title: "Event Occasions",
    description: "Manage event occasion masters for discovery quick choice chips and lookup search.",
    href: "/cat/event-occasions",
    icon: Sparkles,
    status: "LIVE",
  },
  {
    title: "Event Types",
    description: "Event type setup is planned and will be available soon.",
    icon: CalendarDays,
    status: "COMING_SOON",
  },
  {
    title: "Service Styles",
    description: "Service style setup is planned and will be available soon.",
    icon: ChefHat,
    status: "COMING_SOON",
  },
  {
    title: "Meal Types",
    description: "Meal type setup is planned and will be available soon.",
    icon: Coffee,
    status: "COMING_SOON",
  },
  {
    title: "Vendors",
    description: "Vendor setup is planned and will be available soon.",
    icon: Truck,
    status: "COMING_SOON",
  },
  {
    title: "Staff",
    description: "Staff setup is planned and will be available soon.",
    icon: UsersRound,
    status: "COMING_SOON",
  },
];

export default function BusinessSetupPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden bg-card p-6 rounded-2xl border border-border/40 shadow-xs">
        <div className="absolute inset-0 bg-linear-to-r from-primary/8 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Clock className="w-3.5 h-3.5" />
          <span>Administrative Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Business Setup
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Configure and manage business reference data used throughout Catrack.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {setupCards.map((card) => {
          const Icon = card.icon;
          const isLive = card.status === "LIVE";

          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    isLive
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border/40"
                  }`}
                >
                  {isLive ? "Available" : "Coming Soon"}
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">
                  {card.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isLive ? "Ready" : "Awaiting release"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    isLive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isLive ? `Open ${card.title}` : "Planned"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </>
          );

          if (!isLive || !card.href) {
            return (
              <div
                key={card.title}
                className="bg-card rounded-2xl border border-border/40 p-4 shadow-2xs flex flex-col gap-4 cursor-default transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={card.title}
              href={card.href}
              className="bg-card rounded-2xl border border-border/40 p-4 shadow-2xs hover:shadow-xs hover:border-border/80 hover:-translate-y-0.5 transition-all flex flex-col gap-4"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
