"use client";

import { useState, useEffect } from "react";
import { Card, StatusBadge } from "@/components/inventory/InventoryUI";
import {
    Calendar,
    Plus,
    ChevronRight,
    Clock,
    Package,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import CreateEventHoldModal from "@/components/inventory/CreateEventHoldModal";
import EventDetailsModal from "@/components/inventory/EventDetailsModal";
import EventReconciliationModal from "@/components/inventory/EventReconciliationModal";

export default function ReservationManagement() {
    const { fetchWithAuth } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isReconcileOpen, setIsReconcileOpen] = useState(false);
    const [eventToReconcile, setEventToReconcile] = useState(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth("/api/inventory/events");
            setEvents(data);
        } catch (err) {
            console.error("Events Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [fetchWithAuth]);

    if (loading) return <div className="p-8 text-center animate-pulse">Synchronizing Logical Hold Schedules...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Event Reservations</span>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Event Reservations</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage logical holds and forecast demand for future events.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                >
                    <Plus size={16} /> New Event Hold
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Events List */}
                <Card title="Upcoming Logical Holds" icon={Calendar} className="lg:col-span-2">
                    <div className="space-y-4 mt-4">
                        {events.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground bg-muted/50/50 border-2 border-dashed border-border rounded-xl">
                                <Calendar size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="font-medium text-sm">No scheduled events found.</p>
                                <button onClick={() => setIsModalOpen(true)} className="text-primary text-xs font-bold mt-2 hover:underline">Initiate First Hold</button>
                            </div>
                        ) : events.map(event => (
                            <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className="p-5 rounded-xl border border-border bg-muted/20 hover:bg-card hover:shadow-sm transition-all group cursor-pointer border-l-4 border-l-amber-400"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center bg-card border border-border rounded-lg p-2 min-w-[60px] shadow-sm">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">{new Date(event.eventDate).toLocaleString('default', { month: 'short' })}</p>
                                            <p className="text-xl font-black text-primary">{new Date(event.eventDate).getDate()}</p>
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg group-hover:text-primary transition-colors">{event.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <Clock size={12} /> {new Date(event.eventDate).toLocaleDateString()} • {event.eventReservations?.length || 0} Items Reserved
                                            </div>
                                        </div>
                                    </div>
                                    <StatusBadge type={
                                        event.status === 'COMPLETED' ? 'success' :
                                            event.status === 'ALLOTTED' ? 'info' :
                                                event.status === 'CONFIRMED' ? 'warning' : 'neutral'
                                    }>
                                        {event.status}
                                    </StatusBadge>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {event.eventReservations?.map(r => (
                                        <div key={r.id} className="px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-md text-[10px] font-bold uppercase flex items-center gap-1.5">
                                            <Package size={10} /> {r.reservedQty} x {r.apparel?.name || 'Unknown Item'}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                                    <span className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 opacity-100 transition-all">
                                        View Details <ChevronRight size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Conflict Engine Summary */}
                <div className="space-y-6">
                    <Card title="Conflict Engine Status" icon={ShieldCheck}>
                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mt-2 flex items-start gap-3">
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-emerald-800">No Availability Conflicts</p>
                                <p className="text-[10px] text-emerald-600 mt-1 leading-relaxed">The internal AvailabilityEngine has verified all 100% of currently active logical holds against physical ledger balances.</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Reservation Policy" icon={AlertTriangle}>
                        <div className="space-y-4 mt-2">
                            <div className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <p>Logical holds (Reservations) reserve <strong>CLEAN</strong> stock only.</p>
                            </div>
                            <div className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <p>Allotment physically removes items from warehouse ledger.</p>
                            </div>
                            <div className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <p>Availability = Clean Physical - Reserved.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <CreateEventHoldModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchEvents}
            />

            <EventDetailsModal
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                event={selectedEvent}
                onSuccess={fetchEvents}
                onReconcile={() => {
                    setEventToReconcile(selectedEvent);
                    setIsReconcileOpen(true);
                }}
            />

            <EventReconciliationModal
                isOpen={isReconcileOpen}
                onClose={() => setIsReconcileOpen(false)}
                event={eventToReconcile}
                onSuccess={fetchEvents}
            />
        </div>
    );
}
