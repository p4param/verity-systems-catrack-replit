"use client";

import React from "react";
import { Calendar, Users, FileText, DollarSign, Tag, MapPin, Briefcase } from "lucide-react";
import { WizardFormData } from "./useWizardStore";
import { useEventFilters } from "../hooks";

interface Props {
  data: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
}

const OCCASIONS = [
  "Engagement", "Mehendi", "Sangeet", "Wedding", "Reception", "Birthday",
  "Anniversary", "Corporate Lunch", "Corporate Dinner", "High Tea",
  "Seminar", "Conference", "Other"
];

const BUDGET_RANGES = [
  "Under 2 Lakhs", "2-5 Lakhs", "5-10 Lakhs", "10-20 Lakhs", "20-50 Lakhs", "Above 50 Lakhs"
];

export function Step2EventInfo({ data, onChange }: Props) {
  const { data: filterOptions, isLoading } = useEventFilters();

  const field = (
    label: string,
    key: keyof WizardFormData,
    type = "text",
    required = false,
    className = ""
  ) => (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(data[key] as string) ?? ""}
        onChange={(e) => onChange({ [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={label}
        min={type === "number" ? 0 : undefined}
      />
    </div>
  );

  const selectField = (
    label: string,
    key: keyof WizardFormData,
    options: { id: string; name: string }[],
    required = false,
    loading = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <select
        value={(data[key] as string) ?? ""}
        onChange={(e) => onChange({ [key]: e.target.value })}
        disabled={loading}
        className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      >
        {loading ? (
          <option value="">Loading {label.toLowerCase()}s...</option>
        ) : options.length === 0 ? (
          <option value="">No {label.toLowerCase()}s found (please run seed)</option>
        ) : (
          <>
            <option value="">Select {label}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </>
        )}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Briefcase size={15} className="text-primary" />
        <h3 className="font-semibold text-sm">Basic Event Info</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field("Event Title", "name", "text", true, "sm:col-span-2")}

        {selectField(
          "Event Type",
          "typeId",
          filterOptions?.types || [],
          true,
          isLoading
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Occasion<span className="text-destructive ml-0.5">*</span>
          </label>
          <select
            value={data.occasion ?? ""}
            onChange={(e) => onChange({ occasion: e.target.value })}
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Occasion</option>
            {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {selectField(
          "Status",
          "statusId",
          filterOptions?.statuses || [],
          true,
          isLoading
        )}
        {selectField(
          "Priority",
          "priorityId",
          filterOptions?.priorities || [],
          true,
          isLoading
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Currency<span className="text-destructive ml-0.5">*</span>
          </label>
          <select
            value={data.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {["INR", "USD", "AED", "GBP", "EUR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {field("Lead Source", "leadSource")}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <Calendar size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Dates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {field("Booking Date", "bookingDate", "date", true)}
          {field("Event Start Date", "startDate", "date", true)}
          {field("Event End Date", "endDate", "date", true)}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <Users size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Guests & Budget</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {field("Expected Guest Count", "guestCount", "number", true)}
          {field("Estimated Budget Amount", "budgetAmount", "number", true)}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Expected Budget Range</label>
            <select
              value={data.budgetRange ?? ""}
              onChange={(e) => onChange({ budgetRange: e.target.value })}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Budget Range</option>
              {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <MapPin size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Location & Org</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {field("Branch", "branch")}
          {field("Company", "company")}
          {field("City", "city")}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <FileText size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Additional Info & Notes</h3>
        </div>
        <div className="space-y-4">
          {field("Tags (comma separated)", "tags")}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Special Occasion Notes</label>
            <textarea
              value={data.specialOccasionNotes ?? ""}
              onChange={(e) => onChange({ specialOccasionNotes: e.target.value })}
              rows={2}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="E.g., details about surprises, anniversary number, special preferences..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">General Remarks</label>
            <textarea
              value={data.remarks ?? ""}
              onChange={(e) => onChange({ remarks: e.target.value })}
              rows={2}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Any general coordinator remarks..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
