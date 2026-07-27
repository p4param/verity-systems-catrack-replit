"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Check,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  DiscoveryArea,
  InquiryDiscoveryOverview,
  BusinessValidationStatus,
  computeEventBasicsValidation,
  DiscussionStatus,
} from "@/modules/cat/inquiry/domain/discovery-types";
import OccasionLookup from "@/modules/cat/occasion-types/components/OccasionLookup";
import { CatOccasionType } from "@/modules/cat/occasion-types/types";

interface EventBasicsWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  initialInquiryDate?: string;
  initialInquiryTitle?: string;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const TONE_PRESETS = [
  "Formal Elegant",
  "Traditional Festive",
  "Casual Garden",
  "Modern Minimalist",
];

export default function EventBasicsWorkspacePanel({
  inquiryId,
  initialArea,
  initialInquiryDate,
  initialInquiryTitle,
  onBackToRequirements,
  onSaveSuccess,
}: EventBasicsWorkspacePanelProps) {
  const savedEb = initialArea?.eventBasics;

  const [occasionTypes, setOccasionTypes] = useState<CatOccasionType[]>([]);
  const [loadingOccasions, setLoadingOccasions] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/cat/occasion-types?activeOnly=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.success && Array.isArray(data.items)) {
          setOccasionTypes(data.items);
        }
      })
      .catch((err) => console.error("Error loading occasion types:", err))
      .finally(() => {
        if (active) setLoadingOccasions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const quickSelectChips = useMemo(() => {
    return occasionTypes
      .filter((o) => o.showInDiscoveryQuickSelect)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [occasionTypes]);

  // Form State initialized from persisted eventBasics (if available) or defaults
  const [occasion, setOccasion] = useState(
    savedEb?.occasion || initialInquiryTitle || "Wedding Reception",
  );
  const [toneStyle, setToneStyle] = useState(
    savedEb?.toneStyle || "Formal Elegant",
  );
  const [tentativeDate, setTentativeDate] = useState(
    savedEb?.tentativeDate
      ? savedEb.tentativeDate
      : initialInquiryDate
        ? new Date(initialInquiryDate).toISOString().split("T")[0]
        : "",
  );
  const [dateConfidence, setDateConfidence] = useState<
    "TENTATIVE" | "CONFIRMED"
  >(savedEb?.dateConfidence || "TENTATIVE");
  const [approximateGuestCount, setApproximateGuestCount] = useState<
    number | ""
  >(savedEb?.approximateGuestCount ?? 250);
  const [importantNotes, setImportantNotes] = useState(
    savedEb?.importantNotes || "",
  );

  // Summary State
  const [businessSummary, setBusinessSummary] = useState(
    savedEb?.businessSummary || initialArea?.summary || "",
  );
  const [isSummaryManuallyEdited, setIsSummaryManuallyEdited] = useState(
    savedEb?.isSummaryManuallyEdited ?? (initialArea?.summary ? true : false),
  );

  // Discussion Status State (COMPLETE vs CONTINUE_LATER)
  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedEb?.discussionStatus ||
      (initialArea?.lifecycle === "COMPLETED" ? "COMPLETE" : "CONTINUE_LATER"),
  );

  // Save State
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Re-sync form state whenever initialArea updates (e.g. after refresh)
  useEffect(() => {
    if (initialArea?.eventBasics) {
      const eb = initialArea.eventBasics;
      if (eb.occasion) setOccasion(eb.occasion);
      if (eb.toneStyle) setToneStyle(eb.toneStyle);
      if (eb.tentativeDate) setTentativeDate(eb.tentativeDate);
      if (eb.dateConfidence) setDateConfidence(eb.dateConfidence);
      if (eb.approximateGuestCount !== undefined)
        setApproximateGuestCount(eb.approximateGuestCount);
      if (eb.importantNotes !== undefined) setImportantNotes(eb.importantNotes);
      if (eb.businessSummary) setBusinessSummary(eb.businessSummary);
      if (eb.isSummaryManuallyEdited !== undefined)
        setIsSummaryManuallyEdited(eb.isSummaryManuallyEdited);
      if (eb.discussionStatus) setDiscussionStatus(eb.discussionStatus);
    }
  }, [initialArea]);

  // System-Computed Validation Status
  const parsedGuestCount =
    typeof approximateGuestCount === "number" ? approximateGuestCount : 0;
  const computedValidation: BusinessValidationStatus =
    computeEventBasicsValidation(occasion, tentativeDate, parsedGuestCount);

  const isDiscoveryReady =
    discussionStatus === "COMPLETE" && computedValidation === "READY";

  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (occasion) completed++;
    if (tentativeDate) completed++;
    if (parsedGuestCount > 0) completed++;
    if (importantNotes.trim()) completed++;
    const percentage = Math.round((completed / 4) * 100);
    return { completed, total: 4, percentage };
  }, [occasion, tentativeDate, parsedGuestCount, importantNotes]);

  const suggestedActivities = useMemo(() => {
    const items: Array<{ priority: "URGENT" | "IMPORTANT" | "RECOMMENDATION"; text: string }> = [];

    if (!tentativeDate) {
      items.push({
        priority: "URGENT",
        text: "Capture a tentative event date to improve planning confidence for downstream discovery.",
      });
    }

    if (dateConfidence === "TENTATIVE") {
      items.push({
        priority: "IMPORTANT",
        text: "Reconfirm date confidence with the host before final handover.",
      });
    }

    if (parsedGuestCount > 0 && parsedGuestCount < 100) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Validate whether the guest count is likely to expand before quotation readiness.",
      });
    }

    if (discussionStatus === "COMPLETE" && computedValidation === "READY") {
      items.push({
        priority: "RECOMMENDATION",
        text: "Event Basics discovery is ready for the next workspace handover.",
      });
    }

    if (items.length === 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Continue capturing core event facts only; avoid execution-level planning at this stage.",
      });
    }

    return items;
  }, [tentativeDate, dateConfidence, parsedGuestCount, discussionStatus, computedValidation]);

  // Helper to generate dynamic summary
  const generateAutoSummary = () => {
    const parts: string[] = [];
    if (occasion) parts.push(`${occasion}`);
    if (parsedGuestCount > 0)
      parts.push(`for approx. ${parsedGuestCount} guests`);
    if (tentativeDate) {
      const formattedDate = new Date(tentativeDate).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      );
      parts.push(
        `on ${formattedDate} (${dateConfidence === "CONFIRMED" ? "Date Confirmed" : "Tentative Date"})`,
      );
    }
    if (toneStyle) parts.push(`[Style: ${toneStyle}]`);
    if (importantNotes.trim()) parts.push(`Note: ${importantNotes.trim()}`);

    return parts.length > 0
      ? parts.join(" ")
      : "Event Basics discovery conversation initiated.";
  };

  // Auto-generate summary when fields change IF not manually edited
  useEffect(() => {
    if (!isSummaryManuallyEdited) {
      setBusinessSummary(generateAutoSummary());
    }
  }, [
    occasion,
    toneStyle,
    tentativeDate,
    dateConfidence,
    approximateGuestCount,
    importantNotes,
    isSummaryManuallyEdited,
  ]);

  const handleSaveDiscovery = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      const finalLifecycle =
        discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS";
      const finalSummary = businessSummary.trim() || generateAutoSummary();

      const eventBasicsPayload = {
        occasion,
        toneStyle,
        tentativeDate,
        dateConfidence,
        approximateGuestCount: parsedGuestCount,
        importantNotes,
        businessSummary: finalSummary,
        isSummaryManuallyEdited,
        discussionStatus,
        validationStatus: computedValidation,
      };

      const res = await fetch(`/api/cat/inquiries/${inquiryId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: "EVENT_BASICS",
          lifecycle: finalLifecycle,
          validation: computedValidation,
          summary: finalSummary,
          eventBasics: eventBasicsPayload,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};

      if (res.ok && json?.success) {
        setSuccessMessage(
          "Event Basics Discovery saved successfully! Quotation Readiness updated.",
        );
        await Promise.resolve(onSaveSuccess(json?.overview));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        let errorMsg = "Server error";
        try {
          const errJson =
            json && Object.keys(json).length > 0 ? json : await res.json();
          errorMsg = errJson?.error || errorMsg;
        } catch (_) {}
        alert(`Failed to save discovery: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error saving event basics discovery:", err);
      alert("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header & Navigation Back */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <button
          onClick={onBackToRequirements}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery Hub</span>
        </button>

        <div className="flex items-center gap-3">
          {computedValidation === "READY" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 rounded-full border border-emerald-500/30 font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Discovery Ready
            </span>
          )}
          {computedValidation === "NEEDS_ATTENTION" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 text-amber-600 rounded-full border border-amber-500/30 font-extrabold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Needs Attention
            </span>
          )}
          {computedValidation === "BLOCKED" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/15 text-rose-600 rounded-full border border-rose-500/30 font-extrabold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Business Blocked
            </span>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDiscovery}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Discovery"}</span>
          </button>
        </div>
      </div>

      {/* Lightweight In-Place Success Banner */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs text-emerald-700 font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-normal">
            Editing in-place
          </span>
        </div>
      )}

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Guided Workspace
              </span>
              <span className="text-xs font-bold text-muted-foreground">Area: Event Basics</span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Event Basics Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Capture essential event facts required to establish discovery readiness.
            </p>
          </div>

          <div className="bg-muted/30 p-1.5 rounded-2xl border border-border/40 shrink-0">
            <div className="text-[10px] font-bold text-muted-foreground px-2 pb-1 uppercase tracking-wider">
              Discussion Status
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDiscussionStatus("CONTINUE_LATER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  discussionStatus === "CONTINUE_LATER"
                    ? "bg-card text-amber-700 border border-amber-500/30 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => setDiscussionStatus("COMPLETE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  discussionStatus === "COMPLETE"
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
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px] uppercase tracking-wider">
                Event Basics Discovery Progress
              </span>
              {isDiscoveryReady && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                  Discovery Ready
                </span>
              )}
            </div>
            <span className="text-primary font-black text-xs">
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

      {/* ========================================================================= */}
      {/* 2. CONTINUOUS GUIDED CONVERSATION WORKSPACE (ALL 4 SECTIONS VISIBLE)       */}
      {/* ========================================================================= */}
      <div className="bg-card p-6 rounded-2xl border border-border/40 space-y-8">
        {/* QUESTION 1: What event are we planning? */}
        <div className="space-y-3 border-b border-border/30 pb-6">
          <div>
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>What event are we planning?</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              Establishes the core occasion and celebration style to guide menu
              and decor options.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Event Occasion *
              </label>
              <OccasionLookup
                value={occasion || null}
                onChange={(item) => {
                  setOccasion(item?.name || "");
                }}
                placeholder="Search event occasions (e.g. Wedding Reception, Corporate Gala)..."
                allowQuickCreate
                onRequestCreate={async (searchName) => {
                  try {
                    const res = await fetch("/api/cat/occasion-types", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: searchName,
                        isActive: true,
                        showInDiscoveryQuickSelect: false,
                      }),
                    });
                    const json = res.ok ? await res.json().catch(() => ({})) : {};
                    if (json?.success && json?.id) {
                      setOccasion(searchName);
                      if (json.isDuplicate) {
                        setSuccessMessage(
                          "An existing event occasion matched your entry and has been selected."
                        );
                      } else {
                        setSuccessMessage(
                          `Event Occasion '${searchName}' created and selected.`
                        );
                      }
                      setTimeout(() => setSuccessMessage(null), 5000);
                      // Refetch occasion types for chips
                      fetch("/api/cat/occasion-types?activeOnly=true")
                        .then((r) => (r.ok ? r.json() : null))
                        .then((d) => {
                          if (d?.success && Array.isArray(d.items)) {
                            setOccasionTypes(d.items);
                          }
                        });
                    }
                  } catch (err) {
                    console.error("Error creating event occasion:", err);
                  }
                }}
              />

              {quickSelectChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickSelectChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setOccasion(chip.name)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        occasion === chip.name
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                      }`}
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Tone / Style (Optional)
              </label>
              <input
                type="text"
                value={toneStyle}
                onChange={(e) => setToneStyle(e.target.value)}
                placeholder="e.g. Formal Elegant, Traditional Festive"
                className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 focus:ring-2 focus:ring-primary/40 font-medium"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {TONE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setToneStyle(preset)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      toneStyle === preset
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QUESTION 2: When is the event planned? */}
        <div className="space-y-3 border-b border-border/30 pb-6">
          <div>
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>When is the event planned?</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              Determines date availability, seasonal pricing, and kitchen
              capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Tentative Event Date *
              </label>
              <input
                type="date"
                value={tentativeDate}
                onChange={(e) => setTentativeDate(e.target.value)}
                className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 focus:ring-2 focus:ring-primary/40 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Date Confidence
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDateConfidence("TENTATIVE")}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition text-center cursor-pointer ${
                    dateConfidence === "TENTATIVE"
                      ? "bg-amber-500/15 text-amber-700 border-amber-500/40"
                      : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                  }`}
                >
                  Tentative Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateConfidence("CONFIRMED")}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition text-center cursor-pointer ${
                    dateConfidence === "CONFIRMED"
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40"
                      : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                  }`}
                >
                  Confirmed Date
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QUESTION 3: Approximately how many guests? */}
        <div className="space-y-3 border-b border-border/30 pb-6">
          <div>
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Approximately how many guests?</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              Sets high-level scale for headcount planning, portioning, and
              service staffing.
            </p>
          </div>

          <div className="max-w-md space-y-1.5 pt-1">
            <label className="text-xs font-bold text-foreground">
              Approximate Guest Count *
            </label>
            <div className="relative">
              <input
                type="number"
                value={approximateGuestCount}
                onChange={(e) =>
                  setApproximateGuestCount(
                    e.target.value ? parseInt(e.target.value) : "",
                  )
                }
                placeholder="e.g. 250"
                className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 pl-9 focus:ring-2 focus:ring-primary/40 font-bold"
              />
              <Users className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            </div>
            <div className="flex gap-2 pt-1">
              {[50, 100, 250, 350, 500].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setApproximateGuestCount(num)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                    approximateGuestCount === num
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                  }`}
                >
                  {num} Guests
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* QUESTION 4: Anything else we should know? */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Anything else we should know?</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              Captures host expectations, special requests, or critical
              constraints.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <textarea
              rows={3}
              value={importantNotes}
              onChange={(e) => setImportantNotes(e.target.value)}
              placeholder="Capture conversation notes (e.g. Client requested main stage placement near entrance, VIP seating area required)..."
              className="w-full text-xs bg-background border border-border/60 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 font-medium leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BUSINESS SUMMARY ENGINE & DISCUSSION STATUS                            */}
      {/* ========================================================================= */}
      <div className="bg-card p-5 rounded-2xl border border-border/40 space-y-4">
        <div className="bg-muted/40 p-4 border border-border/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Insight Assistant</h3>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Event Basics
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Structured Business Summary</span>
            </label>

            {isSummaryManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  setIsSummaryManuallyEdited(false);
                  setBusinessSummary(generateAutoSummary());
                }}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Auto-generated</span>
              </button>
            )}
          </div>

          <textarea
            rows={2}
            value={businessSummary}
            onChange={(e) => {
              setIsSummaryManuallyEdited(true);
              setBusinessSummary(e.target.value);
            }}
            placeholder="Concise operational summary..."
            className="w-full text-xs bg-background border border-border/60 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 font-medium leading-relaxed"
          />
          <span className="text-[10px] text-muted-foreground italic block">
            {isSummaryManuallyEdited
              ? "✓ Custom manual summary preserved."
              : "Auto-generated summary. You can edit this text anytime."}
          </span>
        </div>

        <div className="space-y-3 border-t border-border/30 pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Suggested Next Activities</span>
          </h3>

          <div className="space-y-2">
            {suggestedActivities.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-muted/20 border border-border/30 rounded-xl text-xs text-foreground flex items-start gap-2"
              >
                <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span
                    className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      item.priority === "URGENT"
                        ? "bg-rose-500/15 text-rose-800 border-rose-500/30"
                        : item.priority === "IMPORTANT"
                        ? "bg-amber-500/15 text-amber-800 border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-800 border-emerald-500/30"
                    }`}
                  >
                    {item.priority === "URGENT"
                      ? "🔴 Urgent"
                      : item.priority === "IMPORTANT"
                      ? "🟠 Important"
                      : "🟢 Recommendation"}
                  </span>
                  <span className="text-[11px] font-medium leading-relaxed block">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discussion Status Question */}
        <div className="bg-muted/20 p-4 rounded-xl border border-border/30 space-y-2">
          <label className="text-xs font-bold text-foreground block">Discussion Status</label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-muted/20 p-1 rounded-xl border border-border/30">
            <button
              type="button"
              onClick={() => setDiscussionStatus("COMPLETE")}
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition text-center cursor-pointer ${
                discussionStatus === "COMPLETE"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-background text-muted-foreground border-border/40 hover:bg-muted/40"
              }`}
            >
              Discussion Complete
            </button>

            <button
              type="button"
              onClick={() => setDiscussionStatus("CONTINUE_LATER")}
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition text-center cursor-pointer ${
                discussionStatus === "CONTINUE_LATER"
                  ? "bg-amber-500/15 text-amber-700 border-amber-500/40 shadow-sm"
                  : "bg-background text-muted-foreground border-border/40 hover:bg-muted/40"
              }`}
            >
              Continue Later
            </button>
          </div>
        </div>

        {/* Action Footer */}
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
            onClick={handleSaveDiscovery}
            className="px-5 py-2.5 text-xs font-extrabold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? "Saving Discovery..." : "Save Discovery"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


