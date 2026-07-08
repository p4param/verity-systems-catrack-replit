"use client";

import React, { useState } from "react";
import { Plus, Trash2, MapPin, Search, History, Compass, Check, HelpCircle } from "lucide-react";
import { WizardVenue } from "./useWizardStore";
import { toast } from "sonner";

interface Props {
  venues: WizardVenue[];
  onChange: (venues: WizardVenue[]) => void;
}

const VENUE_TYPES = ["Farm House", "Hotel", "Banquet", "Residence", "Outdoor", "Corporate Office", "Other"];
const LAYOUT_TYPES = ["Theatre", "Classroom", "Boardroom", "Banquet", "Cocktail", "U-Shape", "Cabaret", "Custom"];

function newVenue(): WizardVenue {
  return {
    venueId: undefined,
    venueName: "",
    venueType: "Banquet",
    address: "",
    city: "",
    state: "",
    mapsUrl: "",
    lat: "",
    lng: "",
    contactPerson: "",
    contactNumber: "",
    capacity: 100,
    parkingAvailable: true,
    kitchenAvailable: true,
    powerAvailability: "Grid + Back up",
    generatorAvailable: true,
    accommodationRequired: false,
    specialInstructions: "",
  };
}

export function Step4Venue({ venues, onChange }: Props) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeVenueIdx, setActiveVenueIdx] = useState<number | null>(null);

  const addVenue = () => onChange([...venues, newVenue()]);
  
  const removeVenue = (idx: number) => onChange(venues.filter((_, i) => i !== idx));
  
  const updateVenue = (idx: number, partial: Partial<WizardVenue>) =>
    onChange(venues.map((v, i) => (i === idx ? { ...v, ...partial } : v)));

  const selectExistingVenue = (v: any) => {
    if (activeVenueIdx === null) return;
    updateVenue(activeVenueIdx, {
      venueId: v.id,
      venueName: v.name,
      venueType: v.type || "Banquet",
      address: v.address || "",
      city: v.city || "",
      state: v.state || "",
      capacity: v.capacity || 200,
      contactPerson: v.contactPerson || "",
      contactNumber: v.contactNumber || "",
      parkingAvailable: v.parkingAvailable ?? true,
      kitchenAvailable: v.kitchenAvailable ?? true,
      generatorAvailable: v.generatorAvailable ?? true,
    });
    setShowSearchModal(false);
    toast.success("Venue selected successfully!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Venue Information</h3>
        </div>
        <button
          type="button"
          onClick={addVenue}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          <Plus size={13} /> Add Venue
        </button>
      </div>

      {venues.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
          <MapPin size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No venues added yet</p>
          <p className="text-xs mt-1">Add the primary and any additional event venues</p>
          <button type="button" onClick={addVenue} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            + Add First Venue
          </button>
        </div>
      )}

      {venues.map((venue, idx) => (
        <div key={idx} className="border rounded-xl p-4 space-y-4 bg-card relative">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {idx === 0 ? "Primary Venue" : `Venue #${idx + 1}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setActiveVenueIdx(idx); setShowSearchModal(true); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
              >
                <Search size={12} /> Select Existing
              </button>
              <button
                type="button"
                onClick={() => { setActiveVenueIdx(idx); setShowHistoryModal(true); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
              >
                <History size={12} /> History
              </button>
              <button
                type="button"
                onClick={() => removeVenue(idx)}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Venue Name<span className="text-destructive ml-0.5">*</span></label>
              <input
                type="text"
                value={venue.venueName ?? ""}
                onChange={(e) => updateVenue(idx, { venueName: e.target.value })}
                placeholder="e.g. Grand Ballroom, Rooftop Terrace"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Venue Type</label>
              <select
                value={venue.venueType ?? "Banquet"}
                onChange={(e) => updateVenue(idx, { venueType: e.target.value as any })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {VENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Venue Address</label>
              <input
                type="text"
                value={venue.address ?? ""}
                onChange={(e) => updateVenue(idx, { address: e.target.value })}
                placeholder="Full venue address"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
              <input
                type="text"
                value={venue.city ?? ""}
                onChange={(e) => updateVenue(idx, { city: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">State</label>
              <input
                type="text"
                value={venue.state ?? ""}
                onChange={(e) => updateVenue(idx, { state: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Venue Capacity</label>
              <input
                type="number"
                min={0}
                value={venue.capacity ?? ""}
                onChange={(e) => updateVenue(idx, { capacity: Number(e.target.value) })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Google Maps URL</label>
              <input
                type="url"
                value={venue.mapsUrl ?? ""}
                onChange={(e) => updateVenue(idx, { mapsUrl: e.target.value })}
                placeholder="Google Maps link"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Latitude</label>
              <input
                type="text"
                value={venue.lat ?? ""}
                onChange={(e) => updateVenue(idx, { lat: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Longitude</label>
              <input
                type="text"
                value={venue.lng ?? ""}
                onChange={(e) => updateVenue(idx, { lng: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Power Availability</label>
              <input
                type="text"
                value={venue.powerAvailability ?? ""}
                onChange={(e) => updateVenue(idx, { powerAvailability: e.target.value })}
                placeholder="Grid, generator, etc."
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Person</label>
              <input
                type="text"
                value={venue.contactPerson ?? ""}
                onChange={(e) => updateVenue(idx, { contactPerson: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Number</label>
              <input
                type="tel"
                value={venue.contactNumber ?? ""}
                onChange={(e) => updateVenue(idx, { contactNumber: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-6 sm:col-span-3 py-1.5 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={venue.parkingAvailable ?? false}
                  onChange={(e) => updateVenue(idx, { parkingAvailable: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Parking Available
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={venue.kitchenAvailable ?? false}
                  onChange={(e) => updateVenue(idx, { kitchenAvailable: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Kitchen Available
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={venue.generatorAvailable ?? false}
                  onChange={(e) => updateVenue(idx, { generatorAvailable: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Generator Available
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={venue.accommodationRequired ?? false}
                  onChange={(e) => updateVenue(idx, { accommodationRequired: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Accommodation Required
              </label>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Special Venue Instructions</label>
              <textarea
                value={venue.specialInstructions ?? ""}
                onChange={(e) => updateVenue(idx, { specialInstructions: e.target.value })}
                rows={2}
                placeholder="Loading rules, safety requirements, setup access times..."
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Select Existing Venue Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Search size={16} className="text-primary" /> Select Configured Venue
              </h3>
              <button type="button" onClick={() => setShowSearchModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {[
                { id: "1", name: "Imperial Palace Lawn", type: "Farm House", city: "Delhi", capacity: 800 },
                { id: "2", name: "Grand Vista Ballroom", type: "Banquet", city: "Delhi", capacity: 400 },
                { id: "3", name: "Hyatt Regency Hall C", type: "Hotel", city: "Delhi", capacity: 250 },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectExistingVenue(v)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-bold text-sm">{v.name}</p>
                    <p className="text-muted-foreground mt-0.5">{v.type} · {v.city}</p>
                  </div>
                  <span className="text-muted-foreground">Cap: {v.capacity}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setShowSearchModal(false)} className="px-4 py-2 rounded-lg bg-muted text-xs hover:opacity-90 font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                <History size={16} className="text-primary" /> Venue Utilization History
              </h3>
              <button type="button" onClick={() => setShowHistoryModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              <div className="border rounded-lg p-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Varun Marriage Reception</span>
                  <span className="text-emerald-600 font-bold">Successfully Executed</span>
                </div>
                <p className="text-muted-foreground">Hosted at Imperial Palace Lawn on 10 Nov 2025</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setShowHistoryModal(false)} className="px-4 py-2 rounded-lg bg-muted text-xs hover:opacity-90 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
