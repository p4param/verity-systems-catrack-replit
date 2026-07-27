"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  BusinessValidationStatus,
  DiscoveryArea,
  InquiryDiscoveryOverview,
} from "@/modules/cat/inquiry/domain/discovery-types";
import {
  generateVenueBusinessSummary,
  computeVenueValidation,
  KnowledgeFlagValue,
  VenueDiscoveryConversation,
  VenueFinalizationStatus,
  VenueType,
} from "@/modules/cat/inquiry/features/venue-discovery";
import { ActivityPriority } from "@/modules/cat/inquiry/domain/activity-types";
import VenueLookup from "@/modules/cat/venues/components/VenueLookup";

interface VenueDiscoveryWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
  onCreateSuggestedActivity: (payload: {
    title: string;
    discoveryAreaKey: "VENUE";
    priority: ActivityPriority;
    dueDate: string;
    assignedTo: string;
  }) => void;
}

const VENUE_TYPE_OPTIONS: Array<{ value: VenueType; label: string }> = [
  { value: "BANQUET_HALL", label: "Banquet Hall" },
  { value: "HOTEL", label: "Hotel" },
  { value: "LAWNS", label: "Lawns" },
  { value: "RESIDENCE", label: "Residence" },
  { value: "CORPORATE_PREMISES", label: "Corporate Premises" },
  { value: "OTHER", label: "Other" },
];

const VENUE_STATUS_OPTIONS: Array<{
  value: VenueFinalizationStatus;
  label: string;
}> = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "SEARCHING", label: "Searching" },
  { value: "UNDECIDED", label: "Undecided" },
];

const KNOWLEDGE_PROMPTS: Array<{
  key: keyof VenueDiscoveryConversation["knowledge"];
  label: string;
}> = [
  { key: "kitchenAvailable", label: "Kitchen Available" },
  { key: "powerAvailable", label: "Power Available" },
  { key: "outdoorSetup", label: "Outdoor Setup" },
  { key: "parkingConstraints", label: "Parking Constraints" },
  { key: "loadingRestrictions", label: "Loading Restrictions" },
  { key: "siteVisitRequired", label: "Site Visit Required" },
];

function defaultVenueState(
  initialArea: DiscoveryArea | null,
): VenueDiscoveryConversation {
  const persisted = initialArea?.venueDiscovery;
  if (persisted) {
    return {
      selectionMode: persisted.selectionMode || "EXISTING",
      existingVenueId: persisted.existingVenueId,
      existingVenueName: persisted.existingVenueName,
      proposedVenueName: persisted.proposedVenueName,
      venueType: persisted.venueType,
      proposedLocationText: persisted.proposedLocationText,
      venueFinalizationStatus: persisted.venueFinalizationStatus || "SEARCHING",
      knowledge: persisted.knowledge || {},
      additionalNotes: persisted.additionalNotes || "",
      businessSummary: persisted.businessSummary || initialArea?.summary || "",
      isSummaryManuallyEdited:
        persisted.isSummaryManuallyEdited ?? !!initialArea?.summary,
      discussionStatus:
        persisted.discussionStatus ||
        (initialArea?.lifecycle === "COMPLETED"
          ? "COMPLETE"
          : "CONTINUE_LATER"),
      validationStatus:
        persisted.validationStatus ||
        initialArea?.validation ||
        "NEEDS_ATTENTION",
    };
  }

  return {
    selectionMode: "EXISTING",
    venueFinalizationStatus: "SEARCHING",
    knowledge: {},
    additionalNotes: "",
    businessSummary: initialArea?.summary || "",
    isSummaryManuallyEdited: !!initialArea?.summary,
    discussionStatus:
      initialArea?.lifecycle === "COMPLETED" ? "COMPLETE" : "CONTINUE_LATER",
    validationStatus: initialArea?.validation || "NEEDS_ATTENTION",
  };
}

function validationBadge(validation: BusinessValidationStatus) {
  if (validation === "READY") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 rounded-full border border-emerald-500/30 font-extrabold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Discovery Ready
      </span>
    );
  }

  if (validation === "BLOCKED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/15 text-rose-600 rounded-full border border-rose-500/30 font-extrabold">
        <AlertTriangle className="w-3.5 h-3.5" />
        Business Blocked
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 text-amber-600 rounded-full border border-amber-500/30 font-extrabold">
      <AlertTriangle className="w-3.5 h-3.5" />
      Needs Attention
    </span>
  );
}

export default function VenueDiscoveryWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
  onCreateSuggestedActivity,
}: VenueDiscoveryWorkspacePanelProps) {
  const [venueForm, setVenueForm] = useState<VenueDiscoveryConversation>(() =>
    defaultVenueState(initialArea),
  );
  const [lastSavedAtLabel, setLastSavedAtLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createDrawerVenueName, setCreateDrawerVenueName] = useState("");
  const [drawerVenueType, setDrawerVenueType] = useState<VenueType>("BANQUET_HALL");
  const [drawerCity, setDrawerCity] = useState("");
  const [drawerAddress, setDrawerAddress] = useState("");
  const [creatingVenue, setCreatingVenue] = useState(false);

  const handleOpenCreateDrawer = (searchName: string) => {
    setCreateDrawerVenueName(searchName);
    setDrawerVenueType("BANQUET_HALL");
    setDrawerCity("");
    setDrawerAddress("");
    setCreateDrawerOpen(true);
  };

  const handleSaveDrawerVenue = async () => {
    if (!createDrawerVenueName.trim()) return;
    if (!drawerCity.trim()) {
      alert("City / Locality is required.");
      return;
    }

    setCreatingVenue(true);
    try {
      const res = await fetch("/api/cat/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName: createDrawerVenueName.trim(),
          venueType: drawerVenueType,
          city: drawerCity.trim(),
          address: drawerAddress.trim() || undefined,
          status: "DRAFT",
          creationSource: "INQUIRY_DISCOVERY",
          createdFromModule: "INQUIRY",
          createdFromRecordId: inquiryId,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success || !json?.venue?.id) {
        alert(json?.error || "Failed to create new venue master.");
        return;
      }

      const createdVenue = json.venue;

      setVenueForm((prev) => ({
        ...prev,
        selectionMode: "EXISTING",
        venueId: createdVenue.id,
        existingVenueId: createdVenue.id,
        existingVenueName: createdVenue.venueName || createDrawerVenueName,
        venueType: (createdVenue.venueType as VenueType) || drawerVenueType,
      }));

      if (json?.isDuplicate) {
        setSuccessMessage(
          "An existing venue matched your entry and has been selected."
        );
      } else {
        setSuccessMessage(
          `Venue '${createdVenue.venueName || createDrawerVenueName}' created as DRAFT and selected.`
        );
      }
      setCreateDrawerOpen(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Error creating venue in drawer:", err);
      alert("Unexpected error creating venue.");
    } finally {
      setCreatingVenue(false);
    }
  };

  useEffect(() => {
    setVenueForm(defaultVenueState(initialArea));
  }, [initialArea]);

  const validationResult = useMemo(
    () =>
      computeVenueValidation({
        selectionMode: venueForm.selectionMode,
        existingVenueName: venueForm.existingVenueName,
        proposedVenueName: venueForm.proposedVenueName,
        proposedLocationText: venueForm.proposedLocationText,
        venueFinalizationStatus: venueForm.venueFinalizationStatus,
      }),
    [
      venueForm.selectionMode,
      venueForm.existingVenueName,
      venueForm.proposedVenueName,
      venueForm.proposedLocationText,
      venueForm.venueFinalizationStatus,
    ],
  );

  useEffect(() => {
    if (!venueForm.isSummaryManuallyEdited) {
      setVenueForm((prev) => ({
        ...prev,
        businessSummary: generateVenueBusinessSummary(prev),
      }));
    }
  }, [
    venueForm.selectionMode,
    venueForm.existingVenueName,
    venueForm.proposedVenueName,
    venueForm.venueType,
    venueForm.proposedLocationText,
    venueForm.venueFinalizationStatus,
    venueForm.knowledge,
    venueForm.additionalNotes,
    venueForm.isSummaryManuallyEdited,
  ]);

  const setKnowledge = (
    key: keyof VenueDiscoveryConversation["knowledge"],
    value: KnowledgeFlagValue,
  ) => {
    setVenueForm((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);

    const finalLifecycle =
      venueForm.discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS";
    const finalSummary =
      venueForm.businessSummary.trim() ||
      generateVenueBusinessSummary(venueForm);

    const payload: VenueDiscoveryConversation = {
      ...venueForm,
      businessSummary: finalSummary,
      validationStatus: validationResult.status,
    };

    try {
      const res = await fetch(`/api/cat/inquiries/${inquiryId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: "VENUE",
          lifecycle: finalLifecycle,
          validation: validationResult.status,
          summary: finalSummary,
          venueDiscovery: payload,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (res.ok && json?.success) {
        if (json?.createdNewVenue && json?.createdVenueName) {
          setSuccessMessage(
            `Venue '${json.createdVenueName}' has been added to your Venue Directory and is now available for future inquiries.`
          );
        } else {
          setSuccessMessage("Discovery saved");
        }
        setLastSavedAtLabel(new Date().toLocaleTimeString());
        await Promise.resolve(onSaveSuccess(json?.overview));
        setTimeout(() => setSuccessMessage(null), 6000);
      } else {
        alert(
          `Failed to save venue discovery: ${json?.error || "Server error"}`,
        );
      }
    } catch (err) {
      console.error("Error saving venue discovery:", err);
      alert("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearExistingVenue = () => {
    setVenueForm((prev) => ({
      ...prev,
      existingVenueId: undefined,
      existingVenueName: "",
    }));
  };

  const suggestedActivities = useMemo(() => {
    const suggestions: Array<{ title: string; detail: string; priority: ActivityPriority }> = [];

    if (
      venueForm.venueFinalizationStatus === "SEARCHING" ||
      venueForm.venueFinalizationStatus === "UNDECIDED"
    ) {
      suggestions.push({
        title: "Schedule Venue Shortlist Review",
        detail: "Review top venue options with customer and close the decision.",
        priority: "MEDIUM",
      });
    }

    if (venueForm.knowledge.siteVisitRequired === "YES") {
      suggestions.push({
        title: "Schedule Site Visit",
        detail: "Plan an on-site walkthrough to confirm venue suitability.",
        priority: "HIGH",
      });
    }

    if (venueForm.knowledge.loadingRestrictions === "YES") {
      suggestions.push({
        title: "Clarify Loading Access",
        detail: "Capture loading window and access constraints with venue contact.",
        priority: "MEDIUM",
      });
    }

    if (venueForm.knowledge.parkingConstraints === "YES") {
      suggestions.push({
        title: "Discuss Parking Constraints",
        detail: "Confirm customer parking limitations and mitigation approach.",
        priority: "MEDIUM",
      });
    }

    return suggestions;
  }, [
    venueForm.venueFinalizationStatus,
    venueForm.knowledge.siteVisitRequired,
    venueForm.knowledge.loadingRestrictions,
    venueForm.knowledge.parkingConstraints,
  ]);

  const isDiscoveryReady =
    venueForm.discussionStatus === "COMPLETE" && validationResult.status === "READY";

  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (venueForm.existingVenueName || venueForm.proposedVenueName) completed++;
    if (venueForm.venueFinalizationStatus) completed++;
    if (Object.keys(venueForm.knowledge || {}).length > 0) completed++;
    if (venueForm.additionalNotes?.trim()) completed++;
    const percentage = Math.round((completed / 4) * 100);
    return { completed, total: 4, percentage };
  }, [
    venueForm.existingVenueName,
    venueForm.proposedVenueName,
    venueForm.venueFinalizationStatus,
    venueForm.knowledge,
    venueForm.additionalNotes,
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <button
          onClick={onBackToRequirements}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery Hub</span>
        </button>

        <div className="flex items-center gap-3">
          {validationBadge(validationResult.status)}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Discovery"}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-700 font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-700/85">
            Last saved {lastSavedAtLabel || "just now"}
          </span>
        </div>
      )}

      {validationResult.status === "NEEDS_ATTENTION" && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs">
          <div className="font-black text-amber-700 uppercase tracking-wide">
            Validation
          </div>
          <div className="font-bold text-amber-800 mt-0.5">Needs Attention</div>
          {validationResult.reasons.length > 0 && (
            <div className="mt-1.5 text-amber-800">
              <div className="font-semibold">Missing:</div>
              <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                {validationResult.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Guided Workspace
              </span>
              <span className="text-xs font-bold text-muted-foreground">Area: Venue</span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span>Venue Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Capture venue selection status, known constraints, and discovery notes.
            </p>
          </div>

          <div className="bg-muted/30 p-1.5 rounded-2xl border border-border/40 shrink-0">
            <div className="text-[10px] font-bold text-muted-foreground px-2 pb-1 uppercase tracking-wider">
              Discussion Status
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setVenueForm((prev) => ({
                    ...prev,
                    discussionStatus: "CONTINUE_LATER",
                  }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  venueForm.discussionStatus === "CONTINUE_LATER"
                    ? "bg-card text-amber-700 border border-amber-500/30 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() =>
                  setVenueForm((prev) => ({
                    ...prev,
                    discussionStatus: "COMPLETE",
                  }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  venueForm.discussionStatus === "COMPLETE"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Discussion Complete
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Venue Discovery Progress
              </span>
              {isDiscoveryReady && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                  <Check className="w-3 h-3 stroke-3" /> Discovery Ready
                </span>
              )}
            </div>
            <span className="text-xs font-black text-primary">
              {conversationProgress.completed} of {conversationProgress.total} Cards Completed ({conversationProgress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden border border-border/30 shadow-inner">
            <div
              className="bg-linear-to-r from-primary via-primary/90 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${conversationProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl border border-border/40 space-y-8">
        <div className="space-y-3 border-b border-border/30 pb-6">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>1. Where is the event?</span>
          </h3>

          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-foreground">
              Venue Selection
            </label>
            <VenueLookup
              value={
                venueForm.existingVenueName || venueForm.existingVenueId
                  ? {
                      id: venueForm.existingVenueId || venueForm.venueId || "",
                      name: venueForm.existingVenueName || "",
                      venueType: venueForm.venueType,
                      city: venueForm.proposedLocationText,
                    }
                  : null
              }
              onChange={(item) => {
                if (!item) {
                  handleClearExistingVenue();
                  return;
                }
                setVenueForm((prev) => ({
                  ...prev,
                  selectionMode: "EXISTING",
                  venueId: item.id,
                  existingVenueId: item.id,
                  existingVenueName: item.name,
                  venueType: (item.venueType as VenueType | undefined) || prev.venueType,
                }));
              }}
              placeholder="Search existing venues by name, city, contact..."
              allowQuickCreate
              onRequestCreate={handleOpenCreateDrawer}
            />

            {createDrawerOpen && (
              <div className="mt-3 bg-muted/20 p-5 rounded-2xl border border-primary/30 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="border-b border-border/40 pb-2.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Create Venue: <span className="text-primary font-black">{createDrawerVenueName}</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Master record will be created in DRAFT status and automatically selected.
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    DRAFT MASTER
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">Venue Type *</label>
                    <select
                      value={drawerVenueType}
                      onChange={(e) => setDrawerVenueType(e.target.value as VenueType)}
                      className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {VENUE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">City / Locality *</label>
                    <input
                      type="text"
                      value={drawerCity}
                      onChange={(e) => setDrawerCity(e.target.value)}
                      placeholder="e.g. Bandra West, Mumbai"
                      className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">Address (Optional)</label>
                    <input
                      type="text"
                      value={drawerAddress}
                      onChange={(e) => setDrawerAddress(e.target.value)}
                      placeholder="e.g. Hill Road, Near Station"
                      className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setCreateDrawerOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted/40 rounded-xl border border-border/40 transition cursor-pointer"
                    disabled={creatingVenue}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDrawerVenue}
                    className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                    disabled={creatingVenue || !drawerCity.trim()}
                  >
                    {creatingVenue ? "Creating..." : "Create & Select Venue"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 border-b border-border/30 pb-6">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>2. Has the venue been finalized?</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-muted/20 p-1 rounded-xl border border-border/30">
            {VENUE_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setVenueForm((prev) => ({
                    ...prev,
                    venueFinalizationStatus: option.value,
                  }))
                }
                className={`px-3 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                  venueForm.venueFinalizationStatus === option.value
                    ? option.value === "CONFIRMED"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : option.value === "SHORTLISTED"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : option.value === "SEARCHING"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-slate-600 text-white border-slate-600 shadow-sm"
                    : option.value === "CONFIRMED"
                      ? "bg-background text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      : option.value === "SHORTLISTED"
                        ? "bg-background text-blue-700 border-blue-300 hover:bg-blue-50"
                        : option.value === "SEARCHING"
                          ? "bg-background text-amber-700 border-amber-300 hover:bg-amber-50"
                          : "bg-background text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-b border-border/30 pb-6">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>3. What do we know about the venue?</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KNOWLEDGE_PROMPTS.map((prompt) => (
              <div
                key={prompt.key}
                className="bg-muted/20 p-3 rounded-xl border border-border/30 space-y-2"
              >
                <div className="text-xs font-bold text-foreground">
                  {prompt.label}
                </div>
                <div className="flex gap-1.5">
                  {(["YES", "NO", "UNKNOWN"] as KnowledgeFlagValue[]).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setKnowledge(prompt.key, value)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                          venueForm.knowledge[prompt.key] === value
                            ? value === "YES"
                              ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40"
                              : value === "NO"
                                ? "bg-rose-500/15 text-rose-700 border-rose-500/40"
                                : "bg-slate-500/15 text-slate-700 border-slate-500/40"
                            : "bg-card text-muted-foreground border-border/40"
                        }`}
                      >
                        {value}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-b border-border/30 pb-6">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>4. Anything else we should know?</span>
          </h3>
          <textarea
            rows={4}
            value={venueForm.additionalNotes || ""}
            onChange={(e) =>
              setVenueForm((prev) => ({
                ...prev,
                additionalNotes: e.target.value,
              }))
            }
            placeholder="Capture additional discovery notes"
            className="w-full text-xs bg-background border border-border/60 rounded-xl p-3"
          />
        </div>

        <div className="space-y-3 border-b border-border/30 pb-6">
          <div className="bg-muted/40 p-4 border border-border/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                Insight Assistant
              </h3>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Venue Discovery
            </span>
          </div>

          <h3 className="text-sm font-black text-foreground">Discovery Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-muted/20 px-3 py-2 rounded-xl border border-border/30">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                Lifecycle
              </div>
              <div className="font-extrabold text-foreground mt-0.5 text-[11px]">
                {venueForm.discussionStatus === "COMPLETE"
                  ? "COMPLETED"
                  : "IN_PROGRESS"}
              </div>
            </div>
            <div className="bg-muted/20 px-3 py-2 rounded-xl border border-border/30">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                Validation
              </div>
              <div className="font-extrabold text-foreground mt-0.5 text-[11px]">
                {validationResult.status}
              </div>
            </div>
            <div className="bg-muted/20 px-3 py-2 rounded-xl border border-border/30">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                Last Updated
              </div>
              <div className="font-extrabold text-foreground mt-0.5 text-[11px]">
                {initialArea?.updatedAt
                  ? new Date(initialArea.updatedAt).toLocaleString()
                  : "Not yet saved"}
              </div>
            </div>
            <div className="bg-muted/20 px-3 py-2 rounded-xl border border-border/30">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                Discussion
              </div>
              <div className="font-extrabold text-foreground mt-0.5 text-[11px]">
                {venueForm.discussionStatus}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Structured Business Summary
            </label>
            <textarea
              rows={3}
              value={venueForm.businessSummary}
              onChange={(e) =>
                setVenueForm((prev) => ({
                  ...prev,
                  businessSummary: e.target.value,
                  isSummaryManuallyEdited: true,
                }))
              }
              placeholder="Auto-generated summary appears here"
              className="w-full text-xs bg-background border border-border/60 rounded-xl p-3"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setVenueForm((prev) => ({
                    ...prev,
                    isSummaryManuallyEdited: false,
                    businessSummary: generateVenueBusinessSummary(prev),
                  }))
                }
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted"
              >
                <span className="inline-flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Reset Auto Summary
                </span>
              </button>
              <span className="text-[11px] text-muted-foreground">
                {venueForm.isSummaryManuallyEdited
                  ? "Manual summary is authoritative."
                  : "Summary auto-generates from discovery inputs."}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-b border-border/30 pb-6">
          <h3 className="text-sm font-black text-foreground">Suggested Next Activities</h3>
          <div className="space-y-2">
            {suggestedActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No follow-up recommendations yet.
              </p>
            ) : (
              suggestedActivities.map((item, idx) => (
                <div
                  key={idx}
                  className="text-xs font-medium text-foreground bg-muted/20 border border-border/30 rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div className="leading-relaxed space-y-1">
                    <span
                      className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        item.priority === "HIGH"
                          ? "bg-rose-500/15 text-rose-800 border-rose-500/30"
                          : item.priority === "MEDIUM"
                          ? "bg-amber-500/15 text-amber-800 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-800 border-emerald-500/30"
                      }`}
                    >
                      {item.priority === "HIGH"
                        ? "🔴 Urgent"
                        : item.priority === "MEDIUM"
                        ? "🟠 Important"
                        : "🟢 Recommendation"}
                    </span>
                    <div className="font-bold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{item.detail}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-primary/35 bg-primary/10 text-primary hover:bg-primary/15"
                    onClick={() =>
                      onCreateSuggestedActivity({
                        title: item.title,
                        discoveryAreaKey: "VENUE",
                        priority: item.priority,
                        dueDate: "",
                        assignedTo: "",
                      })
                    }
                  >
                    Create Activity
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-black text-foreground">Discussion Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-muted/20 p-1 rounded-xl border border-border/30">
            <button
              type="button"
              onClick={() =>
                setVenueForm((prev) => ({
                  ...prev,
                  discussionStatus: "COMPLETE",
                }))
              }
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition text-center cursor-pointer ${
                venueForm.discussionStatus === "COMPLETE"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-background text-muted-foreground border-border/40 hover:bg-muted/40"
              }`}
            >
              Discussion Complete
            </button>
            <button
              type="button"
              onClick={() =>
                setVenueForm((prev) => ({
                  ...prev,
                  discussionStatus: "CONTINUE_LATER",
                }))
              }
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition text-center cursor-pointer ${
                venueForm.discussionStatus === "CONTINUE_LATER"
                  ? "bg-amber-500/15 text-amber-700 border-amber-500/40 shadow-sm"
                  : "bg-background text-muted-foreground border-border/40 hover:bg-muted/40"
              }`}
            >
              Continue Later
            </button>
          </div>

          {validationResult.reasons.length > 0 && (
            <div className="bg-muted/20 border border-border/30 rounded-xl p-3">
              <div className="text-[11px] font-black uppercase text-muted-foreground mb-1">
                Validation Notes
              </div>
              <ul className="text-xs text-foreground list-disc pl-5 space-y-0.5">
                {validationResult.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onBackToRequirements}
            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Saving Discovery...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Discovery</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


