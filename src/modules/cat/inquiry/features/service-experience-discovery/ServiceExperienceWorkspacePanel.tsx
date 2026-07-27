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
  Users,
  Zap,
} from "lucide-react";
import {
  BusinessValidationStatus,
  CommunicationStyleType,
  DiscoveryArea,
  DiscussionStatus,
  GuestExperiencePriority,
  HospitalityVisionType,
  HostInvolvementPreference,
  InquiryDiscoveryOverview,
  PreferenceImportanceWeighting,
  SalesAssessmentConfidence,
  ServiceAtmospherePreference,
  ServiceExperienceConversation,
  ServicePreferenceTag,
  SignatureHospitalityMoment,
  VipGuestTag,
  computeServiceExperienceValidation,
} from "@/modules/cat/inquiry/domain/discovery-types";

interface ServiceExperienceWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const HOSPITALITY_VISION_OPTIONS: {
  key: HospitalityVisionType;
  label: string;
  desc: string;
}[] = [
  {
    key: "LUXURY_FIVE_STAR",
    label: "Luxury Five-Star Experience",
    desc: "White-glove, five-star hotel-level service throughout",
  },
  {
    key: "WARM_FAMILY_HOSPITALITY",
    label: "Warm Family Hospitality",
    desc: "Warm, familial hospitality that feels personal",
  },
  {
    key: "PROFESSIONAL_EFFICIENT",
    label: "Professional & Efficient",
    desc: "Polished, efficient service with minimal fuss",
  },
  {
    key: "ROYAL_TRADITIONAL_HOSPITALITY",
    label: "Royal Traditional Hospitality",
    desc: "Traditional, ceremonial hospitality with royal touches",
  },
  {
    key: "FRIENDLY_RELAXED",
    label: "Friendly & Relaxed",
    desc: "Easygoing, friendly hospitality with a relaxed pace",
  },
  {
    key: "ELEGANT_DISCREET",
    label: "Elegant & Discreet",
    desc: "Refined, unobtrusive service that stays in the background",
  },
];

const SERVICE_ATMOSPHERE_OPTIONS: { key: ServiceAtmospherePreference; label: string }[] = [
  { key: "HIGHLY_ATTENTIVE", label: "Highly Attentive" },
  { key: "AVAILABLE_UNOBTRUSIVE", label: "Available but Unobtrusive" },
  { key: "FORMAL", label: "Formal" },
  { key: "CASUAL", label: "Casual" },
  { key: "PERSONALIZED", label: "Personalized" },
];

const GUEST_EXPERIENCE_PRIORITY_OPTIONS: { key: GuestExperiencePriority; label: string }[] = [
  { key: "WARM_HOSPITALITY", label: "Warm Hospitality" },
  { key: "FAST_FOOD_SERVICE", label: "Fast Food Service" },
  { key: "PERSONALIZED_GUEST_CARE", label: "Personalized Guest Care" },
  { key: "QUEUE_FREE_EXPERIENCE", label: "Queue-Free Experience" },
  { key: "BEVERAGE_SERVICE", label: "Beverage Service" },
  { key: "CHILDRENS_ASSISTANCE", label: "Children's Assistance" },
  { key: "SENIOR_CITIZEN_SUPPORT", label: "Senior Citizen Support" },
];

const HOST_INVOLVEMENT_OPTIONS: {
  key: HostInvolvementPreference;
  label: string;
  desc: string;
}[] = [
  {
    key: "RELAX_AND_ENJOY",
    label: "Relax and Enjoy",
    desc: "Let our team handle everything so you can enjoy your own event",
  },
  {
    key: "STAY_INFORMED",
    label: "Stay Informed",
    desc: "Receive updates without needing to manage anything",
  },
  {
    key: "BE_INVOLVED_KEY_MOMENTS",
    label: "Be Involved in Key Moments",
    desc: "Step in for the moments that matter most to you",
  },
  {
    key: "COORDINATE_THROUGHOUT",
    label: "Coordinate Throughout",
    desc: "Stay closely involved with our team through the event",
  },
];

const COMMUNICATION_STYLE_OPTIONS: { key: CommunicationStyleType; label: string }[] = [
  { key: "SINGLE_POINT_OF_CONTACT", label: "Single Point of Contact" },
  { key: "CONTINUOUS_UPDATES", label: "Continuous Updates" },
  { key: "MILESTONE_UPDATES_ONLY", label: "Milestone Updates Only" },
  { key: "MINIMAL_INTERRUPTIONS", label: "Minimal Interruptions" },
];

const VIP_GUEST_TAG_OPTIONS: { key: VipGuestTag; label: string }[] = [
  { key: "VIP_GUESTS", label: "VIP Guests" },
  { key: "SENIOR_CITIZENS", label: "Senior Citizens" },
  { key: "CHILDREN", label: "Children" },
  { key: "ACCESSIBILITY_NEEDS", label: "Guests with Accessibility Needs" },
  { key: "INTERNATIONAL_GUESTS", label: "International Guests" },
  { key: "RELIGIOUS_DIGNITARIES", label: "Religious Dignitaries" },
];

const SIGNATURE_MOMENT_OPTIONS: { key: SignatureHospitalityMoment; label: string }[] = [
  { key: "WARM_WELCOME_EXPERIENCE", label: "Warm Welcome Experience" },
  { key: "PERSONALIZED_GREETINGS", label: "Personalized Greetings" },
  { key: "ARRIVAL_REFRESHMENTS", label: "Arrival Refreshments" },
  { key: "VIP_TABLE_SERVICE", label: "VIP Table Service" },
  { key: "CAKE_CEREMONY_SUPPORT", label: "Cake Ceremony Support" },
  { key: "TOAST_COORDINATION", label: "Toast Coordination" },
  { key: "FAREWELL_HOSPITALITY", label: "Farewell Hospitality" },
  { key: "DEPARTURE_THANK_YOU", label: "Departure / Thank You" },
];

const SERVICE_PREFERENCE_TAG_OPTIONS: { key: ServicePreferenceTag; label: string }[] = [
  { key: "PREMIUM_UNIFORMED_SERVICE", label: "Premium Uniformed Service" },
  { key: "TRADITIONAL_ATTIRE", label: "Traditional Attire" },
  { key: "ENGLISH_SPEAKING_STAFF", label: "English Speaking Staff" },
  { key: "LOCAL_LANGUAGE_PREFERENCE", label: "Local Language Preference" },
  { key: "CHILD_FRIENDLY_STAFF", label: "Child-Friendly Staff" },
  { key: "ALLERGY_AWARENESS", label: "Allergy Awareness" },
];

// Matches Budget & Commercial's Internal Sales Assessment exactly — same
// three confidence tiers, labels, colors, and supporting rationale text.
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
    desc: "Client is actively evaluating caterers; strong proposal & food tasting needed.",
  },
  {
    key: "EXPLORATORY_LOW_CONFIDENCE",
    label: "Exploratory / High Risk",
    colorClass: "bg-rose-500/15 border-rose-500/30 text-rose-800",
    desc: "Early research stage or budget mismatch; follow up carefully.",
  },
];

const WEIGHTING_OPTIONS: { key: PreferenceImportanceWeighting; label: string }[] = [
  { key: "ESSENTIAL", label: "Must Have" },
  { key: "PREFERRED", label: "Preferred" },
  { key: "OPTIONAL", label: "Nice to Have" },
];

function labelFor<T extends string>(
  key: T,
  options: { key: T; label: string }[],
): string {
  return options.find((item) => item.key === key)?.label || key;
}

function toggleArrayValue<T extends string>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((item) => item !== val) : [...arr, val];
}

// Shared selection-state treatments — identical convention to the Decor &
// Ambience and Budget & Commercial discovery workspaces, for a consistent
// premium feel across the Discovery product family.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card";

const CARD_OPTION_UNSELECTED =
  "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30";

const CARD_OPTION_SELECTED_PRIMARY =
  "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]";

const CARD_OPTION_SELECTED_SECONDARY =
  "bg-primary/10 border-primary shadow-xs text-foreground scale-[1.01]";

function cardOptionClass(active: boolean, tier: "primary" | "secondary" = "primary"): string {
  const base = "p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative";
  const selected = tier === "primary" ? CARD_OPTION_SELECTED_PRIMARY : CARD_OPTION_SELECTED_SECONDARY;
  return `${base} ${active ? selected : CARD_OPTION_UNSELECTED} ${FOCUS_RING}`;
}

const CHIP_UNSELECTED =
  "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30";

const CHIP_SELECTED =
  "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20";

function chipClass(active: boolean): string {
  const base = "text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition-all duration-150 cursor-pointer inline-flex items-center gap-1";
  return `${base} ${active ? CHIP_SELECTED : CHIP_UNSELECTED} ${FOCUS_RING}`;
}

export default function ServiceExperienceWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
}: ServiceExperienceWorkspacePanelProps) {
  const savedSe = initialArea?.serviceExperience;

  const [hospitalityVision, setHospitalityVision] = useState<HospitalityVisionType>(
    savedSe?.hospitalityVision || "WARM_FAMILY_HOSPITALITY",
  );
  const [hospitalityVisionWeighting, setHospitalityVisionWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedSe?.hospitalityVisionWeighting || "PREFERRED",
    );
  const [serviceAtmospherePreference, setServiceAtmospherePreference] =
    useState<ServiceAtmospherePreference>(
      savedSe?.serviceAtmospherePreference || "HIGHLY_ATTENTIVE",
    );

  const [guestExperiencePriorities, setGuestExperiencePriorities] = useState<
    GuestExperiencePriority[]
  >(savedSe?.guestExperiencePriorities || ["WARM_HOSPITALITY"]);
  const [guestExperienceWeighting, setGuestExperienceWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedSe?.guestExperienceWeighting || "PREFERRED",
    );

  const [hostInvolvementPreference, setHostInvolvementPreference] =
    useState<HostInvolvementPreference>(
      savedSe?.hostInvolvementPreference || "STAY_INFORMED",
    );
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyleType>(
    savedSe?.communicationStyle || "MILESTONE_UPDATES_ONLY",
  );
  const [communicationStyleWeighting, setCommunicationStyleWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedSe?.communicationStyleWeighting || "PREFERRED",
    );

  const [vipGuestTags, setVipGuestTags] = useState<VipGuestTag[]>(
    savedSe?.vipGuestTags || [],
  );
  const [vipServiceWeighting, setVipServiceWeighting] =
    useState<PreferenceImportanceWeighting>(savedSe?.vipServiceWeighting || "OPTIONAL");
  const [vipAdditionalNotes, setVipAdditionalNotes] = useState<string>(
    savedSe?.vipAdditionalNotes || "",
  );

  const [signatureMoments, setSignatureMoments] = useState<SignatureHospitalityMoment[]>(
    savedSe?.signatureMoments || [],
  );
  const [signatureMomentsWeighting, setSignatureMomentsWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedSe?.signatureMomentsWeighting || "PREFERRED",
    );

  const [servicePreferenceTags, setServicePreferenceTags] = useState<ServicePreferenceTag[]>(
    savedSe?.servicePreferenceTags || [],
  );
  const [practicalNotes, setPracticalNotes] = useState<string>(
    savedSe?.practicalNotes || "",
  );

  const [hospitalityMemoryResponse, setHospitalityMemoryResponse] = useState<string>(
    savedSe?.hospitalityMemoryResponse || "",
  );

  const [salesAssessment, setSalesAssessment] = useState<
    SalesAssessmentConfidence | undefined
  >(savedSe?.salesAssessment);

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedSe?.discussionStatus || "CONTINUE_LATER",
  );

  const [summaryText, setSummaryText] = useState<string>(
    savedSe?.businessSummary || "",
  );
  const [isSummaryEdited, setIsSummaryEdited] = useState<boolean>(
    savedSe?.isSummaryManuallyEdited || false,
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validationStatus: BusinessValidationStatus = useMemo(() => {
    return computeServiceExperienceValidation({
      hospitalityVision,
      serviceAtmospherePreference,
      hostInvolvementPreference,
      communicationStyle,
      guestExperiencePriorities,
    });
  }, [
    hospitalityVision,
    serviceAtmospherePreference,
    hostInvolvementPreference,
    communicationStyle,
    guestExperiencePriorities,
  ]);

  const isDiscoveryReady =
    discussionStatus === "COMPLETE" && validationStatus === "READY";

  // Bucket 1-3 mirror computeServiceExperienceValidation's required conditions exactly,
  // so progress can never contradict the validation badge. Buckets 4-6 track genuine
  // engagement with the (intentionally optional) VIP / Signature / Preferences cards —
  // their defaults start empty, so they only count once the host has actually answered.
  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (hospitalityVision && serviceAtmospherePreference) completed++;
    if (guestExperiencePriorities.length > 0) completed++;
    if (hostInvolvementPreference && communicationStyle) completed++;
    if (vipGuestTags.length > 0) completed++;
    if (signatureMoments.length > 0) completed++;
    if (servicePreferenceTags.length > 0) completed++;
    const percentage = Math.round((completed / 6) * 100);
    return { completed, total: 6, percentage };
  }, [
    hospitalityVision,
    serviceAtmospherePreference,
    guestExperiencePriorities,
    hostInvolvementPreference,
    communicationStyle,
    vipGuestTags,
    signatureMoments,
    servicePreferenceTags,
  ]);

  const autoSummary = useMemo(() => {
    const prioritiesText =
      guestExperiencePriorities.length > 0
        ? guestExperiencePriorities
            .map((item) => labelFor(item, GUEST_EXPERIENCE_PRIORITY_OPTIONS))
            .join(", ")
        : "Not yet discussed";
    const vipText =
      vipGuestTags.length > 0
        ? vipGuestTags.map((item) => labelFor(item, VIP_GUEST_TAG_OPTIONS)).join(", ")
        : "None flagged";
    const momentsText =
      signatureMoments.length > 0
        ? signatureMoments
            .map((item) => labelFor(item, SIGNATURE_MOMENT_OPTIONS))
            .join(", ")
        : "To be discovered";
    const servicePrefText =
      servicePreferenceTags.length > 0
        ? servicePreferenceTags
            .map((item) => labelFor(item, SERVICE_PREFERENCE_TAG_OPTIONS))
            .join(", ")
        : "None specified";

    return `### Hospitality Vision
- **Vision**: ${labelFor(hospitalityVision, HOSPITALITY_VISION_OPTIONS)} (${labelFor(hospitalityVisionWeighting, WEIGHTING_OPTIONS)})
- **Service Atmosphere**: ${labelFor(serviceAtmospherePreference, SERVICE_ATMOSPHERE_OPTIONS)}

### Guest Experience Priorities
- **Priorities**: ${prioritiesText} (${labelFor(guestExperienceWeighting, WEIGHTING_OPTIONS)})

### Host Involvement & Communication
- **Host Preference**: ${labelFor(hostInvolvementPreference, HOST_INVOLVEMENT_OPTIONS)}
- **Communication Style**: ${labelFor(communicationStyle, COMMUNICATION_STYLE_OPTIONS)} (${labelFor(communicationStyleWeighting, WEIGHTING_OPTIONS)})

### VIP & Special Guest Care
- **VIP Tags**: ${vipText} (${labelFor(vipServiceWeighting, WEIGHTING_OPTIONS)})
- **Notes**: ${vipAdditionalNotes.trim() || "None noted"}

### Signature Hospitality Moments
- **Moments**: ${momentsText} (${labelFor(signatureMomentsWeighting, WEIGHTING_OPTIONS)})

### Service Preferences
- **Preferences**: ${servicePrefText}
- **Practical Notes**: ${practicalNotes.trim() || "None noted"}

### Hospitality Memory
- **In the Host's Words**: ${hospitalityMemoryResponse.trim() ? `"${hospitalityMemoryResponse.trim()}"` : "Not yet shared"}`;
  }, [
    hospitalityVision,
    hospitalityVisionWeighting,
    serviceAtmospherePreference,
    guestExperiencePriorities,
    guestExperienceWeighting,
    hostInvolvementPreference,
    communicationStyle,
    communicationStyleWeighting,
    vipGuestTags,
    vipServiceWeighting,
    vipAdditionalNotes,
    signatureMoments,
    signatureMomentsWeighting,
    servicePreferenceTags,
    practicalNotes,
    hospitalityMemoryResponse,
  ]);

  useEffect(() => {
    if (!isSummaryEdited) {
      setSummaryText(autoSummary);
    }
  }, [autoSummary, isSummaryEdited]);

  const suggestedActivities = useMemo(() => {
    const items: Array<{
      priority: "URGENT" | "IMPORTANT" | "RECOMMENDATION";
      text: string;
    }> = [];

    if (vipGuestTags.includes("ACCESSIBILITY_NEEDS")) {
      items.push({
        priority: "URGENT",
        text: "Clarify accessibility or medical assistance needs before service planning begins.",
      });
    }

    if (vipGuestTags.length > 0) {
      items.push({
        priority: "IMPORTANT",
        text: "Confirm VIP and special-guest hospitality expectations with the team before quotation.",
      });
    }

    if (communicationStyle) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Share the host's communication preferences with the Event Manager.",
      });
    }

    if (validationStatus === "READY" && discussionStatus === "COMPLETE") {
      items.push({
        priority: "RECOMMENDATION",
        text: "Proceed to internal handover — no further service experience input needed.",
      });
    }

    if (items.length === 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Keep the conversation on hospitality intent for now — staffing and execution planning come later.",
      });
    }

    return items;
  }, [vipGuestTags, communicationStyle, validationStatus, discussionStatus]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);

    try {
      const payload: ServiceExperienceConversation = {
        hospitalityVision,
        hospitalityVisionWeighting,
        serviceAtmospherePreference,
        guestExperiencePriorities,
        guestExperienceWeighting,
        hostInvolvementPreference,
        communicationStyle,
        communicationStyleWeighting,
        vipGuestTags,
        vipServiceWeighting,
        vipAdditionalNotes: vipAdditionalNotes || undefined,
        signatureMoments,
        signatureMomentsWeighting,
        servicePreferenceTags,
        practicalNotes: practicalNotes || undefined,
        hospitalityMemoryResponse: hospitalityMemoryResponse || undefined,
        salesAssessment,
        businessSummary: summaryText,
        isSummaryManuallyEdited: isSummaryEdited,
        discussionStatus,
        validationStatus,
      };

      const res = await fetch(`/api/cat/inquiries/${inquiryId}/discovery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: "SERVICE_EXPERIENCE",
          lifecycle:
            discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          validation: validationStatus,
          summary: summaryText,
          serviceExperience: payload,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save Service Experience discovery.");
        return;
      }

      setSuccessMessage("Service Experience discovery saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
      await Promise.resolve(onSaveSuccess(json?.overview));
    } catch (error) {
      console.error("Save Service Experience discovery error:", error);
      alert("Unexpected error while saving Service Experience discovery.");
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
                Area: Service Experience
              </span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-primary" />
              <span>Service Experience Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Let's talk about the hospitality, care and feel you want your guests to experience.
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
                Service Experience Discovery Progress
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Hospitality Vision */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Hospitality Vision
                </h3>
                <p className="text-xs text-muted-foreground">
                  When your guests think back to this event, how would you like them to remember your hospitality?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {HOSPITALITY_VISION_OPTIONS.map((item) => {
                  const active = hospitalityVision === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setHospitalityVision(item.key)}
                      className={cardOptionClass(active)}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                          <Check className="w-2.5 h-2.5 stroke-3" />
                        </div>
                      )}
                      <div className="text-xs font-extrabold text-foreground pr-5">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Hospitality Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = hospitalityVisionWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setHospitalityVisionWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                  <span className="text-[10px] text-muted-foreground italic pl-1">
                    This helps us understand which preferences matter most.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Service Atmosphere
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_ATMOSPHERE_OPTIONS.map((item) => {
                  const active = serviceAtmospherePreference === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setServiceAtmospherePreference(item.key)}
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Guest Experience Priorities */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Guest Experience Priorities
                </h3>
                <p className="text-xs text-muted-foreground">
                  What parts of the guest experience matter most to you?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {GUEST_EXPERIENCE_PRIORITY_OPTIONS.map((item) => {
                  const active = guestExperiencePriorities.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setGuestExperiencePriorities((prev) =>
                          toggleArrayValue(prev, item.key),
                        )
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Guest Experience Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = guestExperienceWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setGuestExperienceWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Host Involvement & Communication */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Host Involvement & Communication
                </h3>
                <p className="text-xs text-muted-foreground">
                  How involved would you like to be during the event?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HOST_INVOLVEMENT_OPTIONS.map((item) => {
                const active = hostInvolvementPreference === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setHostInvolvementPreference(item.key)}
                    className={`${cardOptionClass(active, "secondary")} p-3`}
                  >
                    <div className="text-xs font-extrabold text-foreground">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Communication Style
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMUNICATION_STYLE_OPTIONS.map((item) => {
                  const active = communicationStyle === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCommunicationStyle(item.key)}
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Communication Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = communicationStyleWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setCommunicationStyleWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: VIP & Special Guest Care */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  VIP & Special Guest Care
                </h3>
                <p className="text-xs text-muted-foreground">
                  Are there any guests who may appreciate a little extra attention?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {VIP_GUEST_TAG_OPTIONS.map((item) => {
                  const active = vipGuestTags.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setVipGuestTags((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  VIP Service Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = vipServiceWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setVipServiceWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={vipAdditionalNotes}
                onChange={(e) => setVipAdditionalNotes(e.target.value)}
                placeholder="Share a little more about any guests who'd appreciate special thought from our team..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
            </div>
          </div>

          {/* Card 5: Signature Hospitality Moments */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Signature Hospitality Moments
                </h3>
                <p className="text-xs text-muted-foreground">
                  Which moments should feel especially memorable?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {SIGNATURE_MOMENT_OPTIONS.map((item) => {
                  const active = signatureMoments.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setSignatureMoments((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Signature Moments Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = signatureMomentsWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setSignatureMomentsWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 6: Service Preferences & Practical Considerations */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                6
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Service Preferences & Practical Considerations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Are there any service preferences or practical considerations we should know about?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Service Preferences
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_PREFERENCE_TAG_OPTIONS.map((item) => {
                  const active = servicePreferenceTags.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setServicePreferenceTags((prev) =>
                          toggleArrayValue(prev, item.key),
                        )
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Practical Notes
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <label className="text-xs font-bold text-foreground block">
                Cultural Etiquette, Religious Customs & Other Considerations
              </label>
              <textarea
                rows={2}
                value={practicalNotes}
                onChange={(e) => setPracticalNotes(e.target.value)}
                placeholder="Share any customs, sensitivities or practical details that would help our team prepare..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
            </div>
          </div>

          {/* Closing: Hospitality Memory — slightly stronger emphasis as the reflective closing prompt */}
          <div className="bg-linear-to-br from-primary/10 via-primary/5 to-card border-2 border-primary/30 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Quote className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Hospitality Memory
                </h3>
                <p className="text-xs text-muted-foreground">
                  One last, reflective question to close the conversation.
                </p>
              </div>
            </div>

            <p className="text-base font-bold text-foreground leading-snug pl-1">
              "If one guest described your event afterwards, what would you love to hear them say about our hospitality?"
            </p>

            <textarea
              rows={3}
              value={hospitalityMemoryResponse}
              onChange={(e) => setHospitalityMemoryResponse(e.target.value)}
              placeholder='e.g. "Everyone felt genuinely cared for, and nothing felt rushed."'
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
              Service Discovery
            </span>
          </div>

          <div className="bg-linear-to-br from-amber-500/5 via-amber-500/2 to-card border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Service Discussion Tips</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Ask how guests should feel, not what tasks the team will
                  perform.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Treat VIP and accessibility notes as context for the team —
                  staffing and rostering come later, with Operations.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  The Hospitality Memory question often surfaces the host's
                  real priorities — capture it in their own words.
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
                    <span className="text-[11px] font-medium leading-relaxed block">
                      {item.text}
                    </span>
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
