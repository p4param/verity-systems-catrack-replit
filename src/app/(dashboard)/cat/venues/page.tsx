"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  FileSpreadsheet,
  MapPin,
  Plus,
  Search,
  User,
} from "lucide-react";
import {
  CatVenue,
  CatVenueStatus,
  CatVenueType,
  VENUE_STATUS_OPTIONS,
  VENUE_TYPE_OPTIONS,
  venueTypeLabel,
} from "@/modules/cat/venues/types";

interface VenueFormState {
  venueName: string;
  venueType: CatVenueType;
  address: string;
  areaLocality: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  primaryContactName: string;
  primaryContactMobile: string;
  primaryContactEmail: string;
  notes: string;
  status: CatVenueStatus;
}

const DEFAULT_FORM: VenueFormState = {
  venueName: "",
  venueType: "BANQUET_HALL",
  address: "",
  areaLocality: "",
  city: "",
  state: "",
  country: "",
  pinCode: "",
  primaryContactName: "",
  primaryContactMobile: "",
  primaryContactEmail: "",
  notes: "",
  status: "ACTIVE",
};

export default function VenueDirectoryPage() {
  const [venues, setVenues] = useState<CatVenue[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [form, setForm] = useState<VenueFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("venueType", typeFilter);

      const res = await fetch(`/api/cat/venues?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (json?.success && Array.isArray(json.items)) {
        setVenues(json.items);
      }
    } catch (error) {
      console.error("Failed to load venues:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchVenues, 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter, typeFilter]);

  const handleCreate = async () => {
    if (!form.venueName.trim() || !form.venueType) {
      alert("Venue Name and Venue Type are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/cat/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to create venue.");
        return;
      }

      setShowCreateDrawer(false);
      setForm(DEFAULT_FORM);
      await fetchVenues();
    } catch (error) {
      console.error("Venue create failed:", error);
      alert("Failed to create venue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("venueType", typeFilter);

      const res = await fetch(`/api/cat/venues/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Export failed.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `venue-directory-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Venue export failed:", error);
      alert("Export failed.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Business Setup</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Venue Directory</h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs px-3.5 py-2 rounded-xl border border-border/50 transition flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowCreateDrawer(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Venue</span>
          </button>
        </div>
      </div>

      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by venue name, number, city, contact..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Status</option>
            {VENUE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Types</option>
            {VENUE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading Venue Directory...</div>
        ) : venues.length === 0 ? (
          <div className="p-10 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Venues Yet</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Add your first venue to establish the shared venue directory.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Venue</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">City</div>
              <div className="col-span-2">Primary Contact</div>
              <div className="col-span-1 text-right">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {venues.map((venue) => (
              <div key={venue.id} className="grid grid-cols-12 gap-4 px-5 py-3 items-center">
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-xs text-foreground truncate">{venue.venueName}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{venue.venueNumber}</div>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground">{venueTypeLabel(venue.venueType)}</div>

                <div className="col-span-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{venue.city || "-"}</span>
                </div>

                <div className="col-span-2 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{venue.primaryContactName || "-"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">{venue.primaryContactMobile || ""}</div>
                </div>

                <div className="col-span-1 text-right">
                  <span
                    className={`inline-flex items-center text-[10px] px-2 py-0.5 font-bold rounded-full border ${
                      venue.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : venue.status === "DRAFT"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : venue.status === "ARCHIVED"
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {venue.status}
                  </span>
                </div>

                <div className="col-span-2 text-right flex justify-end gap-2">
                  <Link
                    href={`/cat/venues/${venue.id}`}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-border/50 hover:bg-muted"
                  >
                    View
                  </Link>
                  <Link
                    href={`/cat/venues/${venue.id}?mode=edit`}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-card h-full p-6 shadow-2xl overflow-y-auto border-l border-border">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground">Add Venue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Capture only core business venue information.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Venue Name *</label>
                  <input
                    value={form.venueName}
                    onChange={(event) => setForm((prev) => ({ ...prev, venueName: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Venue Type *</label>
                  <select
                    value={form.venueType}
                    onChange={(event) => setForm((prev) => ({ ...prev, venueType: event.target.value as CatVenueType }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  >
                    {VENUE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Area / Locality</label>
                  <input
                    value={form.areaLocality}
                    onChange={(event) => setForm((prev) => ({ ...prev, areaLocality: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">State</label>
                  <input
                    value={form.state}
                    onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Country</label>
                  <input
                    value={form.country}
                    onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">PIN Code</label>
                  <input
                    value={form.pinCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, pinCode: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Primary Contact Name</label>
                  <input
                    value={form.primaryContactName}
                    onChange={(event) => setForm((prev) => ({ ...prev, primaryContactName: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Primary Contact Mobile</label>
                  <input
                    value={form.primaryContactMobile}
                    onChange={(event) => setForm((prev) => ({ ...prev, primaryContactMobile: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Primary Contact Email</label>
                  <input
                    type="email"
                    value={form.primaryContactEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, primaryContactEmail: event.target.value }))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as CatVenueStatus }))}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
                >
                  {VENUE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateDrawer(false);
                    setForm(DEFAULT_FORM);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border/50 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Venue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
