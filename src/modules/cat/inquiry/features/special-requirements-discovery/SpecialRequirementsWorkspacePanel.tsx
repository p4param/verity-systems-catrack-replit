"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  HeartHandshake,
  Lightbulb,
  Lock,
  MessageCircle,
  Quote,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  AccessibilityConsiderationTag,
  BusinessValidationStatus,
  CulturalReligiousConsiderationTag,
  DiscoveryArea,
  DiscussionStatus,
  HealthWellbeingConsiderationTag,
  InquiryDiscoveryOverview,
  SalesAssessmentConfidence,
  SecurityProtocolTag,
  SpecialRequirementsConversation,
  VenueGuidelineTag,
  computeSpecialRequirementsValidation,
} from "@/modules/cat/inquiry/domain/discovery-types";

interface SpecialRequirementsWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const ACCESSIBILITY_OPTIONS: { key: AccessibilityConsiderationTag; label: string }[] = [
  { key: "WHEELCHAIR_ACCESS", label: "Wheelchair Access" },
  { key: "ELDERLY_GUESTS", label: "Elderly Guests" },
  { key: "CHILDREN", label: "Children" },
  { key: "NURSING_MOTHERS", label: "Nursing Mothers" },
  { key: "ACCESSIBLE_SEATING", label: "Accessible Seating" },
  { key: "MOBILITY_ASSISTANCE", label: "Mobility Assistance" },
];

const HEALTH_WELLBEING_OPTIONS: { key: HealthWellbeingConsiderationTag; label: string }[] = [
  { key: "SEVERE_ALLERGIES_AWARENESS", label: "Severe Allergies (Event-Wide Awareness)" },
  { key: "EMERGENCY_MEDICAL_AWARENESS", label: "Emergency Medical Awareness" },
  { key: "MEDICATION_STORAGE_NEEDS", label: "Medication Storage Needs" },
  { key: "FIRST_AID_EXPECTATIONS", label: "First-Aid Expectations" },
  { key: "GUEST_SENSITIVITIES", label: "Guest Sensitivities" },
];

const CULTURAL_RELIGIOUS_OPTIONS: { key: CulturalReligiousConsiderationTag; label: string }[] = [
  { key: "RELIGIOUS_CUSTOMS", label: "Religious Customs" },
  { key: "CEREMONIAL_EXPECTATIONS", label: "Ceremonial Expectations" },
  { key: "PRAYER_REQUIREMENTS", label: "Prayer Requirements" },
  { key: "TRADITIONAL_PRACTICES", label: "Traditional Practices" },
  { key: "LANGUAGE_PREFERENCES", label: "Language Preferences" },
];

const SECURITY_PROTOCOL_OPTIONS: { key: SecurityProtocolTag; label: string }[] = [
  { key: "VIP_ATTENDANCE", label: "VIP Attendance" },
  { key: "RESTRICTED_ACCESS", label: "Restricted Access" },
  { key: "GUEST_PRIVACY", label: "Guest Privacy" },
  { key: "PHOTOGRAPHY_RESTRICTIONS", label: "Photography Restrictions" },
  { key: "MEDIA_PRESENCE", label: "Media Presence" },
];

const VENUE_GUIDELINE_OPTIONS: { key: VenueGuidelineTag; label: string }[] = [
  { key: "PERMITS_ALREADY_KNOWN", label: "Permits Already Known" },
  { key: "VENUE_COMPLIANCE_EXPECTATIONS", label: "Venue Guidelines Shared" },
  { key: "NOISE_RESTRICTIONS", label: "Noise Restrictions" },
  { key: "ENVIRONMENTAL_RULES", label: "Environmental Rules" },
  { key: "SUSTAINABILITY_REQUESTS", label: "Sustainability Requests" },
];

// Matches every other Discovery workspace's Internal Sales Assessment exactly —
// same three confidence tiers, labels, colors, and supporting rationale text.
const SALES_ASSESSMENT_OPTIONS: {
  key: SalesAssessmentConfidence;
  label: string;
  colorClass: string;
  desc: string;
}[] = [
  {
    key: "HIGH_CONFIDENCE",
    label: "High Confidence (High Win Probability)",
    colorClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-800",
    desc: "Client expectations & budget are strongly aligned; high likelihood to close.",
  },
  {
    key: "MEDIUM_CONFIDENCE",
    label: "Medium Confidence (Competitive Evaluation)",
    colorClass: "bg-amber-500/15 border-amber-500/30 text-amber-800",
    desc: "Client is actively evaluating caterers; strong proposal needed.",
  },
  {
    key: "EXPLORATORY_LOW_CONFIDENCE",
    label: "Exploratory / High Risk",
    colorClass: "bg-rose-500/15 border-rose-500/30 text-rose-800",
    desc: "Early research stage or budget mismatch; follow up carefully.",
  },
];

function labelFor<T extends string>(key: T, options: { key: T; label: string }[]): string {
  return options.find((item) => item.key === key)?.label || key;
}

function toggleArrayValue<T extends string>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((item) => item !== val) : [...arr, val];
}

// Shared selection-state treatments — identical convention to every other
// Discovery workspace, for a consistent premium feel across the product family.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card";

const CHIP_UNSELECTED =
  "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30";

const CHIP_SELECTED =
  "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20";

function chipClass(active: boolean): string {
  const base = "text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition-all duration-150 cursor-pointer inline-flex items-center gap-1";
  return `${base} ${active ? CHIP_SELECTED : CHIP_UNSELECTED} ${FOCUS_RING}`;
}

export default function SpecialRequirementsWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
}: SpecialRequirementsWorkspacePanelProps) {
  const savedSr = initialArea?.specialRequirements;

  const [accessibilityConsiderations, setAccessibilityConsiderations] = useState<
    AccessibilityConsiderationTag[]
  >(savedSr?.accessibility?.considerations || []);
  const [otherAccessibilityNotes, setOtherAccessibilityNotes] = useState<string>(
    savedSr?.accessibility?.otherAccessibilityNotes || "",
  );

  const [healthWellbeingConsiderations, setHealthWellbeingConsiderations] = useState<
    HealthWellbeingConsiderationTag[]
  >(savedSr?.healthWellbeing?.considerations || []);
  const [otherHealthConsiderations, setOtherHealthConsiderations] = useState<string>(
    savedSr?.healthWellbeing?.otherHealthConsiderations || "",
  );

  const [culturalReligiousConsiderations, setCulturalReligiousConsiderations] = useState<
    CulturalReligiousConsiderationTag[]
  >(savedSr?.culturalReligious?.considerations || []);
  const [culturalSensitivityNotes, setCulturalSensitivityNotes] = useState<string>(
    savedSr?.culturalReligious?.culturalSensitivityNotes || "",
  );

  const [securityProtocolConsiderations, setSecurityProtocolConsiderations] = useState<
    SecurityProtocolTag[]
  >(savedSr?.securityProtocol?.considerations || []);
  const [securityCoordinationNotes, setSecurityCoordinationNotes] = useState<string>(
    savedSr?.securityProtocol?.securityCoordinationNotes || "",
  );

  const [venueGuidelineConsiderations, setVenueGuidelineConsiderations] = useState<
    VenueGuidelineTag[]
  >(savedSr?.venueGuidelines?.considerations || []);
  const [wasteManagementNotes, setWasteManagementNotes] = useState<string>(
    savedSr?.venueGuidelines?.wasteManagementNotes || "",
  );

  const [specialRequestsNotes, setSpecialRequestsNotes] = useState<string>(
    savedSr?.specialRequests?.specialRequestsNotes || "",
  );

  const [salesAssessment, setSalesAssessment] = useState<SalesAssessmentConfidence | undefined>(
    savedSr?.salesAssessment,
  );

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedSr?.discussionStatus || "CONTINUE_LATER",
  );

  const [summaryText, setSummaryText] = useState<string>(savedSr?.businessSummary || "");
  const [isSummaryEdited, setIsSummaryEdited] = useState<boolean>(
    savedSr?.isSummaryManuallyEdited || false,
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const conversationData: SpecialRequirementsConversation = useMemo(
    () => ({
      accessibility: { considerations: accessibilityConsiderations, otherAccessibilityNotes },
      healthWellbeing: { considerations: healthWellbeingConsiderations, otherHealthConsiderations },
      culturalReligious: { considerations: culturalReligiousConsiderations, culturalSensitivityNotes },
      securityProtocol: { considerations: securityProtocolConsiderations, securityCoordinationNotes },
      venueGuidelines: { considerations: venueGuidelineConsiderations, wasteManagementNotes },
      specialRequests: { specialRequestsNotes },
      salesAssessment,
      businessSummary: summaryText,
      isSummaryManuallyEdited: isSummaryEdited,
      discussionStatus,
      validationStatus: "READY",
    }),
    [
      accessibilityConsiderations,
      otherAccessibilityNotes,
      healthWellbeingConsiderations,
      otherHealthConsiderations,
      culturalReligiousConsiderations,
      culturalSensitivityNotes,
      securityProtocolConsiderations,
      securityCoordinationNotes,
      venueGuidelineConsiderations,
      wasteManagementNotes,
      specialRequestsNotes,
      salesAssessment,
      summaryText,
      isSummaryEdited,
      discussionStatus,
    ],
  );

  // This workspace has no mandatory business fields for Discovery Readiness —
  // "no special requirements" is itself a complete, valid business answer.
  // computeSpecialRequirementsValidation always returns READY for engaged
  // data; see 02-engineering-package.md §4 for the business-vs-engineering
  // validation distinction this reflects.
  const validationStatus: BusinessValidationStatus = useMemo(() => {
    return computeSpecialRequirementsValidation(conversationData);
  }, [conversationData]);

  const isDiscoveryReady = discussionStatus === "COMPLETE" && validationStatus === "READY";

  // Every card here is optional, informational awareness — none is mandatory,
  // unlike every other Discovery workspace's Card 1. All 6 buckets therefore
  // track genuine engagement only; their defaults start empty, so they only
  // count once the host has actually answered.
  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (accessibilityConsiderations.length > 0) completed++;
    if (healthWellbeingConsiderations.length > 0) completed++;
    if (culturalReligiousConsiderations.length > 0) completed++;
    if (securityProtocolConsiderations.length > 0) completed++;
    if (venueGuidelineConsiderations.length > 0) completed++;
    if (specialRequestsNotes.trim().length > 0) completed++;
    const percentage = Math.round((completed / 6) * 100);
    return { completed, total: 6, percentage };
  }, [
    accessibilityConsiderations,
    healthWellbeingConsiderations,
    culturalReligiousConsiderations,
    securityProtocolConsiderations,
    venueGuidelineConsiderations,
    specialRequestsNotes,
  ]);

  // Narrative Structured Business Summary — short business sentences in the
  // customer's own language, never a literal field-by-field dump of raw
  // values. An empty card reads as an honest "nothing flagged" sentence.
  const autoSummary = useMemo(() => {
    const accessibilityText =
      accessibilityConsiderations.length > 0
        ? accessibilityConsiderations.map((item) => labelFor(item, ACCESSIBILITY_OPTIONS)).join(", ")
        : null;
    const accessibilitySentence = accessibilityText
      ? `The customer flagged: ${accessibilityText}.${otherAccessibilityNotes.trim() ? ` ${otherAccessibilityNotes.trim()}` : ""}`
      : "No accessibility considerations were flagged.";

    const healthText =
      healthWellbeingConsiderations.length > 0
        ? healthWellbeingConsiderations.map((item) => labelFor(item, HEALTH_WELLBEING_OPTIONS)).join(", ")
        : null;
    const healthSentence = healthText
      ? `The customer flagged: ${healthText}.${otherHealthConsiderations.trim() ? ` ${otherHealthConsiderations.trim()}` : ""}`
      : "No event-wide health or medical considerations were flagged.";

    const culturalText =
      culturalReligiousConsiderations.length > 0
        ? culturalReligiousConsiderations.map((item) => labelFor(item, CULTURAL_RELIGIOUS_OPTIONS)).join(", ")
        : null;
    const culturalSentence = culturalText
      ? `The customer mentioned: ${culturalText}.${culturalSensitivityNotes.trim() ? ` ${culturalSensitivityNotes.trim()}` : ""}`
      : "No cultural or religious considerations were shared.";

    const securityText =
      securityProtocolConsiderations.length > 0
        ? securityProtocolConsiderations.map((item) => labelFor(item, SECURITY_PROTOCOL_OPTIONS)).join(", ")
        : null;
    const securitySentence = securityText
      ? `The customer flagged: ${securityText}.${securityCoordinationNotes.trim() ? ` ${securityCoordinationNotes.trim()}` : ""}`
      : "No security or protocol expectations were flagged.";

    const venueText =
      venueGuidelineConsiderations.length > 0
        ? venueGuidelineConsiderations.map((item) => labelFor(item, VENUE_GUIDELINE_OPTIONS)).join(", ")
        : null;
    const venueSentence = venueText
      ? `The customer noted: ${venueText}.${wasteManagementNotes.trim() ? ` ${wasteManagementNotes.trim()}` : ""}`
      : "No venue guideline or compliance notes were shared.";

    const specialRequestsSentence = specialRequestsNotes.trim()
      ? `"${specialRequestsNotes.trim()}"`
      : "Nothing further was shared.";

    return `### Accessibility
${accessibilitySentence}

### Health & Wellbeing Considerations
${healthSentence}

### Cultural & Religious Considerations
${culturalSentence}

### Security & Protocol
${securitySentence}

### Venue Guidelines & Event Considerations
${venueSentence}

### Special Requests
${specialRequestsSentence}`;
  }, [
    accessibilityConsiderations,
    otherAccessibilityNotes,
    healthWellbeingConsiderations,
    otherHealthConsiderations,
    culturalReligiousConsiderations,
    culturalSensitivityNotes,
    securityProtocolConsiderations,
    securityCoordinationNotes,
    venueGuidelineConsiderations,
    wasteManagementNotes,
    specialRequestsNotes,
  ]);

  useEffect(() => {
    if (!isSummaryEdited) {
      setSummaryText(autoSummary);
    }
  }, [autoSummary, isSummaryEdited]);

  // Proposal-oriented only, never operational — and generated only when
  // supported by data the host actually captured during discovery. Must
  // never generate security tasks, medical tasks, operational assignments,
  // or compliance actions.
  const suggestedActivities = useMemo(() => {
    const items: Array<{ priority: "URGENT" | "IMPORTANT" | "RECOMMENDATION"; text: string }> = [];

    if (accessibilityConsiderations.length > 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Mention accessibility awareness in the proposal so Operations can plan appropriately later.",
      });
    }

    if (healthWellbeingConsiderations.length > 0) {
      items.push({
        priority: "IMPORTANT",
        text: "Include event-wide health or allergy awareness as a proposal note for the team.",
      });
    }

    if (culturalReligiousConsiderations.length > 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Note cultural or religious considerations for the proposal team's awareness.",
      });
    }

    if (securityProtocolConsiderations.length > 0) {
      items.push({
        priority: "URGENT",
        text: "Carry forward any security or VIP attendance expectations as an early proposal flag.",
      });
    }

    if (venueGuidelineConsiderations.length > 0) {
      items.push({
        priority: "IMPORTANT",
        text: "Carry forward venue guideline awareness (e.g. noise, permits) as a proposal note.",
      });
    }

    if (specialRequestsNotes.trim()) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Reflect the customer's closing remarks in the proposal narrative.",
      });
    }

    if (validationStatus === "READY" && discussionStatus === "COMPLETE") {
      items.push({
        priority: "RECOMMENDATION",
        text: "Special Requirements discovery ready for internal handover summary review.",
      });
    }

    if (items.length === 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Keep the conversation open for anything the customer wants understood before the proposal.",
      });
    }

    return items;
  }, [
    accessibilityConsiderations,
    healthWellbeingConsiderations,
    culturalReligiousConsiderations,
    securityProtocolConsiderations,
    venueGuidelineConsiderations,
    specialRequestsNotes,
    validationStatus,
    discussionStatus,
  ]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);

    try {
      const payload: SpecialRequirementsConversation = {
        ...conversationData,
        validationStatus,
      };

      const res = await fetch(`/api/cat/inquiries/${inquiryId}/discovery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: "SPECIAL_REQUIREMENTS",
          lifecycle: discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          validation: validationStatus,
          summary: summaryText,
          specialRequirements: payload,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save Special Requirements discovery.");
        return;
      }

      setSuccessMessage("Special Requirements discovery saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
      await Promise.resolve(onSaveSuccess(json?.overview));
    } catch (error) {
      console.error("Save Special Requirements discovery error:", error);
      alert("Unexpected error while saving Special Requirements discovery.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <button
          type="button"
          onClick={onBackToRequirements}
          className={`inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer rounded-lg ${FOCUS_RING}`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery Hub</span>
        </button>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              validationStatus === "READY"
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                : validationStatus === "BLOCKED"
                  ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-700 border-amber-500/20"
            }`}
          >
            {validationStatus === "READY" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : validationStatus === "BLOCKED" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>
              {validationStatus === "READY"
                ? "Discovery Ready"
                : validationStatus === "BLOCKED"
                  ? "Business Blocked"
                  : "Needs Attention"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Discovery"}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Guided Workspace
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Area: Special Requirements
              </span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-primary" />
              <span>Special Requirements Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Let's make sure we understand anything exceptional about your guests or your event before we prepare your proposal.
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
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${FOCUS_RING} ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${FOCUS_RING} ${
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

        <div className="pt-3 border-t border-border/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px] uppercase tracking-wider">
                Special Requirements Discovery Progress
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
          <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden border border-border/30">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${conversationProgress.percentage}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Every card here is optional — a customer with no special requirements has completed a genuine, valid Discovery conversation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Accessibility & Guest Comfort */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Accessibility & Guest Comfort</h3>
                <p className="text-xs text-muted-foreground">
                  Are there any guests who might need extra comfort or accessibility support?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {ACCESSIBILITY_OPTIONS.map((item) => {
                  const active = accessibilityConsiderations.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setAccessibilityConsiderations((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={otherAccessibilityNotes}
                onChange={(e) => setOtherAccessibilityNotes(e.target.value)}
                placeholder="e.g. a guest uses a walker and will need a clear, step-free path..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                Captures awareness only — not an accessibility audit or facilities assessment.
              </p>
            </div>
          </div>

          {/* Card 2: Health & Guest Wellbeing */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Health & Guest Wellbeing</h3>
                <p className="text-xs text-muted-foreground">
                  Are there any health or wellbeing considerations we should be aware of for the event?
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              Not for menu planning — food preferences belong to Food & Beverage Discovery.
            </p>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {HEALTH_WELLBEING_OPTIONS.map((item) => {
                  const active = healthWellbeingConsiderations.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setHealthWellbeingConsiderations((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={otherHealthConsiderations}
                onChange={(e) => setOtherHealthConsiderations(e.target.value)}
                placeholder="e.g. one guest carries an EpiPen and the team should know where first aid is kept..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                General awareness only — no personal medical records are captured, and no medical assessment is performed.
              </p>
            </div>
          </div>

          {/* Card 3: Cultural, Religious & Traditional Considerations */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Cultural, Religious & Traditional Considerations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Are there any cultural, religious, or traditional practices we should be mindful of?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {CULTURAL_RELIGIOUS_OPTIONS.map((item) => {
                  const active = culturalReligiousConsiderations.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setCulturalReligiousConsiderations((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={culturalSensitivityNotes}
                onChange={(e) => setCulturalSensitivityNotes(e.target.value)}
                placeholder="e.g. a short prayer will take place before the ceremony..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                Discovery stays respectful and awareness-only — not an advisory or interpretive service on customs or religious practice.
              </p>
            </div>
          </div>

          {/* Card 4: Security & Protocol Expectations */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Security & Protocol Expectations</h3>
                <p className="text-xs text-muted-foreground">
                  Are there any security or protocol expectations we should know about?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {SECURITY_PROTOCOL_OPTIONS.map((item) => {
                  const active = securityProtocolConsiderations.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setSecurityProtocolConsiderations((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={securityCoordinationNotes}
                onChange={(e) => setSecurityCoordinationNotes(e.target.value)}
                placeholder="e.g. no photography near the family table during dinner..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                Discovery only — no security planning, threat assessment, or coordination happens here.
              </p>
            </div>
          </div>

          {/* Card 5: Venue Guidelines & Event Considerations */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Venue Guidelines & Event Considerations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Are there any venue policies or compliance matters we should be aware of?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {VENUE_GUIDELINE_OPTIONS.map((item) => {
                  const active = venueGuidelineConsiderations.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setVenueGuidelineConsiderations((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={wasteManagementNotes}
                onChange={(e) => setWasteManagementNotes(e.target.value)}
                placeholder="e.g. the venue mentioned a noise restriction after 11 PM..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                Awareness only — no compliance assessment, verification, or advisory happens here.
              </p>
            </div>
          </div>

          {/* Card 6: Special Requests & Peace of Mind — also the emotional close of the workspace, and the final Discovery conversation of the Inquiry module */}
          <div className="mt-2 bg-linear-to-br from-primary/12 via-primary/5 to-card border-2 border-primary/35 rounded-2xl p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black text-xs shrink-0">
                6
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Quote className="w-5 h-5 text-primary" />
                  <span>Special Requests & Peace of Mind</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  One last, reflective question to close the conversation — and the final Discovery conversation of the Inquiry module.
                </p>
              </div>
            </div>

            <p className="text-lg font-bold text-foreground leading-snug pl-1">
              "Before we prepare your proposal, is there anything important about your event, your guests, or your expectations that you'd like us to understand?"
            </p>

            <textarea
              rows={4}
              value={specialRequestsNotes}
              onChange={(e) => setSpecialRequestsNotes(e.target.value)}
              placeholder='e.g. "We just want everything to feel effortless and taken care of."'
              className={`w-full text-sm bg-background border border-primary/30 rounded-xl p-3 leading-relaxed ${FOCUS_RING}`}
            />
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl shadow-xs divide-y divide-border/40 overflow-hidden self-start">
          <div className="bg-muted/40 p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                Insight Assistant
              </h3>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Special Requirements
            </span>
          </div>

          <div className="bg-linear-to-br from-amber-500/5 via-amber-500/2 to-card border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Discussion Tips</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Ask gently and stay conversational — this is awareness, not an interview or an assessment.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Medical, security, and compliance specifics belong to specialists later — capture only what the customer shared.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Quote className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  The closing question often surfaces what matters most — capture it in their own words.
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Internal Sales Assessment</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                SALESPERSON ONLY
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              Internal salesperson win probability rating for CRM opportunity forecasting.
            </p>

            <div className="space-y-2 pt-1">
              {SALES_ASSESSMENT_OPTIONS.map((option) => {
                const isSelected = salesAssessment === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSalesAssessment(option.key)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${FOCUS_RING} ${
                      isSelected
                        ? `${option.colorClass} shadow-xs ring-2 ring-primary/20 font-bold scale-[1.01]`
                        : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
                    </div>
                    <div>
                      <div className="font-extrabold">{option.label}</div>
                      <div className="text-[10px] opacity-80 mt-0.5 leading-normal">{option.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Structured Business Summary
              </h3>
              {isSummaryEdited ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSummaryEdited(false);
                    setSummaryText(autoSummary);
                  }}
                  className={`text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer rounded ${FOCUS_RING}`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Auto Summary</span>
                </button>
              ) : (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                  AUTO GENERATED
                </span>
              )}
            </div>

            <textarea
              rows={9}
              value={summaryText}
              onChange={(e) => {
                setIsSummaryEdited(true);
                setSummaryText(e.target.value);
              }}
              className={`w-full text-xs font-mono bg-background border border-border/60 rounded-xl p-4 leading-6 max-h-72 overflow-y-auto ${FOCUS_RING}`}
            />
          </div>

          <div className="p-5 space-y-3">
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
        </div>
      </div>
    </div>
  );
}
