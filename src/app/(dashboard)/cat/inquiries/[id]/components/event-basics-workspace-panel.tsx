"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Users,
  MessageSquareText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  RotateCcw,
  ShieldCheck,
  Building2,
} from "lucide-react";
import {
  DiscoveryArea,
  InquiryDiscoveryOverview,
  BusinessValidationStatus,
  computeEventBasicsValidation,
  DiscussionStatus,
} from "@/modules/cat/inquiry/domain/discovery-types";

interface EventBasicsWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  initialInquiryDate?: string;
  initialInquiryTitle?: string;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const OCCASION_PRESETS = [
  "Wedding Reception",
  "Corporate Gala",
  "Birthday Party",
  "Anniversary",
  "Social Gathering",
  "Cultural Celebration",
];

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

  // Form State initialized from persisted eventBasics (if available) or defaults
  const [occasion, setOccasion] = useState(
    savedEb?.occasion || initialInquiryTitle || "Wedding Reception"
  );
  const [toneStyle, setToneStyle] = useState(savedEb?.toneStyle || "Formal Elegant");
  const [tentativeDate, setTentativeDate] = useState(
    savedEb?.tentativeDate
      ? savedEb.tentativeDate
      : initialInquiryDate
      ? new Date(initialInquiryDate).toISOString().split("T")[0]
      : ""
  );
  const [dateConfidence, setDateConfidence] = useState<"TENTATIVE" | "CONFIRMED">(
    savedEb?.dateConfidence || "TENTATIVE"
  );
  const [approximateGuestCount, setApproximateGuestCount] = useState<number | "">(
    savedEb?.approximateGuestCount ?? 250
  );
  const [importantNotes, setImportantNotes] = useState(savedEb?.importantNotes || "");

  // Summary State
  const [businessSummary, setBusinessSummary] = useState(
    savedEb?.businessSummary || initialArea?.summary || ""
  );
  const [isSummaryManuallyEdited, setIsSummaryManuallyEdited] = useState(
    savedEb?.isSummaryManuallyEdited ?? (initialArea?.summary ? true : false)
  );

  // Discussion Status State (COMPLETE vs CONTINUE_LATER)
  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedEb?.discussionStatus || (initialArea?.lifecycle === "COMPLETED" ? "COMPLETE" : "CONTINUE_LATER")
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
      if (eb.approximateGuestCount !== undefined) setApproximateGuestCount(eb.approximateGuestCount);
      if (eb.importantNotes !== undefined) setImportantNotes(eb.importantNotes);
      if (eb.businessSummary) setBusinessSummary(eb.businessSummary);
      if (eb.isSummaryManuallyEdited !== undefined) setIsSummaryManuallyEdited(eb.isSummaryManuallyEdited);
      if (eb.discussionStatus) setDiscussionStatus(eb.discussionStatus);
    }
  }, [initialArea]);

  // System-Computed Validation Status
  const parsedGuestCount = typeof approximateGuestCount === "number" ? approximateGuestCount : 0;
  const computedValidation: BusinessValidationStatus = computeEventBasicsValidation(
    occasion,
    tentativeDate,
    parsedGuestCount
  );

  // Helper to generate dynamic summary
  const generateAutoSummary = () => {
    const parts: string[] = [];
    if (occasion) parts.push(`${occasion}`);
    if (parsedGuestCount > 0) parts.push(`for approx. ${parsedGuestCount} guests`);
    if (tentativeDate) {
      const formattedDate = new Date(tentativeDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      parts.push(`on ${formattedDate} (${dateConfidence === "CONFIRMED" ? "Date Confirmed" : "Tentative Date"})`);
    }
    if (toneStyle) parts.push(`[Style: ${toneStyle}]`);
    if (importantNotes.trim()) parts.push(`Note: ${importantNotes.trim()}`);

    return parts.length > 0 ? parts.join(" ") : "Event Basics discovery conversation initiated.";
  };

  // Auto-generate summary when fields change IF not manually edited
  useEffect(() => {
    if (!isSummaryManuallyEdited) {
      setBusinessSummary(generateAutoSummary());
    }
  }, [occasion, toneStyle, tentativeDate, dateConfidence, approximateGuestCount, importantNotes, isSummaryManuallyEdited]);

  const handleSaveDiscovery = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      const finalLifecycle = discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS";
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
        setSuccessMessage("Event Basics Discovery saved successfully! Quotation Readiness updated.");
        await Promise.resolve(onSaveSuccess(json?.overview));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        let errorMsg = "Server error";
        try {
          const errJson = json && Object.keys(json).length > 0 ? json : await res.json();
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
    <div className="space-y-6">
      {/* 1. Header & Navigation Back */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <button
          onClick={onBackToRequirements}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>&larr; Back to Requirements</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-muted-foreground">System Validation:</span>
          {computedValidation === "READY" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 rounded-full border border-emerald-500/30 font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SYSTEM READY
            </span>
          )}
          {computedValidation === "NEEDS_ATTENTION" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 text-amber-600 rounded-full border border-amber-500/30 font-extrabold">
              <AlertTriangle className="w-3.5 h-3.5" />
              NEEDS ATTENTION
            </span>
          )}
          {computedValidation === "BLOCKED" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/15 text-rose-600 rounded-full border border-rose-500/30 font-extrabold">
              <AlertTriangle className="w-3.5 h-3.5" />
              BLOCKED
            </span>
          )}
        </div>
      </div>

      {/* Lightweight In-Place Success Banner */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs text-emerald-700 font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-normal">Editing in-place</span>
        </div>
      )}

      {/* Purpose Context Banner */}
      <div className="bg-card p-4 rounded-2xl border border-border/40 space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            Event Basics Discovery Workspace
          </h2>
        </div>
        <p className="text-xs text-muted-foreground pl-8">
          Captures essential event parameters (Occasion, Date, Headcount, High-level Notes) required to establish quotation readiness.
        </p>
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
              Establishes the core occasion and celebration style to guide menu and decor options.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Occasion / Event Type *</label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g. Wedding Reception, Corporate Gala"
                className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 focus:ring-2 focus:ring-primary/40 font-medium"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {OCCASION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOccasion(preset)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      occasion === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tone / Style (Optional)</label>
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
              Determines date availability, seasonal pricing, and kitchen capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tentative Event Date *</label>
              <input
                type="date"
                value={tentativeDate}
                onChange={(e) => setTentativeDate(e.target.value)}
                className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 focus:ring-2 focus:ring-primary/40 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Date Confidence</label>
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
              Sets high-level scale for headcount planning, portioning, and service staffing.
            </p>
          </div>

          <div className="max-w-md space-y-1.5 pt-1">
            <label className="text-xs font-bold text-foreground">Approximate Guest Count *</label>
            <div className="relative">
              <input
                type="number"
                value={approximateGuestCount}
                onChange={(e) => setApproximateGuestCount(e.target.value ? parseInt(e.target.value) : "")}
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
              Captures host expectations, special requests, or critical constraints.
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Editable Business Summary</span>
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

        {/* Discussion Status Question */}
        <div className="bg-muted/20 p-4 rounded-xl border border-border/30 space-y-2">
          <label className="text-xs font-bold text-foreground block">
            Is this discussion complete for now?
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-xs font-extrabold text-foreground cursor-pointer">
              <input
                type="radio"
                name="discussionStatus"
                checked={discussionStatus === "COMPLETE"}
                onChange={() => setDiscussionStatus("COMPLETE")}
                className="text-primary focus:ring-primary"
              />
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 rounded-lg border border-emerald-500/20">
                Yes, discussion is complete for now (Sets Lifecycle to COMPLETED)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-extrabold text-foreground cursor-pointer">
              <input
                type="radio"
                name="discussionStatus"
                checked={discussionStatus === "CONTINUE_LATER"}
                onChange={() => setDiscussionStatus("CONTINUE_LATER")}
                className="text-primary focus:ring-primary"
              />
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-lg border border-amber-500/20">
                No, we'll continue later (Sets Lifecycle to IN_PROGRESS)
              </span>
            </label>
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
