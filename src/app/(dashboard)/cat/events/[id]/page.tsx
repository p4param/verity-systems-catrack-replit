'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';

import { EventSummary, EVENT_STATUS_LABELS } from '@/modules/cat/event/domain/event-types';
import { EventWorkspaceKey } from '@/modules/cat/event/domain/event-workspace-types';
import { EventWorkspaceNavigator } from '@/modules/cat/event/components/EventWorkspaceNavigator';
import { EventOverviewWorkspace } from '@/modules/cat/event/components/EventOverviewWorkspace';
import { EventPlanningWorkspace } from '@/modules/cat/event/components/EventPlanningWorkspace';
import { EventMenuPlanningWorkspace } from '@/modules/cat/event/components/EventMenuPlanningWorkspace';
import { EventIngredientDemandWorkspace } from '@/modules/cat/event/components/EventIngredientDemandWorkspace';

// EM-WP01 — Event Foundation.
// The standard Event Workspace, replacing the temporary Event Detail page
// from QM-WP04E. Workspace navigation contains only Overview — Planning,
// Menu, Kitchen, Procurement, Inventory, Timeline, Staff, and Billing are
// explicitly out of scope for this Work Package. Events are read-only:
// there is no edit affordance anywhere in this shell.
export default function EventWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<EventWorkspaceKey>('OVERVIEW');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/events/${id}`);
        const data = await res.json();
        if (data.success) setEvent(data.event);
      } catch (err) {
        console.error('Failed to load Event Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Event Workspace...</div>;
  }

  if (!event) {
    return (
      <div className="p-10 text-center space-y-2">
        <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Event not found.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push('/cat/events')}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Event Directory</span>
      </button>

      {/* Event Header */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-xs space-y-2">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wide">{event.eventNumber}</span>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">{event.eventName}</h1>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full">
            {EVENT_STATUS_LABELS[event.status]}
          </span>
          {event.eventType && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-muted/40 text-muted-foreground rounded-full">{event.eventType}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push(`/cat/relationships/${event.relationshipId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer pt-1"
        >
          {event.relationshipName}
        </button>
      </div>

      {/* Event Workspace Navigator */}
      <EventWorkspaceNavigator activeWorkspace={activeWorkspace} onSelect={setActiveWorkspace} />

      {/* Current Workspace */}
      {activeWorkspace === 'OVERVIEW' ? (
        <EventOverviewWorkspace event={event} />
      ) : activeWorkspace === 'PLANNING' ? (
        <EventPlanningWorkspace event={event} />
      ) : activeWorkspace === 'MENU_PLANNING' ? (
        <EventMenuPlanningWorkspace event={event} />
      ) : activeWorkspace === 'INGREDIENT_DEMAND' ? (
        <EventIngredientDemandWorkspace event={event} />
      ) : null}
    </div>
  );
}
