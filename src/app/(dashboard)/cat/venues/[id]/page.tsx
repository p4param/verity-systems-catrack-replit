"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Save } from "lucide-react";
import {
  CatVenueStatus,
  CatVenueType,
  VENUE_STATUS_OPTIONS,
  VENUE_TYPE_OPTIONS,
} from "@/modules/cat/venues/types";

interface VenueFormState {
  id: string;
  venueNumber: string;
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
  creationSource?: string;
  createdFromModule?: string;
  createdFromRecordId?: string;
  createdFromRecordNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function VenueDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params?.id || "");
  const mode = searchParams.get("mode");

  const [editing, setEditing] = useState(mode === "edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VenueFormState | null>(null);

  useEffect(() => {
    setEditing(mode === "edit");
  }, [mode]);

  useEffect(() => {
    const loadVenue = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cat/venues/${id}`);
        const json = res.ok ? await res.json().catch(() => ({})) : {};

        if (!res.ok || !json?.success || !json?.venue) {
          alert(json?.error || "Venue not found.");
          return;
        }

        const v = json.venue;
        setForm({
          id: v.id,
          venueNumber: v.venueNumber,
          venueName: v.venueName,
          venueType: v.venueType,
          address: v.address || "",
          areaLocality: v.areaLocality || "",
          city: v.city || "",
          state: v.state || "",
          country: v.country || "",
          pinCode: v.pinCode || "",
          primaryContactName: v.primaryContactName || "",
          primaryContactMobile: v.primaryContactMobile || "",
          primaryContactEmail: v.primaryContactEmail || "",
          notes: v.notes || "",
          status: v.status,
          creationSource: v.creationSource || "MANUAL",
          createdFromModule: v.createdFromModule || undefined,
          createdFromRecordId: v.createdFromRecordId || undefined,
          createdFromRecordNumber: v.createdFromRecordNumber || undefined,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        });
      } catch (error) {
        console.error("Failed to load venue:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadVenue();
  }, [id]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.venueName.trim() || !form.venueType) {
      alert("Venue Name and Venue Type are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cat/venues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Save failed.");
        return;
      }

      setEditing(false);
      const refreshed = await fetch(`/api/cat/venues/${id}`);
      const refreshedJson = refreshed.ok ? await refreshed.json().catch(() => ({})) : {};
      if (refreshedJson?.success && refreshedJson?.venue) {
        const v = refreshedJson.venue;
        setForm({
          id: v.id,
          venueNumber: v.venueNumber,
          venueName: v.venueName,
          venueType: v.venueType,
          address: v.address || "",
          areaLocality: v.areaLocality || "",
          city: v.city || "",
          state: v.state || "",
          country: v.country || "",
          pinCode: v.pinCode || "",
          primaryContactName: v.primaryContactName || "",
          primaryContactMobile: v.primaryContactMobile || "",
          primaryContactEmail: v.primaryContactEmail || "",
          notes: v.notes || "",
          status: v.status,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        });
      }
    } catch (error) {
      console.error("Venue save failed:", error);
      alert("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <div className="p-8 text-xs text-muted-foreground">Loading venue...</div>;
  }

  const readOnly = !editing;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Venue Workspace</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">{form.venueName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{form.venueNumber}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cat/venues"
            className="px-3.5 py-2 rounded-xl border border-border/50 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>

          {readOnly ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3.5 py-2 rounded-xl border border-primary/35 text-primary text-xs font-semibold hover:bg-primary/10"
            >
              Edit Venue
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/40 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Venue Name *</label>
            <input
              value={form.venueName}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, venueName: event.target.value } : prev))}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Venue Type *</label>
            <select
              value={form.venueType}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, venueType: event.target.value as CatVenueType } : prev))
              }
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
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
            onChange={(event) => setForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
            disabled={readOnly}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Area / Locality</label>
            <input
              value={form.areaLocality}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, areaLocality: event.target.value } : prev))}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">City</label>
            <input
              value={form.city}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, city: event.target.value } : prev))}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">State</label>
            <input
              value={form.state}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, state: event.target.value } : prev))}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Country</label>
            <input
              value={form.country}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, country: event.target.value } : prev))}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">PIN Code</label>
            <input
              value={form.pinCode}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, pinCode: event.target.value } : prev))}
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Primary Contact Name</label>
            <input
              value={form.primaryContactName}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, primaryContactName: event.target.value } : prev))
              }
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Primary Contact Mobile</label>
            <input
              value={form.primaryContactMobile}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, primaryContactMobile: event.target.value } : prev))
              }
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Primary Contact Email</label>
            <input
              value={form.primaryContactEmail}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, primaryContactEmail: event.target.value } : prev))
              }
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
              disabled={readOnly}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">Status</label>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((prev) => (prev ? { ...prev, status: event.target.value as CatVenueStatus } : prev))
            }
            className="w-full md:w-52 bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs"
            disabled={readOnly}
          >
            {VENUE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-muted/20 border border-border/60 rounded-xl p-4 mt-6">
          <h4 className="text-xs font-bold text-foreground mb-2.5">Audit Metadata</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Creation Source</span>
              <span className="font-semibold text-foreground">{form.creationSource || "MANUAL"}</span>
            </div>
            {form.createdFromModule && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Created From Module</span>
                <span className="font-semibold text-foreground">{form.createdFromModule}</span>
              </div>
            )}
            {form.createdFromRecordNumber && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Record Number</span>
                <span className="font-semibold text-foreground">{form.createdFromRecordNumber}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground block text-[11px]">Created At</span>
              <span className="font-semibold text-foreground">{new Date(form.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
