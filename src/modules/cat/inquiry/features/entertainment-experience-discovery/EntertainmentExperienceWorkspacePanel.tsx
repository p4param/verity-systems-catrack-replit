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
  Lightbulb,
  Lock,
  MessageCircle,
  Music,
  PartyPopper,
  Quote,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  BackgroundEntertainmentTag,
  BusinessValidationStatus,
  DiscoveryArea,
  DiscussionStatus,
  EntertainmentAvoidTag,
  EntertainmentExperienceConversation,
  EventAtmosphereType,
  FeaturedEntertainmentTag,
  GuestEngagementStyle,
  GuestParticipationLevel,
  InquiryDiscoveryOverview,
  InteractiveExperienceTag,
  PreferenceImportanceWeighting,
  SalesAssessmentConfidence,
  ServiceOwnershipPreference,
  SignatureExperienceTag,
  TechnologyBusinessPurpose,
  TechnologyEnhancementTag,
  ValueAddedServiceTag,
  VenueAwarenessStatus,
  computeEntertainmentExperienceValidation,
} from "@/modules/cat/inquiry/domain/discovery-types";

interface EntertainmentExperienceWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const EVENT_ATMOSPHERE_OPTIONS: { key: EventAtmosphereType; label: string; desc: string }[] = [
  {
    key: "LIVELY_HIGH_ENERGY",
    label: "Lively & High-Energy Celebration",
    desc: "Upbeat, buzzing energy from start to finish",
  },
  {
    key: "WARM_RELAXED_SOCIAL",
    label: "Warm & Relaxed Social Gathering",
    desc: "Easygoing, comfortable, conversation-friendly",
  },
  {
    key: "ELEGANT_REFINED",
    label: "Elegant & Refined Atmosphere",
    desc: "Polished, sophisticated, understated",
  },
  {
    key: "FUN_FILLED_FAMILY",
    label: "Fun-Filled Family Celebration",
    desc: "Playful, inclusive, all-generations energy",
  },
  {
    key: "CULTURAL_TRADITIONAL",
    label: "Cultural & Traditional Festivity",
    desc: "Rooted in ritual, heritage and custom",
  },
];

const GUEST_ENGAGEMENT_STYLE_OPTIONS: { key: GuestEngagementStyle; label: string }[] = [
  { key: "FULLY_IMMERSED_PARTICIPATING", label: "Guests Fully Immersed & Participating" },
  { key: "ENTERTAINED_WHILE_MINGLING", label: "Guests Entertained While Mingling" },
  { key: "LIGHT_BACKGROUND_ENJOYMENT", label: "Light, Background Enjoyment Only" },
];

const BACKGROUND_ENTERTAINMENT_OPTIONS: { key: BackgroundEntertainmentTag; label: string }[] = [
  { key: "INSTRUMENTAL_MUSIC", label: "Instrumental Music" },
];

const FEATURED_ENTERTAINMENT_OPTIONS: { key: FeaturedEntertainmentTag; label: string }[] = [
  { key: "DJ", label: "DJ" },
  { key: "LIVE_BAND", label: "Live Band" },
  { key: "SINGER", label: "Singer" },
  { key: "CULTURAL_PERFORMANCES", label: "Cultural Performances" },
  { key: "DANCE_PERFORMANCES", label: "Dance Performances" },
  { key: "HOST_EMCEE", label: "Host / Emcee" },
];

const ENTERTAINMENT_AVOID_OPTIONS: { key: EntertainmentAvoidTag; label: string }[] = [
  { key: "LOUD_MUSIC_DURING_DINING", label: "Loud Music During Dining" },
  { key: "NO_FIRE_PYROTECHNICS", label: "No Fire / Pyrotechnic Elements" },
  { key: "KEEP_FAMILY_FRIENDLY", label: "Keep it Family-Friendly" },
  { key: "NO_LATE_NIGHT_LOUD_PERFORMANCES", label: "No Late-Night Loud Performances" },
];

const GUEST_PARTICIPATION_OPTIONS: { key: GuestParticipationLevel; label: string; desc: string }[] = [
  {
    key: "FULLY_PARTICIPATING_HANDS_ON",
    label: "Fully Participating & Hands-On",
    desc: "Guests are active participants, not just spectators",
  },
  {
    key: "WATCHING_ENJOYING",
    label: "Watching & Enjoying",
    desc: "Guests enjoy from the sidelines, low effort required",
  },
  {
    key: "MIX_OF_BOTH",
    label: "A Mix of Both",
    desc: "Some hands-on moments, some pure spectating",
  },
];

const INTERACTIVE_EXPERIENCE_OPTIONS: { key: InteractiveExperienceTag; label: string }[] = [
  { key: "PHOTO_BOOTH", label: "Photo Booth" },
  { key: "SELFIE_STATION", label: "Selfie Station" },
  { key: "KIDS_ENTERTAINMENT", label: "Kids Entertainment" },
  { key: "GAMES", label: "Games" },
  { key: "INTERACTIVE_EXPERIENCES", label: "Interactive Experiences" },
  { key: "LIVE_DEMONSTRATIONS", label: "Live Demonstrations" },
];

const TECHNOLOGY_BUSINESS_PURPOSE_OPTIONS: { key: TechnologyBusinessPurpose; label: string }[] = [
  { key: "ENHANCE_GUEST_ENGAGEMENT", label: "Enhance Guest Engagement" },
  { key: "CAPTURE_MEMORIES_KEEPSAKE", label: "Capture Memories for Keepsake" },
  { key: "EVENT_BRANDING_PROMOTION", label: "Event Branding & Promotion" },
  { key: "SUPPORT_PRESENTATIONS_SPEECHES", label: "Support Presentations / Speeches" },
  { key: "ELEVATE_VISUAL_IMPACT", label: "Elevate Visual Impact" },
];

const TECHNOLOGY_ENHANCEMENT_OPTIONS: { key: TechnologyEnhancementTag; label: string }[] = [
  { key: "LED_WALL", label: "LED Wall" },
  { key: "LIVE_STREAMING", label: "Live Streaming" },
  { key: "EVENT_RECORDING", label: "Event Recording" },
  { key: "PROJECTORS", label: "Projectors" },
  { key: "PRESENTATION_SUPPORT", label: "Presentation Support" },
  { key: "DIGITAL_DISPLAYS", label: "Digital Displays" },
  { key: "EVENT_BRANDING", label: "Event Branding" },
];

const VENUE_AWARENESS_OPTIONS: { key: VenueAwarenessStatus; label: string }[] = [
  { key: "NO_KNOWN_RESTRICTIONS", label: "No Known Restrictions" },
  { key: "SOME_RESTRICTIONS_KNOWN", label: "Some Restrictions We Know Of" },
  { key: "NOT_SURE_YET", label: "Not Sure Yet" },
];

const VALUE_ADDED_SERVICE_OPTIONS: { key: ValueAddedServiceTag; label: string }[] = [
  { key: "WELCOME_DRINKS", label: "Welcome Drinks" },
  { key: "VALET_PARKING", label: "Valet Parking" },
  { key: "GUEST_REGISTRATION", label: "Guest Registration" },
  { key: "RETURN_GIFTS", label: "Return Gifts" },
  { key: "HOSPITALITY_DESK", label: "Hospitality Desk" },
  { key: "DIRECTIONAL_SIGNAGE", label: "Directional Signage" },
  { key: "TRANSPORTATION_ASSISTANCE", label: "Transportation Assistance" },
];

const SERVICE_OWNERSHIP_OPTIONS: { key: ServiceOwnershipPreference; label: string }[] = [
  { key: "SELF_COORDINATING", label: "I'll Handle These Myself" },
  { key: "REQUEST_TEAM_HELP", label: "I'd Like Your Team's Help" },
  { key: "SHARED_COORDINATION", label: "A Bit of Both" },
  { key: "NOT_DECIDED_YET", label: "Not Decided Yet" },
];

const SIGNATURE_EXPERIENCE_OPTIONS: { key: SignatureExperienceTag; label: string }[] = [
  { key: "AMAZING_ENTERTAINMENT", label: "Amazing Entertainment" },
  { key: "BEAUTIFUL_CELEBRATION_MOMENTS", label: "Beautiful Celebration Moments" },
  { key: "INTERACTIVE_GUEST_EXPERIENCES", label: "Interactive Guest Experiences" },
  { key: "LUXURY_WELCOME", label: "Luxury Welcome" },
  { key: "TECHNOLOGY_EXPERIENCE", label: "Technology Experience" },
  { key: "PERSONAL_TOUCHES", label: "Personal Touches" },
  { key: "SIMPLE_ELEGANT_CELEBRATION", label: "Simple, Elegant Celebration" },
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

const WEIGHTING_OPTIONS: { key: PreferenceImportanceWeighting; label: string }[] = [
  { key: "ESSENTIAL", label: "Must Have" },
  { key: "PREFERRED", label: "Preferred" },
  { key: "OPTIONAL", label: "Nice to Have" },
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

export default function EntertainmentExperienceWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
}: EntertainmentExperienceWorkspacePanelProps) {
  const savedEe = initialArea?.entertainmentExperience;

  const [eventAtmosphere, setEventAtmosphere] = useState<EventAtmosphereType>(
    savedEe?.eventAtmosphere || "WARM_RELAXED_SOCIAL",
  );
  const [eventAtmosphereWeighting, setEventAtmosphereWeighting] =
    useState<PreferenceImportanceWeighting>(savedEe?.eventAtmosphereWeighting || "PREFERRED");
  const [guestEngagementStyle, setGuestEngagementStyle] = useState<GuestEngagementStyle>(
    savedEe?.guestEngagementStyle || "ENTERTAINED_WHILE_MINGLING",
  );

  const [backgroundEntertainment, setBackgroundEntertainment] = useState<BackgroundEntertainmentTag[]>(
    savedEe?.backgroundEntertainment || [],
  );
  const [featuredEntertainment, setFeaturedEntertainment] = useState<FeaturedEntertainmentTag[]>(
    savedEe?.featuredEntertainment || [],
  );
  const [entertainmentAvoidTags, setEntertainmentAvoidTags] = useState<EntertainmentAvoidTag[]>(
    savedEe?.entertainmentAvoidTags || [],
  );
  const [entertainmentGenresToAvoid, setEntertainmentGenresToAvoid] = useState<string>(
    savedEe?.entertainmentGenresToAvoid || "",
  );

  const [guestParticipationLevel, setGuestParticipationLevel] = useState<GuestParticipationLevel>(
    savedEe?.guestParticipationLevel || "MIX_OF_BOTH",
  );
  const [interactiveExperiences, setInteractiveExperiences] = useState<InteractiveExperienceTag[]>(
    savedEe?.interactiveExperiences || [],
  );
  const [otherGuestActivities, setOtherGuestActivities] = useState<string>(
    savedEe?.otherGuestActivities || "",
  );

  const [technologyBusinessPurpose, setTechnologyBusinessPurpose] = useState<TechnologyBusinessPurpose[]>(
    savedEe?.technologyBusinessPurpose || [],
  );
  const [technologyEnhancements, setTechnologyEnhancements] = useState<TechnologyEnhancementTag[]>(
    savedEe?.technologyEnhancements || [],
  );
  const [venueAwarenessStatus, setVenueAwarenessStatus] = useState<VenueAwarenessStatus>(
    savedEe?.venueAwarenessStatus || "NOT_SURE_YET",
  );
  const [venueAwarenessNotes, setVenueAwarenessNotes] = useState<string>(
    savedEe?.venueAwarenessNotes || "",
  );

  const [valueAddedServices, setValueAddedServices] = useState<ValueAddedServiceTag[]>(
    savedEe?.valueAddedServices || [],
  );
  const [serviceImportanceWeighting, setServiceImportanceWeighting] =
    useState<PreferenceImportanceWeighting>(savedEe?.serviceImportanceWeighting || "PREFERRED");
  const [serviceOwnershipPreference, setServiceOwnershipPreference] =
    useState<ServiceOwnershipPreference>(savedEe?.serviceOwnershipPreference || "NOT_DECIDED_YET");

  const [signatureExperience, setSignatureExperience] = useState<SignatureExperienceTag[]>(
    savedEe?.signatureExperience || [],
  );
  const [priorityExperience, setPriorityExperience] = useState<SignatureExperienceTag | undefined>(
    savedEe?.priorityExperience,
  );
  const [signatureExperienceNotes, setSignatureExperienceNotes] = useState<string>(
    savedEe?.signatureExperienceNotes || "",
  );

  const [salesAssessment, setSalesAssessment] = useState<SalesAssessmentConfidence | undefined>(
    savedEe?.salesAssessment,
  );

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedEe?.discussionStatus || "CONTINUE_LATER",
  );

  const [summaryText, setSummaryText] = useState<string>(savedEe?.businessSummary || "");
  const [isSummaryEdited, setIsSummaryEdited] = useState<boolean>(
    savedEe?.isSummaryManuallyEdited || false,
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validationStatus: BusinessValidationStatus = useMemo(() => {
    return computeEntertainmentExperienceValidation({ eventAtmosphere, guestEngagementStyle });
  }, [eventAtmosphere, guestEngagementStyle]);

  const isDiscoveryReady = discussionStatus === "COMPLETE" && validationStatus === "READY";

  // Bucket 1 mirrors computeEntertainmentExperienceValidation's required condition
  // exactly, so progress can never contradict the validation badge. Buckets 2-6
  // track genuine engagement with the (intentionally optional) remaining cards —
  // their defaults start empty, so they only count once the host has actually
  // answered, consistent with every other Discovery workspace.
  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (eventAtmosphere && guestEngagementStyle) completed++;
    if (backgroundEntertainment.length > 0 || featuredEntertainment.length > 0) completed++;
    if (interactiveExperiences.length > 0) completed++;
    if (technologyEnhancements.length > 0) completed++;
    if (valueAddedServices.length > 0) completed++;
    if (signatureExperience.length > 0) completed++;
    const percentage = Math.round((completed / 6) * 100);
    return { completed, total: 6, percentage };
  }, [
    eventAtmosphere,
    guestEngagementStyle,
    backgroundEntertainment,
    featuredEntertainment,
    interactiveExperiences,
    technologyEnhancements,
    valueAddedServices,
    signatureExperience,
  ]);

  // Narrative Structured Business Summary — short business sentences in the
  // customer's own language, never a literal field-by-field dump of raw values.
  const autoSummary = useMemo(() => {
    const atmosphereLabel = labelFor(eventAtmosphere, EVENT_ATMOSPHERE_OPTIONS);
    const engagementLabel = labelFor(guestEngagementStyle, GUEST_ENGAGEMENT_STYLE_OPTIONS);
    const weightingLabel = labelFor(eventAtmosphereWeighting, WEIGHTING_OPTIONS);

    const backgroundText =
      backgroundEntertainment.length > 0
        ? backgroundEntertainment.map((item) => labelFor(item, BACKGROUND_ENTERTAINMENT_OPTIONS)).join(", ")
        : "nothing specific yet";
    const featuredText =
      featuredEntertainment.length > 0
        ? featuredEntertainment.map((item) => labelFor(item, FEATURED_ENTERTAINMENT_OPTIONS)).join(", ")
        : "not yet decided";
    const avoidParts = [
      ...entertainmentAvoidTags.map((item) => labelFor(item, ENTERTAINMENT_AVOID_OPTIONS)),
      ...(entertainmentGenresToAvoid.trim() ? [entertainmentGenresToAvoid.trim()] : []),
    ];
    const avoidSentence =
      avoidParts.length > 0 ? ` Please avoid: ${avoidParts.join(", ")}.` : "";

    const participationLabel = labelFor(guestParticipationLevel, GUEST_PARTICIPATION_OPTIONS);
    const interactiveText =
      interactiveExperiences.length > 0
        ? interactiveExperiences.map((item) => labelFor(item, INTERACTIVE_EXPERIENCE_OPTIONS)).join(", ")
        : "no specific picks yet";
    const otherActivitiesSentence = otherGuestActivities.trim()
      ? ` They also mentioned: ${otherGuestActivities.trim()}.`
      : "";

    const techPurposeText =
      technologyBusinessPurpose.length > 0
        ? technologyBusinessPurpose.map((item) => labelFor(item, TECHNOLOGY_BUSINESS_PURPOSE_OPTIONS)).join(", ")
        : "not yet discussed";
    const techEnhancementsText =
      technologyEnhancements.length > 0
        ? technologyEnhancements.map((item) => labelFor(item, TECHNOLOGY_ENHANCEMENT_OPTIONS)).join(", ")
        : "none selected";
    const venueAwarenessLabel = labelFor(venueAwarenessStatus, VENUE_AWARENESS_OPTIONS);
    const venueAwarenessSentence =
      venueAwarenessStatus === "SOME_RESTRICTIONS_KNOWN" && venueAwarenessNotes.trim()
        ? ` Known venue considerations: ${venueAwarenessNotes.trim()}.`
        : "";

    const servicesText =
      valueAddedServices.length > 0
        ? valueAddedServices.map((item) => labelFor(item, VALUE_ADDED_SERVICE_OPTIONS)).join(", ")
        : "none requested yet";
    const serviceImportanceLabel = labelFor(serviceImportanceWeighting, WEIGHTING_OPTIONS);
    const ownershipLabel = labelFor(serviceOwnershipPreference, SERVICE_OWNERSHIP_OPTIONS);

    const signatureText =
      signatureExperience.length > 0
        ? signatureExperience.map((item) => labelFor(item, SIGNATURE_EXPERIENCE_OPTIONS)).join(", ")
        : "not yet shared";
    const priorityText = priorityExperience
      ? labelFor(priorityExperience, SIGNATURE_EXPERIENCE_OPTIONS)
      : "not singled out yet";
    const signatureNotesSentence = signatureExperienceNotes.trim()
      ? ` In their own words: "${signatureExperienceNotes.trim()}"`
      : "";

    return `### Experience Vision
The customer wants a "${atmosphereLabel}" atmosphere (${weightingLabel} priority), with guests best enjoying the event through "${engagementLabel}".

### Music & Performances
For background ambience, the customer is interested in ${backgroundText}. The featured entertainment highlight would be ${featuredText}.${avoidSentence}

### Guest Experiences
Guests are expected to engage as "${participationLabel}", with interest in ${interactiveText}.${otherActivitiesSentence}

### Experience Enhancements
Technology should mainly serve: ${techPurposeText}. Specific enhancements of interest: ${techEnhancementsText}. Venue awareness: "${venueAwarenessLabel}".${venueAwarenessSentence}

### Value-added Services
Requested add-on services: ${servicesText} (${serviceImportanceLabel} priority). Coordination preference: "${ownershipLabel}".

### Signature Experience
The customer hopes guests remember: ${signatureText}. If only one thing should stand out, it's: ${priorityText}.${signatureNotesSentence}`;
  }, [
    eventAtmosphere,
    eventAtmosphereWeighting,
    guestEngagementStyle,
    backgroundEntertainment,
    featuredEntertainment,
    entertainmentAvoidTags,
    entertainmentGenresToAvoid,
    guestParticipationLevel,
    interactiveExperiences,
    otherGuestActivities,
    technologyBusinessPurpose,
    technologyEnhancements,
    venueAwarenessStatus,
    venueAwarenessNotes,
    valueAddedServices,
    serviceImportanceWeighting,
    serviceOwnershipPreference,
    signatureExperience,
    priorityExperience,
    signatureExperienceNotes,
  ]);

  useEffect(() => {
    if (!isSummaryEdited) {
      setSummaryText(autoSummary);
    }
  }, [autoSummary, isSummaryEdited]);

  // Proposal-oriented only, never operational — and generated only when
  // supported by data the host actually captured during discovery.
  const suggestedActivities = useMemo(() => {
    const items: Array<{ priority: "URGENT" | "IMPORTANT" | "RECOMMENDATION"; text: string }> = [];

    if (backgroundEntertainment.length > 0 || featuredEntertainment.length > 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Mention the desired event atmosphere and experience vision when preparing the proposal.",
      });
    }

    if (
      serviceOwnershipPreference === "REQUEST_TEAM_HELP" ||
      serviceOwnershipPreference === "SHARED_COORDINATION"
    ) {
      items.push({
        priority: "IMPORTANT",
        text: "Note guest-service ownership preference when drafting the proposal.",
      });
    }

    if (entertainmentAvoidTags.length > 0 || entertainmentGenresToAvoid.trim()) {
      items.push({
        priority: "IMPORTANT",
        text: 'Include any "things to avoid" for entertainment or music as a proposal note.',
      });
    }

    if (venueAwarenessStatus === "SOME_RESTRICTIONS_KNOWN") {
      items.push({
        priority: "URGENT",
        text: "Carry forward any venue awareness flags as a proposal note for early attention.",
      });
    }

    if (validationStatus === "READY" && discussionStatus === "COMPLETE") {
      items.push({
        priority: "RECOMMENDATION",
        text: "Entertainment & Add-ons discovery ready for internal handover summary review.",
      });
    }

    if (items.length === 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Keep the conversation on entertainment vision for now — vendor booking and production planning come later.",
      });
    }

    return items;
  }, [
    backgroundEntertainment,
    featuredEntertainment,
    serviceOwnershipPreference,
    entertainmentAvoidTags,
    entertainmentGenresToAvoid,
    venueAwarenessStatus,
    validationStatus,
    discussionStatus,
  ]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);

    try {
      const payload: EntertainmentExperienceConversation = {
        eventAtmosphere,
        eventAtmosphereWeighting,
        guestEngagementStyle,
        backgroundEntertainment,
        featuredEntertainment,
        entertainmentAvoidTags,
        entertainmentGenresToAvoid: entertainmentGenresToAvoid || undefined,
        guestParticipationLevel,
        interactiveExperiences,
        otherGuestActivities: otherGuestActivities || undefined,
        technologyBusinessPurpose,
        technologyEnhancements,
        venueAwarenessStatus,
        venueAwarenessNotes: venueAwarenessNotes || undefined,
        valueAddedServices,
        serviceImportanceWeighting,
        serviceOwnershipPreference,
        signatureExperience,
        priorityExperience,
        signatureExperienceNotes: signatureExperienceNotes || undefined,
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
          areaKey: "ENTERTAINMENT_ADDONS",
          lifecycle: discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          validation: validationStatus,
          summary: summaryText,
          entertainmentExperience: payload,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save Entertainment & Add-ons discovery.");
        return;
      }

      setSuccessMessage("Entertainment & Add-ons discovery saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
      await Promise.resolve(onSaveSuccess(json?.overview));
    } catch (error) {
      console.error("Save Entertainment & Add-ons discovery error:", error);
      alert("Unexpected error while saving Entertainment & Add-ons discovery.");
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
                Area: Entertainment & Add-ons
              </span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-primary" />
              <span>Entertainment & Add-ons Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Let's talk about how your guests should be entertained and what would make the day memorable.
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
                Entertainment & Add-ons Discovery Progress
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
          {/* Card 1: Experience Vision */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Experience Vision</h3>
                <p className="text-xs text-muted-foreground">
                  What kind of overall atmosphere do you want your event to have?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EVENT_ATMOSPHERE_OPTIONS.map((item) => {
                  const active = eventAtmosphere === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEventAtmosphere(item.key)}
                      className={cardOptionClass(active)}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                          <Check className="w-2.5 h-2.5 stroke-3" />
                        </div>
                      )}
                      <div className="text-xs font-extrabold text-foreground pr-5">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Atmosphere Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = eventAtmosphereWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setEventAtmosphereWeighting(w.key)}
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
                  Guest Engagement Style
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Besides great food and hospitality, how would you like your guests to enjoy the event?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GUEST_ENGAGEMENT_STYLE_OPTIONS.map((item) => {
                  const active = guestEngagementStyle === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setGuestEngagementStyle(item.key)}
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

          {/* Card 2: Music & Performances */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Music & Performances</h3>
                <p className="text-xs text-muted-foreground">
                  What kind of music and performances would bring your event to life?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Background Entertainment
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BACKGROUND_ENTERTAINMENT_OPTIONS.map((item) => {
                  const active = backgroundEntertainment.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setBackgroundEntertainment((prev) => toggleArrayValue(prev, item.key))
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

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Featured Entertainment
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FEATURED_ENTERTAINMENT_OPTIONS.map((item) => {
                  const active = featuredEntertainment.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setFeaturedEntertainment((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Discovers interest only — no artist selection, vendor discussion, or booking happens here.
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Things to Avoid
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Is there any type of music or performance you'd prefer we avoid?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ENTERTAINMENT_AVOID_OPTIONS.map((item) => {
                  const active = entertainmentAvoidTags.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setEntertainmentAvoidTags((prev) => toggleArrayValue(prev, item.key))
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
                value={entertainmentGenresToAvoid}
                onChange={(e) => setEntertainmentGenresToAvoid(e.target.value)}
                placeholder="e.g. heavy metal, extremely loud EDM, explicit lyrics..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
            </div>
          </div>

          {/* Card 3: Interactive Guest Experiences */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Interactive Guest Experiences</h3>
                <p className="text-xs text-muted-foreground">How involved would you like your guests to be?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {GUEST_PARTICIPATION_OPTIONS.map((item) => {
                const active = guestParticipationLevel === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGuestParticipationLevel(item.key)}
                    className={`${cardOptionClass(active, "secondary")} p-3`}
                  >
                    <div className="text-xs font-extrabold text-foreground">{item.label}</div>
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
                  Interactive Experiences
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                What kind of interactive experiences would make your guests smile?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INTERACTIVE_EXPERIENCE_OPTIONS.map((item) => {
                  const active = interactiveExperiences.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setInteractiveExperiences((prev) => toggleArrayValue(prev, item.key))
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
                value={otherGuestActivities}
                onChange={(e) => setOtherGuestActivities(e.target.value)}
                placeholder="e.g. a caricature artist, a mehndi/henna station, a live painter..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
            </div>
          </div>

          {/* Card 4: Technology & Event Enhancements */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Technology & Event Enhancements</h3>
                <p className="text-xs text-muted-foreground">
                  What's the main purpose you'd like technology to serve at your event?
                </p>
              </div>
            </div>

            <div className="bg-muted/10 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Business Purpose
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TECHNOLOGY_BUSINESS_PURPOSE_OPTIONS.map((item) => {
                  const active = technologyBusinessPurpose.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setTechnologyBusinessPurpose((prev) => toggleArrayValue(prev, item.key))
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

            <div className="bg-muted/10 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Technology Enhancements
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Would you like any technology touches to elevate the experience?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TECHNOLOGY_ENHANCEMENT_OPTIONS.map((item) => {
                  const active = technologyEnhancements.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setTechnologyEnhancements((prev) => toggleArrayValue(prev, item.key))
                      }
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Discovery only — no AV production planning or equipment scheduling happens here.
              </p>
            </div>

            <div className="bg-muted/10 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Venue Awareness (Discovery Only)
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Is there anything about your venue we should be aware of that might affect these ideas — like space, power access, or timing restrictions?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VENUE_AWARENESS_OPTIONS.map((item) => {
                  const active = venueAwarenessStatus === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setVenueAwarenessStatus(item.key)}
                      className={chipClass(active)}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {venueAwarenessStatus === "SOME_RESTRICTIONS_KNOWN" && (
                <textarea
                  rows={2}
                  value={venueAwarenessNotes}
                  onChange={(e) => setVenueAwarenessNotes(e.target.value)}
                  placeholder="e.g. sound curfew after 11 PM, limited power access near the stage area..."
                  className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
                />
              )}
              <p className="text-[10px] text-muted-foreground italic">
                This is awareness only, not a technical feasibility assessment.
              </p>
            </div>
          </div>

          {/* Card 5: Value-added Guest Services */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Value-added Guest Services</h3>
                <p className="text-xs text-muted-foreground">
                  Are there any additional guest services you'd like us to help arrange?
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {VALUE_ADDED_SERVICE_OPTIONS.map((item) => {
                  const active = valueAddedServices.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setValueAddedServices((prev) => toggleArrayValue(prev, item.key))
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
                  Service Importance
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = serviceImportanceWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setServiceImportanceWeighting(w.key)}
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

            <div className="pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Service Ownership
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Who do you expect to coordinate these experience services?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_OWNERSHIP_OPTIONS.map((item) => {
                  const active = serviceOwnershipPreference === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setServiceOwnershipPreference(item.key)}
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

          {/* Card 6: Signature Guest Experience — also the emotional close of the workspace */}
          <div className="mt-2 bg-linear-to-br from-primary/12 via-primary/5 to-card border-2 border-primary/35 rounded-2xl p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black text-xs shrink-0">
                6
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Quote className="w-5 h-5 text-primary" />
                  <span>Signature Guest Experience</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  One last, reflective question to close the conversation.
                </p>
              </div>
            </div>

            <p className="text-lg font-bold text-foreground leading-snug pl-1">
              "Years from now, when your guests remember this celebration, what's the one moment you want them to carry with them forever?"
            </p>

            <div className="flex flex-wrap gap-1.5">
              {SIGNATURE_EXPERIENCE_OPTIONS.map((item) => {
                const active = signatureExperience.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSignatureExperience((prev) => toggleArrayValue(prev, item.key))}
                    className={chipClass(active)}
                  >
                    {active && <Check className="w-3 h-3 stroke-3" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-primary/20 space-y-2">
              <p className="text-sm font-bold text-foreground leading-snug">
                "If you could invest extra attention in only one memorable experience, what would it be?"
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                Captures the customer's single priority only — no weighting, no influence on pricing or resource allocation.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SIGNATURE_EXPERIENCE_OPTIONS.map((item) => {
                  const active = priorityExperience === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setPriorityExperience((prev) => (prev === item.key ? undefined : item.key))
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

            <div className="pt-4 border-t border-primary/20 space-y-2">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-primary/70" />
                <p className="text-sm font-bold text-foreground leading-snug">
                  In their own words — optional
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                If they'd like to describe the memory in their own words, capture it here verbatim.
              </p>
              <textarea
                rows={3}
                value={signatureExperienceNotes}
                onChange={(e) => setSignatureExperienceNotes(e.target.value)}
                placeholder='e.g. "Everyone still talks about how the live band had the whole family dancing together."'
                className={`w-full text-sm bg-background border border-primary/30 rounded-xl p-3 leading-relaxed ${FOCUS_RING}`}
              />
            </div>
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
              Entertainment Discovery
            </span>
          </div>

          <div className="bg-linear-to-br from-amber-500/5 via-amber-500/2 to-card border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Entertainment Discussion Tips</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Music className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Ask how guests should feel and what they'll enjoy — not which artists or vendors to book.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Treat venue awareness notes as context for later — technical and production planning come with Operations.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  The closing question often surfaces what the host truly cares about — capture it in their own words.
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
