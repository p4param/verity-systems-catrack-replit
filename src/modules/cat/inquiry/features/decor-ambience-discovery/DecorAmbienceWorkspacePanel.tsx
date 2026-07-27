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
  Image as ImageIcon,
  Lock,
  Lightbulb,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  BusinessValidationStatus,
  ColorPaletteStyle,
  DecorAmbienceConversation,
  DecorFocusAreaType,
  DiscoveryArea,
  DiscussionStatus,
  EmotionalAmbienceVibe,
  FloralPreferenceType,
  GuestMemoryVisionType,
  InspirationReferenceType,
  InquiryDiscoveryOverview,
  LightingAtmosphereType,
  PreferenceImportanceWeighting,
  PreExistingAssetTag,
  SalesAssessmentConfidence,
  SiteVisitStatusType,
  ThemeConceptType,
  VenueRestrictionRule,
  VenueRestrictionStatus,
  VisualExecutionStyle,
  computeDecorAmbienceValidation,
} from "@/modules/cat/inquiry/domain/discovery-types";

interface DecorAmbienceWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const EMOTIONAL_VIBES: {
  key: EmotionalAmbienceVibe;
  label: string;
  desc: string;
}[] = [
  {
    key: "ROYAL_REGAL",
    label: "Royal & Regal",
    desc: "Grand and majestic decor energy",
  },
  {
    key: "WARM_INVITING_WELCOMING",
    label: "Warm & Inviting",
    desc: "Comfort-first ambience with welcoming textures",
  },
  {
    key: "ELEGANT_SOPHISTICATED",
    label: "Elegant & Sophisticated",
    desc: "Refined premium aesthetic with subtle richness",
  },
  {
    key: "JOYFUL_FESTIVE_CELEBRATORY",
    label: "Joyful & Celebratory",
    desc: "High-energy festive and colorful mood",
  },
  {
    key: "DRAMATIC_GLAMOROUS",
    label: "Dramatic & Glamorous",
    desc: "Bold, high-contrast and statement-rich atmosphere",
  },
];

const LIGHTING_OPTIONS: {
  key: LightingAtmosphereType;
  label: string;
  desc: string;
}[] = [
  {
    key: "WARM_CANDLELIGHT_SOFT",
    label: "Warm Candlelight / Soft Glow",
    desc: "Intimate warm lighting with mellow highlights",
  },
  {
    key: "DYNAMIC_THEMATIC_LIGHTING",
    label: "Dynamic Thematic Lighting",
    desc: "Programmable color scenes aligned to the event mood",
  },
  {
    key: "NATURAL_DAYLIGHT_OPEN",
    label: "Natural Daylight Open Feel",
    desc: "Bright, airy, open visual experience",
  },
  {
    key: "DRAMATIC_SPOTLIGHT_HIGH_CONTRAST",
    label: "Dramatic Spotlight Contrast",
    desc: "Stage-centric and impact-focused contrast lighting",
  },
];

const THEME_OPTIONS: { key: ThemeConceptType; label: string; desc: string }[] =
  [
    {
      key: "TRADITIONAL_HERITAGE",
      label: "Traditional Heritage",
      desc: "Cultural motifs, classic textures, ceremonial accents",
    },
    {
      key: "FLORAL_GARDEN_DREAM",
      label: "Floral Garden Dream",
      desc: "Fresh floral storytelling with lush layered decor",
    },
    {
      key: "MODERN_CHIC_GEOMETRIC",
      label: "Modern Chic Geometric",
      desc: "Clean forms, geometric lines, design-led composition",
    },
    {
      key: "VINTAGE_ELEGANCE",
      label: "Vintage Elegance",
      desc: "Antique-inspired sophistication with nostalgic detailing",
    },
    {
      key: "FUSION_BOHEMIAN",
      label: "Fusion Bohemian",
      desc: "Eclectic, free-form textures with handcrafted personality",
    },
  ];

const VISUAL_STYLE_OPTIONS: { key: VisualExecutionStyle; label: string }[] = [
  { key: "GRAND_OPULENT", label: "Grand & Opulent" },
  { key: "SUBTLE_MINIMALIST", label: "Subtle Minimalist" },
  { key: "RUSTIC_ORGANIC", label: "Rustic Organic" },
];

const PALETTE_OPTIONS: { key: ColorPaletteStyle; label: string }[] = [
  { key: "PASTELS_AND_SOFT_NEUTRALS", label: "Pastels & Soft Neutrals" },
  { key: "ROYAL_GOLD_AND_DEEP_RED", label: "Royal Gold & Deep Red" },
  { key: "EMERALD_IVORY_AND_GOLD", label: "Emerald, Ivory & Gold" },
  { key: "MONOCHROMATIC_SLEEK", label: "Monochromatic Sleek" },
  { key: "CUSTOM_BRAND_PALETTE", label: "Custom Brand Palette" },
];

const GUEST_MEMORY_OPTIONS: {
  key: GuestMemoryVisionType;
  label: string;
  desc: string;
}[] = [
  {
    key: "GRAND_ENTRANCE_IMPACT",
    label: "Grand Entrance Impact",
    desc: "Guests should be wowed from the first step in",
  },
  {
    key: "STAGE_BACKDROP_BEAUTY",
    label: "Stage Backdrop Beauty",
    desc: "Primary visual memory should center around the stage",
  },
  {
    key: "CATERING_DINING_EXPERIENCE",
    label: "Dining Experience Aesthetic",
    desc: "Memorable buffet and dining visual storytelling",
  },
  {
    key: "BREATHTAKING_FLORAL_ARTISTRY",
    label: "Floral Artistry Impact",
    desc: "Floral installations should be the signature memory",
  },
  {
    key: "LUXURY_AMBIENCE_LIGHTING",
    label: "Luxury Lighting Atmosphere",
    desc: "Lighting mood should define the overall event memory",
  },
];

const FOCUS_AREA_OPTIONS: { key: DecorFocusAreaType; label: string }[] = [
  { key: "BUFFET_CATERING_STYLING", label: "Buffet & Catering Styling" },
  { key: "ENTRANCE_AND_WALKWAY", label: "Entrance & Walkway" },
  { key: "STAGE_AND_MAIN_BACKDROP", label: "Stage & Main Backdrop" },
  { key: "GUEST_DINING_TABLES", label: "Guest Dining Tables" },
  { key: "PHOTO_BOOTH_EXPERIENCE", label: "Photo Booth Experience" },
];

const FLORAL_OPTIONS: {
  key: FloralPreferenceType;
  label: string;
  desc: string;
}[] = [
  {
    key: "FRESH_FLOWERS_ONLY",
    label: "Fresh Flowers Only",
    desc: "Natural florals only",
  },
  {
    key: "ARTIFICIAL_SILK_FLORALS",
    label: "Artificial / Silk Florals",
    desc: "Durability and weather reliability",
  },
  {
    key: "MIXED_FRESH_AND_SILK",
    label: "Mixed Fresh + Silk",
    desc: "Balanced visual quality and practicality",
  },
  {
    key: "MINIMAL_GREENERY",
    label: "Minimal Greenery",
    desc: "Low floral density aesthetic",
  },
  {
    key: "HEAVY_FLORAL_INSTALLATIONS",
    label: "Heavy Floral Installations",
    desc: "High-coverage floral expression",
  },
];

const WEIGHTING_OPTIONS: {
  key: PreferenceImportanceWeighting;
  label: string;
}[] = [
  { key: "ESSENTIAL", label: "Must Have" },
  { key: "PREFERRED", label: "Preferred" },
  { key: "OPTIONAL", label: "Nice to Have" },
];

const PRE_EXISTING_ASSET_OPTIONS: {
  key: PreExistingAssetTag;
  label: string;
}[] = [
  { key: "VENUE_LED_WALL_PROVIDED", label: "Venue LED Wall Provided" },
  { key: "HOST_BRANDING_PROPS", label: "Host Branding Props Available" },
  {
    key: "VENUE_FURNITURE_IN_PLACE",
    label: "Venue Furniture Already In Place",
  },
  {
    key: "HOST_CULTURAL_MANDAP_FRAME",
    label: "Host Cultural Mandap Frame Available",
  },
  {
    key: "NONE_ALL_CATERER_DECOR",
    label: "No Existing Assets (All Decor by Caterer)",
  },
];

const VENUE_ASSET_KEYS: PreExistingAssetTag[] = [
  "VENUE_LED_WALL_PROVIDED",
  "VENUE_FURNITURE_IN_PLACE",
];

const HOST_ASSET_KEYS: PreExistingAssetTag[] = [
  "HOST_BRANDING_PROPS",
  "HOST_CULTURAL_MANDAP_FRAME",
];

const VENUE_RESTRICTION_OPTIONS: {
  key: VenueRestrictionRule;
  label: string;
}[] = [
  { key: "OPEN_FLAME_RESTRICTIONS", label: "Open Flame Restrictions" },
  { key: "HANGING_WEIGHT_LIMITS", label: "Hanging Weight Limits" },
  { key: "SHORT_SETUP_WINDOW", label: "Short Setup Window" },
  { key: "OUTDOOR_WEATHER_SAFEGUARDS", label: "Outdoor Weather Safeguards" },
  { key: "STRICT_TAKEDOWN_DEADLINE", label: "Strict Takedown Deadline" },
];

const AVOIDED_DECOR_ELEMENTS = [
  "Balloon-heavy styling",
  "Neon signage",
  "Mirror-heavy decor",
  "Over-saturated color combinations",
  "Large hanging chandeliers",
  "Strong fragrance florals",
];

const INSPIRATION_REF_TYPE_OPTIONS: {
  key: InspirationReferenceType;
  label: string;
}[] = [
  { key: "IMAGES", label: "Images" },
  { key: "VIDEOS", label: "Videos" },
  { key: "MOOD_BOARDS", label: "Mood Boards" },
  { key: "VENUE_REFERENCE_PHOTOS", label: "Venue Photos" },
];

type InspirationUiOption =
  | "PHOTOS"
  | "PINTEREST"
  | "INSTAGRAM"
  | "MOOD_BOARD"
  | "NONE";

const INSPIRATION_UI_OPTIONS: { key: InspirationUiOption; label: string }[] = [
  { key: "PHOTOS", label: "Photos" },
  { key: "PINTEREST", label: "Pinterest" },
  { key: "INSTAGRAM", label: "Instagram" },
  { key: "MOOD_BOARD", label: "Mood Board" },
  { key: "NONE", label: "None" },
];

const SPECIAL_HIGHLIGHT_PRESETS = [
  "Signature floral tunnel",
  "Statement stage centerpiece",
  "Ambient pathway lighting",
  "Custom welcome installation",
  "Photo-op storytelling corner",
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

function siteVisitLabel(value: SiteVisitStatusType): string {
  if (value === "REQUIRED") return "Needs Site Visit";
  if (value === "ALREADY_VISITED") return "Already Completed";
  return "Not Required";
}

function restrictionStatusLabel(value: VenueRestrictionStatus): string {
  if (value === "YES_RESTRICTIONS") return "Yes, There Are Restrictions";
  if (value === "NO_KNOWN_RESTRICTIONS") return "No Restrictions We Know Of";
  return "Not Sure Yet";
}

// Shared selection-state treatments so every chip/card in this workspace
// reads consistently, matching the pattern established in the Budget &
// Commercial and Food & Beverage discovery workspaces.
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

const CHIP_SELECTED_ROSE =
  "bg-rose-500/15 border-rose-500/40 text-rose-800 shadow-xs ring-2 ring-rose-500/20";

const CHIP_SELECTED_EMERALD =
  "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20";

function chipClass(active: boolean, variant: "default" | "rose" | "emerald" = "default"): string {
  const base = "text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition-all duration-150 cursor-pointer inline-flex items-center gap-1";
  const selected =
    variant === "rose" ? CHIP_SELECTED_ROSE : variant === "emerald" ? CHIP_SELECTED_EMERALD : CHIP_SELECTED;
  return `${base} ${active ? selected : CHIP_UNSELECTED} ${FOCUS_RING}`;
}

export default function DecorAmbienceWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
}: DecorAmbienceWorkspacePanelProps) {
  const savedDa = initialArea?.decorAmbience;

  const [emotionalVibe, setEmotionalVibe] = useState<EmotionalAmbienceVibe>(
    savedDa?.emotionalVibe || "ELEGANT_SOPHISTICATED",
  );
  const [lightingAtmosphere, setLightingAtmosphere] =
    useState<LightingAtmosphereType>(
      savedDa?.lightingAtmosphere || "WARM_CANDLELIGHT_SOFT",
    );
  const [lightingWeighting, setLightingWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedDa?.lightingWeighting || "ESSENTIAL",
    );

  const [themeConcept, setThemeConcept] = useState<ThemeConceptType>(
    savedDa?.themeConcept || "FLORAL_GARDEN_DREAM",
  );
  const [themeWeighting, setThemeWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedDa?.themeWeighting || "PREFERRED",
    );
  const [visualStyle, setVisualStyle] = useState<VisualExecutionStyle>(
    savedDa?.visualStyle || "GRAND_OPULENT",
  );
  const [colorPalette, setColorPalette] = useState<ColorPaletteStyle>(
    savedDa?.colorPalette || "PASTELS_AND_SOFT_NEUTRALS",
  );
  const [colorWeighting, setColorWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedDa?.colorWeighting || "PREFERRED",
    );
  const [dominantColors, setDominantColors] = useState<string[]>(
    savedDa?.dominantColors || ["Ivory", "Gold"],
  );
  const [avoidedColors, setAvoidedColors] = useState<string[]>(
    savedDa?.avoidedColors || [],
  );

  const [guestMemoryVision, setGuestMemoryVision] =
    useState<GuestMemoryVisionType>(
      savedDa?.guestMemoryVision || "GRAND_ENTRANCE_IMPACT",
    );
  const [primaryFocusArea, setPrimaryFocusArea] = useState<DecorFocusAreaType>(
    savedDa?.primaryFocusArea || "STAGE_AND_MAIN_BACKDROP",
  );
  const [primaryFocusWeighting, setPrimaryFocusWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedDa?.primaryFocusWeighting || "ESSENTIAL",
    );
  const [secondaryFocusAreas, setSecondaryFocusAreas] = useState<
    DecorFocusAreaType[]
  >(savedDa?.secondaryFocusAreas || ["ENTRANCE_AND_WALKWAY"]);
  const [rankedFocusAreas, setRankedFocusAreas] = useState<
    DecorFocusAreaType[]
  >(savedDa?.rankedFocusAreas || []);

  const [floralPreference, setFloralPreference] =
    useState<FloralPreferenceType>(
      savedDa?.floralPreference || "MIXED_FRESH_AND_SILK",
    );
  const [floralWeighting, setFloralWeighting] =
    useState<PreferenceImportanceWeighting>(
      savedDa?.floralWeighting || "PREFERRED",
    );
  const [inspirationSources, setInspirationSources] = useState<string[]>(
    savedDa?.inspirationSources || [],
  );
  const [hasInspirationReferences, setHasInspirationReferences] =
    useState<boolean>(savedDa?.hasInspirationReferences ?? false);
  const [inspirationRefTypes, setInspirationRefTypes] = useState<
    InspirationReferenceType[]
  >(savedDa?.inspirationRefTypes || []);
  const [inspirationNotes, setInspirationNotes] = useState<string>(
    savedDa?.inspirationNotes || "",
  );
  const [avoidedElements, setAvoidedElements] = useState<string[]>(
    savedDa?.avoidedElements || [],
  );

  const [preExistingAssets, setPreExistingAssets] = useState<
    PreExistingAssetTag[]
  >(savedDa?.preExistingAssets || ["NONE_ALL_CATERER_DECOR"]);
  const [venueRestrictionStatus, setVenueRestrictionStatus] =
    useState<VenueRestrictionStatus>(
      savedDa?.venueRestrictionStatus || "NOT_SURE_YET",
    );
  const [venueRestrictions, setVenueRestrictions] = useState<
    VenueRestrictionRule[]
  >(savedDa?.venueRestrictions || []);
  const [siteVisitStatus, setSiteVisitStatus] = useState<SiteVisitStatusType>(
    savedDa?.siteVisitStatus || "NOT_REQUIRED",
  );
  const [logisticsNotes, setLogisticsNotes] = useState<string>(
    savedDa?.logisticsNotes || "",
  );

  const [specialHighlights, setSpecialHighlights] = useState<string[]>(
    savedDa?.specialHighlights || [],
  );
  const [salesAssessment, setSalesAssessment] = useState<
    SalesAssessmentConfidence | undefined
  >(savedDa?.salesAssessment);

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedDa?.discussionStatus || "CONTINUE_LATER",
  );

  const [summaryText, setSummaryText] = useState<string>(
    savedDa?.businessSummary || "",
  );
  const [isSummaryEdited, setIsSummaryEdited] = useState<boolean>(
    savedDa?.isSummaryManuallyEdited || false,
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const ordered = [
      primaryFocusArea,
      ...secondaryFocusAreas.filter((item) => item !== primaryFocusArea),
    ];
    if (ordered.join("|") !== rankedFocusAreas.join("|")) {
      setRankedFocusAreas(ordered);
    }
  }, [primaryFocusArea, secondaryFocusAreas, rankedFocusAreas]);

  const validationStatus: BusinessValidationStatus = useMemo(() => {
    return computeDecorAmbienceValidation({
      emotionalVibe,
      lightingAtmosphere,
      themeConcept,
      colorPalette,
      guestMemoryVision,
      primaryFocusArea,
      floralPreference,
      venueRestrictionStatus,
      preExistingAssets,
      venueRestrictions,
    });
  }, [
    emotionalVibe,
    lightingAtmosphere,
    themeConcept,
    colorPalette,
    guestMemoryVision,
    primaryFocusArea,
    floralPreference,
    venueRestrictionStatus,
    preExistingAssets,
    venueRestrictions,
  ]);

  const isDiscoveryReady =
    discussionStatus === "COMPLETE" && validationStatus === "READY";

  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (emotionalVibe && lightingAtmosphere) completed++;
    if (themeConcept && colorPalette) completed++;
    if (guestMemoryVision && primaryFocusArea) completed++;
    if (floralPreference) completed++;
    if (preExistingAssets.length > 0) completed++;
    if (
      venueRestrictionStatus !== "YES_RESTRICTIONS" ||
      venueRestrictions.length > 0
    )
      completed++;
    const percentage = Math.round((completed / 6) * 100);
    return { completed, total: 6, percentage };
  }, [
    emotionalVibe,
    lightingAtmosphere,
    themeConcept,
    colorPalette,
    guestMemoryVision,
    primaryFocusArea,
    floralPreference,
    preExistingAssets,
    venueRestrictionStatus,
    venueRestrictions,
  ]);

  const designPrioritySummary = useMemo(() => {
    const lines = [
      `Lighting: ${labelFor(lightingWeighting, WEIGHTING_OPTIONS)}`,
      `Theme: ${labelFor(themeWeighting, WEIGHTING_OPTIONS)}`,
      `Color: ${labelFor(colorWeighting, WEIGHTING_OPTIONS)}`,
      `Primary Focus (${labelFor(primaryFocusArea, FOCUS_AREA_OPTIONS)}): ${labelFor(primaryFocusWeighting, WEIGHTING_OPTIONS)}`,
      `Floral: ${labelFor(floralWeighting, WEIGHTING_OPTIONS)}`,
    ];
    return lines;
  }, [
    lightingWeighting,
    themeWeighting,
    colorWeighting,
    primaryFocusArea,
    primaryFocusWeighting,
    floralWeighting,
  ]);

  const autoSummary = useMemo(() => {
    const dominantColorText =
      dominantColors.length > 0
        ? dominantColors.join(", ")
        : "To be discovered";
    const avoidedColorText =
      avoidedColors.length > 0 ? avoidedColors.join(", ") : "None specified";
    const rankedAreasText =
      rankedFocusAreas.length > 0
        ? rankedFocusAreas
            .map(
              (item, index) =>
                `${index + 1}. ${labelFor(item, FOCUS_AREA_OPTIONS)}`,
            )
            .join(" | ")
        : "Primary focus only";
    const assetText = preExistingAssets
      .map((item) => labelFor(item, PRE_EXISTING_ASSET_OPTIONS))
      .join(", ");
    const inspirationSourceText =
      inspirationSources.length > 0
        ? inspirationSources.join(", ")
        : "Not available yet";
    const restrictionText =
      venueRestrictionStatus === "YES_RESTRICTIONS"
        ? venueRestrictions
            .map((item) => labelFor(item, VENUE_RESTRICTION_OPTIONS))
            .join(", ") || "Restrictions to be confirmed"
        : venueRestrictionStatus === "NO_KNOWN_RESTRICTIONS"
          ? "No known restrictions"
          : "Restrictions pending confirmation";

    return `### Overall Ambience Direction
- **Emotional Vibe**: ${labelFor(emotionalVibe, EMOTIONAL_VIBES)}
- **Lighting Atmosphere**: 💡 ${labelFor(lightingAtmosphere, LIGHTING_OPTIONS)} (${labelFor(lightingWeighting, WEIGHTING_OPTIONS)})

### Theme, Palette & Visual Language
- **Theme Concept**: 🎨 ${labelFor(themeConcept, THEME_OPTIONS)} (${labelFor(themeWeighting, WEIGHTING_OPTIONS)})
- **Visual Style**: ${labelFor(visualStyle, VISUAL_STYLE_OPTIONS)}
- **Palette**: ${labelFor(colorPalette, PALETTE_OPTIONS)} (${labelFor(colorWeighting, WEIGHTING_OPTIONS)})
- **Dominant Colors**: ${dominantColorText}
- **Avoided Colors**: ${avoidedColorText}

### Guest Memory Vision
- **Guest Memory Goal**: ${labelFor(guestMemoryVision, GUEST_MEMORY_OPTIONS)}
- **Focus Ranking**: 🎯 ${rankedAreasText}

### Decor Assets, References & Constraints
- **Floral Preference**: 🌸 ${labelFor(floralPreference, FLORAL_OPTIONS)} (${labelFor(floralWeighting, WEIGHTING_OPTIONS)})
- **Pre-existing Assets**: ${assetText}
- **Inspiration References**: ${hasInspirationReferences ? inspirationRefTypes.map((item) => labelFor(item, INSPIRATION_REF_TYPE_OPTIONS)).join(", ") || "Present" : "Not available yet"}
- **Inspiration Sources**: ${inspirationSourceText}
- **Venue Restrictions**: ${restrictionText}
- **Site Visit**: ${siteVisitLabel(siteVisitStatus)}

### Design Priorities
${designPrioritySummary.map((line) => `- ${line}`).join("\n")}

### Discovery Boundaries (Preserved)
- No CAD, no 3D rendering, no BOQ.
- No vendor allocation, no pricing, no execution planning.`;
  }, [
    emotionalVibe,
    lightingAtmosphere,
    lightingWeighting,
    themeConcept,
    themeWeighting,
    visualStyle,
    colorPalette,
    colorWeighting,
    dominantColors,
    avoidedColors,
    guestMemoryVision,
    rankedFocusAreas,
    floralPreference,
    floralWeighting,
    preExistingAssets,
    hasInspirationReferences,
    inspirationRefTypes,
    inspirationSources,
    venueRestrictionStatus,
    venueRestrictions,
    siteVisitStatus,
    designPrioritySummary,
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

    if (discussionStatus === "CONTINUE_LATER") {
      items.push({
        priority: "IMPORTANT",
        text: "Confirm the top two ranked focus areas with the host before your next call.",
      });
    }

    if (hasInspirationReferences && inspirationRefTypes.length === 0) {
      items.push({
        priority: "IMPORTANT",
        text: "Ask the host to share their references so you can tag the type (photos, video, mood board, venue shots).",
      });
    }

    if (
      venueRestrictionStatus === "YES_RESTRICTIONS" &&
      venueRestrictions.length === 0
    ) {
      items.push({
        priority: "URGENT",
        text: "Pin down the exact venue restrictions now to avoid setup surprises later.",
      });
    }

    if (siteVisitStatus === "REQUIRED") {
      items.push({
        priority: "IMPORTANT",
        text: "Book the decor walk-through before handover notes go out.",
      });
    }

    if (preExistingAssets.includes("NONE_ALL_CATERER_DECOR")) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Let the ops team know every decor element will need to be sourced fresh for this event.",
      });
    }

    if (validationStatus === "READY" && discussionStatus === "COMPLETE") {
      items.push({
        priority: "RECOMMENDATION",
        text: "Proceed to internal handover — no further decor discovery input needed.",
      });
    }

    if (items.length === 0) {
      items.push({
        priority: "RECOMMENDATION",
        text: "Keep the conversation on visual intent for now — execution and vendor details come later.",
      });
    }

    return items;
  }, [
    discussionStatus,
    hasInspirationReferences,
    inspirationRefTypes,
    venueRestrictionStatus,
    venueRestrictions,
    siteVisitStatus,
    preExistingAssets,
    validationStatus,
  ]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);

    try {
      const payload: DecorAmbienceConversation = {
        emotionalVibe,
        lightingAtmosphere,
        lightingWeighting,
        themeConcept,
        themeWeighting,
        visualStyle,
        colorPalette,
        colorWeighting,
        dominantColors,
        avoidedColors,
        guestMemoryVision,
        primaryFocusArea,
        primaryFocusWeighting,
        secondaryFocusAreas,
        rankedFocusAreas,
        floralPreference,
        floralWeighting,
        inspirationSources,
        hasInspirationReferences,
        inspirationRefTypes,
        specialHighlights,
        avoidedElements,
        inspirationNotes: inspirationNotes || undefined,
        preExistingAssets,
        venueRestrictionStatus,
        venueRestrictions,
        siteVisitStatus,
        logisticsNotes: logisticsNotes || undefined,
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
          areaKey: "DECOR_AMBIENCE",
          lifecycle:
            discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          validation: validationStatus,
          summary: summaryText,
          decorAmbience: payload,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save Decor & Ambience discovery.");
        return;
      }

      setSuccessMessage("Decor & Ambience discovery saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
      await Promise.resolve(onSaveSuccess(json?.overview));
    } catch (error) {
      console.error("Save Decor & Ambience discovery error:", error);
      alert("Unexpected error while saving Decor & Ambience discovery.");
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
                Area: Decor & Ambience
              </span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <span>Decor & Ambience Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Let's shape the look, feel and atmosphere your guests will remember.
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
                Decor & Ambience Discovery Progress
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
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Overall Ambience & Lighting
                </h3>
                <p className="text-xs text-muted-foreground">
                  Let's set the emotional tone and lighting mood your guests will feel.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Ambience
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EMOTIONAL_VIBES.map((item) => {
                  const active = emotionalVibe === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEmotionalVibe(item.key)}
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
            </div>

            <div className="pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Lighting
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <label className="text-xs font-bold text-foreground block">
                Lighting Atmosphere
              </label>
              <div className="grid grid-cols-1 gap-2">
                {LIGHTING_OPTIONS.map((item) => {
                  const active = lightingAtmosphere === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setLightingAtmosphere(item.key)}
                      className={`${cardOptionClass(active, "secondary")} p-3 rounded-xl text-xs`}
                    >
                      <div className="font-extrabold">{item.label}</div>
                      <div className="text-[11px] mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Lighting Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = lightingWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setLightingWeighting(w.key)}
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
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Theme, Palette & Visual Language
                </h3>
                <p className="text-xs text-muted-foreground">
                  Let's shape the visual language — theme, style and colour direction.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Creative Direction
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEME_OPTIONS.map((item) => {
                    const active = themeConcept === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setThemeConcept(item.key)}
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
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {VISUAL_STYLE_OPTIONS.map((item) => {
                    const active = visualStyle === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setVisualStyle(item.key)}
                        className={`text-xs font-extrabold px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                          active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Colour Direction
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Palette
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PALETTE_OPTIONS.map((item) => {
                    const active = colorPalette === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setColorPalette(item.key)}
                        className={`text-xs font-extrabold text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                          active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    Preferred Colours
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ivory, Gold"
                    value={dominantColors.join(", ")}
                    onChange={(e) =>
                      setDominantColors(
                        e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      )
                    }
                    className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    Colours to Avoid
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Neon Green"
                    value={avoidedColors.join(", ")}
                    onChange={(e) =>
                      setAvoidedColors(
                        e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      )
                    }
                    className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Weighting
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground pr-0.5">
                    Theme
                  </span>
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = themeWeighting === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setThemeWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground pr-0.5">
                    Colour
                  </span>
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = colorWeighting === w.key;
                    return (
                      <button
                        key={`${w.key}-color`}
                        type="button"
                        onClick={() => setColorWeighting(w.key)}
                        className={chipClass(active)}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground italic block pt-0.5">
                  This helps us understand which preferences matter most.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Guest Experience
                </h3>
                <p className="text-xs text-muted-foreground">
                  When your guests leave, what do you hope they remember most?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GUEST_MEMORY_OPTIONS.map((item) => {
                const active = guestMemoryVision === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGuestMemoryVision(item.key)}
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

            <div className="space-y-3 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Focus Priorities
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Primary Focus Area
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FOCUS_AREA_OPTIONS.map((item) => {
                    const active = primaryFocusArea === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPrimaryFocusArea(item.key)}
                        className={`text-xs font-extrabold text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                          active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Focus Priority
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {WEIGHTING_OPTIONS.map((w) => {
                      const active = primaryFocusWeighting === w.key;
                      return (
                        <button
                          key={`pf-${w.key}`}
                          type="button"
                          onClick={() => setPrimaryFocusWeighting(w.key)}
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

              <div className="space-y-1 pt-2">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Secondary Focus Areas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FOCUS_AREA_OPTIONS.filter(
                    (item) => item.key !== primaryFocusArea,
                  ).map((item) => {
                    const active = secondaryFocusAreas.includes(item.key);
                    return (
                      <button
                        key={`secondary-${item.key}`}
                        type="button"
                        onClick={() =>
                          setSecondaryFocusAreas((prev) =>
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

              <div className="space-y-1 pt-2 border-t border-border/40">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Ranked Focus Sequence
                </label>
                <div className="space-y-1">
                  {rankedFocusAreas.map((item, idx) => (
                    <div
                      key={`rank-${item}`}
                      className="flex items-center justify-between p-2 rounded-xl border border-border/40 bg-muted/20 text-xs"
                    >
                      <span className="font-semibold">
                        {idx + 1}. {labelFor(item, FOCUS_AREA_OPTIONS)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            const updated = [...rankedFocusAreas];
                            [updated[idx - 1], updated[idx]] = [
                              updated[idx],
                              updated[idx - 1],
                            ];
                            setRankedFocusAreas(updated);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors ${FOCUS_RING}`}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={idx === rankedFocusAreas.length - 1}
                          onClick={() => {
                            if (idx === rankedFocusAreas.length - 1) return;
                            const updated = [...rankedFocusAreas];
                            [updated[idx + 1], updated[idx]] = [
                              updated[idx],
                              updated[idx + 1],
                            ];
                            setRankedFocusAreas(updated);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors ${FOCUS_RING}`}
                        >
                          Down
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Floral, Inspiration & Avoid List
                </h3>
                <p className="text-xs text-muted-foreground">
                  Let's talk florals, references, and anything you'd rather we avoid.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Floral Direction
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FLORAL_OPTIONS.map((item) => {
                  const active = floralPreference === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFloralPreference(item.key)}
                      className={`${cardOptionClass(active, "secondary")} p-3 rounded-xl`}
                    >
                      <div className="text-xs font-extrabold text-foreground">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Floral Priority
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WEIGHTING_OPTIONS.map((w) => {
                    const active = floralWeighting === w.key;
                    return (
                      <button
                        key={`fl-${w.key}`}
                        type="button"
                        onClick={() => setFloralWeighting(w.key)}
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
                  Inspiration References
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_UI_OPTIONS.map((item) => {
                  const selected =
                    item.key === "NONE"
                      ? !hasInspirationReferences
                      : item.key === "PHOTOS"
                        ? inspirationRefTypes.includes("IMAGES")
                        : item.key === "MOOD_BOARD"
                          ? inspirationRefTypes.includes("MOOD_BOARDS")
                          : item.key === "PINTEREST"
                            ? inspirationSources.includes("Pinterest") ||
                              inspirationSources.includes("Pinterest boards")
                            : inspirationSources.includes("Instagram") ||
                              inspirationSources.includes(
                                "Instagram references",
                              );

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.key === "NONE") {
                          setHasInspirationReferences(false);
                          setInspirationRefTypes([]);
                          setInspirationSources([]);
                          return;
                        }

                        setHasInspirationReferences(true);

                        if (item.key === "PHOTOS") {
                          setInspirationRefTypes((prev) =>
                            toggleArrayValue(prev, "IMAGES"),
                          );
                          return;
                        }

                        if (item.key === "MOOD_BOARD") {
                          setInspirationRefTypes((prev) =>
                            toggleArrayValue(prev, "MOOD_BOARDS"),
                          );
                          return;
                        }

                        if (item.key === "PINTEREST") {
                          setInspirationSources((prev) =>
                            prev.includes("Pinterest")
                              ? prev.filter((source) => source !== "Pinterest")
                              : [
                                  ...prev.filter(
                                    (source) => source !== "Pinterest boards",
                                  ),
                                  "Pinterest",
                                ],
                          );
                          return;
                        }

                        setInspirationSources((prev) =>
                          prev.includes("Instagram")
                            ? prev.filter((source) => source !== "Instagram")
                            : [
                                ...prev.filter(
                                  (source) =>
                                    source !== "Instagram references",
                                ),
                                "Instagram",
                              ],
                        );
                      }}
                      className={chipClass(selected)}
                    >
                      {selected && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={2}
                value={inspirationNotes}
                onChange={(e) => setInspirationNotes(e.target.value)}
                placeholder="Reference notes, links, creative cues, visual language comments..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
              />
            </div>

            <div className="pt-3 border-t border-border/40 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Please Avoid
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVOIDED_DECOR_ELEMENTS.map((item) => {
                  const active = avoidedElements.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setAvoidedElements((prev) =>
                          prev.includes(item)
                            ? prev.filter((x) => x !== item)
                            : [...prev, item],
                        )
                      }
                      className={chipClass(active, "rose")}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Pre-Existing Assets Discovery
                </h3>
                <p className="text-xs text-muted-foreground">
                  Let's note what's already available so we don't duplicate it later.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Pre-Existing Assets
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Venue Assets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRE_EXISTING_ASSET_OPTIONS.filter((item) =>
                    VENUE_ASSET_KEYS.includes(item.key),
                  ).map((item) => {
                    const active = preExistingAssets.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          const withoutNone: PreExistingAssetTag[] =
                            preExistingAssets.filter(
                              (asset) => asset !== "NONE_ALL_CATERER_DECOR",
                            );
                          if (withoutNone.includes(item.key)) {
                            const reduced = withoutNone.filter(
                              (asset) => asset !== item.key,
                            );
                            setPreExistingAssets(
                              reduced.length > 0
                                ? reduced
                                : ["NONE_ALL_CATERER_DECOR"],
                            );
                            return;
                          }
                          setPreExistingAssets([...withoutNone, item.key]);
                        }}
                        className={`text-xs font-extrabold text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                          active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Host Assets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRE_EXISTING_ASSET_OPTIONS.filter((item) =>
                    HOST_ASSET_KEYS.includes(item.key),
                  ).map((item) => {
                    const active = preExistingAssets.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          const withoutNone: PreExistingAssetTag[] =
                            preExistingAssets.filter(
                              (asset) => asset !== "NONE_ALL_CATERER_DECOR",
                            );
                          if (withoutNone.includes(item.key)) {
                            const reduced = withoutNone.filter(
                              (asset) => asset !== item.key,
                            );
                            setPreExistingAssets(
                              reduced.length > 0
                                ? reduced
                                : ["NONE_ALL_CATERER_DECOR"],
                            );
                            return;
                          }
                          setPreExistingAssets([...withoutNone, item.key]);
                        }}
                        className={`text-xs font-extrabold text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                          active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreExistingAssets(["NONE_ALL_CATERER_DECOR"])}
                className={`text-xs font-extrabold text-left px-3 py-2.5 rounded-xl border w-full transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                  preExistingAssets.includes("NONE_ALL_CATERER_DECOR")
                    ? CARD_OPTION_SELECTED_SECONDARY
                    : CARD_OPTION_UNSELECTED
                }`}
              >
                No Pre-Existing Assets (All Decor by Caterer)
              </button>
            </div>

            <div className="pt-3 border-t border-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Special Highlights
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPECIAL_HIGHLIGHT_PRESETS.map((item) => {
                  const active = specialHighlights.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setSpecialHighlights((prev) =>
                          prev.includes(item)
                            ? prev.filter((x) => x !== item)
                            : [...prev, item],
                        )
                      }
                      className={chipClass(active, "emerald")}
                    >
                      {active && <Check className="w-3 h-3 stroke-3" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                6
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  Site Visit & Venue Constraints
                </h3>
                <p className="text-xs text-muted-foreground">
                  Let's flag any site visit needs or venue constraints early.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Site Visit
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <label className="text-xs font-bold text-foreground block">
                Site Visit Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "REQUIRED",
                    "NOT_REQUIRED",
                    "ALREADY_VISITED",
                  ] as SiteVisitStatusType[]
                ).map((item) => {
                  const active = siteVisitStatus === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSiteVisitStatus(item)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                        active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                      }`}
                    >
                      {siteVisitLabel(item)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Venue Restrictions
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <label className="text-xs font-bold text-foreground block">
                Venue Restriction Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "YES_RESTRICTIONS",
                    "NO_KNOWN_RESTRICTIONS",
                    "NOT_SURE_YET",
                  ] as VenueRestrictionStatus[]
                ).map((item) => {
                  const active = venueRestrictionStatus === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setVenueRestrictionStatus(item);
                        if (item !== "YES_RESTRICTIONS") {
                          setVenueRestrictions([]);
                        }
                      }}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${FOCUS_RING} ${
                        active ? CARD_OPTION_SELECTED_SECONDARY : CARD_OPTION_UNSELECTED
                      }`}
                    >
                      {restrictionStatusLabel(item)}
                    </button>
                  );
                })}
              </div>

              {venueRestrictionStatus === "YES_RESTRICTIONS" && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    Known Restrictions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {VENUE_RESTRICTION_OPTIONS.map((item) => {
                      const active = venueRestrictions.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setVenueRestrictions((prev) =>
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
              )}
            </div>

            <div className="space-y-1.5 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                  Logistics Notes
                </span>
                <span className="h-px flex-1 bg-border/50" />
              </div>
              <label className="text-xs font-bold text-foreground block">
                Logistics & Access Notes (Discovery only)
              </label>
              <textarea
                rows={2}
                value={logisticsNotes}
                onChange={(e) => setLogisticsNotes(e.target.value)}
                placeholder="Loading window, gate access limitations, power constraints, weather cautions..."
                className={`w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 ${FOCUS_RING}`}
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
              Decor Discovery
            </span>
          </div>

          <div className="bg-linear-to-br from-amber-500/5 via-amber-500/2 to-card border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Decor Discussion Tips</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Ask what guests should remember first: entrance, stage,
                  dining, floral or lighting.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  Use pre-existing assets only as context. Do not jump into
                  allocation, costing, or execution plan details.
                </span>
              </div>
              <div className="p-2.5 bg-card border border-amber-500/15 rounded-xl flex items-start gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                <span>
                  When references exist, classify by type to improve internal
                  handover quality.
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

            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  ["HIGH_CONFIDENCE", "High Confidence (High Win Probability)", "bg-emerald-500/15 border-emerald-500/30 text-emerald-800"],
                  ["MEDIUM_CONFIDENCE", "Medium Confidence (Competitive Evaluation)", "bg-amber-500/15 border-amber-500/30 text-amber-800"],
                  ["EXPLORATORY_LOW_CONFIDENCE", "Exploratory / High Risk", "bg-rose-500/15 border-rose-500/30 text-rose-800"],
                ] as const
              ).map(([key, label, colorClass]) => {
                const isSelected = salesAssessment === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSalesAssessment(key)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${FOCUS_RING} ${
                      isSelected
                        ? `${colorClass} shadow-xs ring-2 ring-primary/20 font-bold`
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
                    <span className="font-extrabold">{label}</span>
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


