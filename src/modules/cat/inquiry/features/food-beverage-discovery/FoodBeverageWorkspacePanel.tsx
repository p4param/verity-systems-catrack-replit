"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Utensils,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  RotateCcw,
  ShieldCheck,
  Zap,
  Lightbulb,
  ChevronRight,
  Flame,
  ChefHat,
  HeartHandshake,
} from "lucide-react";
import {
  DiscoveryArea,
  InquiryDiscoveryOverview,
  BusinessValidationStatus,
  computeFoodBeverageValidation,
  DiscussionStatus,
  FoodBeverageConversation,
  MealScheduleType,
  TasteProfileLabel,
  KitchenSegregationBusinessLabel,
} from "@/modules/cat/inquiry/domain/discovery-types";
import CuisineLookup from "@/modules/cat/cuisines/components/CuisineLookup";
import ServiceStyleLookup from "@/modules/cat/service-styles/components/ServiceStyleLookup";
import { CatCuisine } from "@/modules/cat/cuisines/types";
import { CatServiceStyle } from "@/modules/cat/service-styles/types";

interface FoodBeverageWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

const MEAL_SCHEDULE_OPTIONS: { key: MealScheduleType; label: string }[] = [
  { key: "HIGH_TEA", label: "High Tea Refreshments" },
  { key: "LUNCH", label: "Lunch Service" },
  { key: "DINNER", label: "Dinner Reception" },
  { key: "LUNCH_AND_DINNER", label: "Lunch & Dinner Package" },
  { key: "BREAKFAST_AND_LUNCH", label: "Breakfast & Lunch" },
  { key: "ALL_DAY_PACKAGE", label: "All-Day Executive Hospitality" },
  { key: "LATE_NIGHT_SNACKS", label: "Late Night Comfort Snacks" },
];

const TASTE_PROFILES: { key: TasteProfileLabel; label: string; desc: string }[] = [
  { key: "MILD_ELEGANT", label: "Mild & Subtle Flavors", desc: "Elegantly spiced for international palettes" },
  { key: "BALANCED_STANDARD", label: "Balanced Classic Spicing", desc: "Standard traditional seasoning" },
  { key: "AUTHENTIC_SPICY", label: "Rich & Authentic Spicing", desc: "Bold, authentic regional heat" },
  { key: "CUSTOM", label: "Custom Flavor Profile", desc: "Special chef instructions" },
];

const KITCHEN_SEGREGATION_OPTIONS: {
  key: KitchenSegregationBusinessLabel;
  label: string;
  desc: string;
}[] = [
  {
    key: "STANDARD_SHARED",
    label: "Standard Shared Preparation",
    desc: "Vegetarian & non-vegetarian items prepared in standard catering kitchen setup.",
  },
  {
    key: "SEPARATE_SERVICE_COUNTERS",
    label: "Separate Service Counters",
    desc: "Dedicated service counters & serving utensils for vegetarian dishes.",
  },
  {
    key: "DEDICATED_PREP_ZONE",
    label: "Dedicated Vegetarian Prep Zone",
    desc: "Separate kitchen prep zones & cookware for pure vegetarian preparation.",
  },
  {
    key: "STRICT_PURE_VEG_KITCHEN",
    label: "Strict 100% Pure Veg Kitchen",
    desc: "Independent 100% vegetarian kitchen facility with zero non-veg presence.",
  },
];

const LIVE_STATION_PRESETS = [
  "Pasta & Risotto Wheel",
  "Live Chaat Counter",
  "Dim Sum & Bao Station",
  "Wood-Fired Pizza",
  "Live Tandoor & Kebabs",
  "Tacos & Burrito Bar",
  "Live Wok & Noodle Bar",
];

const SECONDARY_CUISINE_PRESETS = [
  "Pan-Asian & Dim Sum",
  "Awadhi & Hyderabadi Dum",
  "Italian & Mediterranean",
  "Regional Coastal & South Indian",
  "Continental & European",
  "Street Food & Chaat Specialities",
];

const SPECIAL_FOOD_HIGHLIGHTS = [
  "Live Chef Finishing Counters",
  "Molecular Gastronomy Display",
  "Artisanal Dessert & Pastry Wall",
  "Interactive Grazing Table",
  "Regional Sweet Halwai Counter",
];

const BEVERAGE_SETUP_OPTIONS = [
  "Custom Mocktail & Mixology Bar",
  "Fresh Fruit Juices & Smoothies",
  "Artisanal Coffee & Chai Bar",
  "Beverage Station Setup",
];

export default function FoodBeverageWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
}: FoodBeverageWorkspacePanelProps) {
  const savedFb = initialArea?.foodBeverage;

  // Master lookup lists for quick choice chips
  const [cuisines, setCuisines] = useState<CatCuisine[]>([]);
  const [serviceStyles, setServiceStyles] = useState<CatServiceStyle[]>([]);

  useEffect(() => {
    fetch("/api/cat/cuisines?activeOnly=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.success && Array.isArray(d.items) && setCuisines(d.items))
      .catch(() => {});

    fetch("/api/cat/service-styles?activeOnly=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.success && Array.isArray(d.items) && setServiceStyles(d.items))
      .catch(() => {});
  }, []);

  // Show top 6 quick select items to prevent chip overload
  const quickCuisines = useMemo(
    () => cuisines.filter((c) => c.showInDiscoveryQuickSelect).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 6),
    [cuisines]
  );

  const quickStyles = useMemo(
    () => serviceStyles.filter((s) => s.showInDiscoveryQuickSelect).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 6),
    [serviceStyles]
  );

  // Form States
  const [mealSchedule, setMealSchedule] = useState<MealScheduleType[]>(
    savedFb?.mealSchedule || ["LUNCH_AND_DINNER"]
  );
  const [primaryStyle, setPrimaryStyle] = useState<{ id: string; name: string } | null>(
    savedFb?.primaryServiceStyleName
      ? { id: savedFb.primaryServiceStyleId || savedFb.primaryServiceStyleName, name: savedFb.primaryServiceStyleName }
      : { id: "royal-buffet", name: "Royal Buffet Setup" }
  );
  const [liveStationsDesired, setLiveStationsDesired] = useState<boolean>(
    savedFb?.liveStationsDesired !== undefined ? savedFb.liveStationsDesired : true
  );
  const [liveStationTypes, setLiveStationTypes] = useState<string[]>(
    savedFb?.liveStationTypes || ["Live Chaat Counter", "Live Tandoor & Kebabs"]
  );

  const [primaryCuisine, setPrimaryCuisine] = useState<{ id: string; name: string } | null>(
    savedFb?.primaryCuisineName
      ? { id: savedFb.primaryCuisineId || savedFb.primaryCuisineName, name: savedFb.primaryCuisineName }
      : { id: "north-indian", name: "North Indian Royal Mughlai" }
  );
  const [secondaryCuisines, setSecondaryCuisines] = useState<string[]>(
    savedFb?.secondaryCuisineNames || ["Italian & Mediterranean"]
  );
  const [tasteProfile, setTasteProfile] = useState<TasteProfileLabel>(
    savedFb?.tasteProfile || "BALANCED_STANDARD"
  );

  const [dietaryOptions, setDietaryOptions] = useState(
    savedFb?.dietaryOptions || {
      pureVegetarian: false,
      jainAvailable: true,
      nonVegetarianAllowed: true,
      nutFreeAware: true,
    }
  );
  const [kitchenSegregation, setKitchenSegregation] = useState<KitchenSegregationBusinessLabel>(
    savedFb?.kitchenSegregation || "SEPARATE_SERVICE_COUNTERS"
  );

  const [specialFoodHighlights, setSpecialFoodHighlights] = useState<string[]>(
    savedFb?.specialFoodHighlights || ["Live Chef Finishing Counters"]
  );
  const [beverageSetup, setBeverageSetup] = useState<string[]>(
    savedFb?.beverageSetup || ["Custom Mocktail & Mixology Bar"]
  );
  const [additionalNotes, setAdditionalNotes] = useState<string>(
    savedFb?.additionalCulinaryNotes || ""
  );

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedFb?.discussionStatus || "CONTINUE_LATER"
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compute Conversation Progress (Completed cards out of 5)
  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (mealSchedule.length > 0) completed++;
    if (primaryStyle?.name) completed++;
    if (primaryCuisine?.name) completed++;
    if (Object.values(dietaryOptions).some(Boolean)) completed++;
    if (specialFoodHighlights.length > 0 || beverageSetup.length > 0) completed++;
    const percentage = Math.round((completed / 5) * 100);
    return { completed, total: 5, percentage };
  }, [mealSchedule, primaryStyle, primaryCuisine, dietaryOptions, specialFoodHighlights, beverageSetup]);

  // Compute business validation
  const validationStatus: BusinessValidationStatus = useMemo(() => {
    return computeFoodBeverageValidation({
      mealSchedule,
      primaryCuisineName: primaryCuisine?.name,
      primaryServiceStyleName: primaryStyle?.name,
      dietaryOptions,
    });
  }, [mealSchedule, primaryCuisine, primaryStyle, dietaryOptions]);

  const isDiscoveryReady =
    discussionStatus === "COMPLETE" && validationStatus === "READY";

  // Structured Business Summary Auto-generation
  const autoGeneratedSummary = useMemo(() => {
    const mealsText = mealSchedule
      .map((m) => MEAL_SCHEDULE_OPTIONS.find((o) => o.key === m)?.label || m)
      .join(", ") || "Not specified";

    const styleText = primaryStyle?.name || "Not specified";
    const liveText = liveStationsDesired
      ? `Live Stations Requested (${liveStationTypes.join(", ") || "General"})`
      : "No Live Stations";

    const cuisText = primaryCuisine?.name || "Not specified";
    const secCuisText = secondaryCuisines.length > 0 ? `Secondary: ${secondaryCuisines.join(", ")}` : "";
    const tasteText = TASTE_PROFILES.find((t) => t.key === tasteProfile)?.label || tasteProfile;

    const activeDietary = Object.entries(dietaryOptions)
      .filter(([_, val]) => Boolean(val))
      .map(([key]) => {
        if (key === "pureVegetarian") return "100% Pure Veg";
        if (key === "jainAvailable") return "Jain Options";
        if (key === "nonVegetarianAllowed") return "Non-Veg Included";
        if (key === "halalCertified") return "Halal Certified";
        if (key === "glutenFreeOptions") return "Gluten-Free";
        if (key === "nutFreeAware") return "Nut-Free Aware";
        if (key === "veganOptions") return "Vegan Options";
        return key;
      })
      .join(", ") || "Standard";

    const segText = KITCHEN_SEGREGATION_OPTIONS.find((s) => s.key === kitchenSegregation)?.label || kitchenSegregation;

    const expText = [...specialFoodHighlights, ...beverageSetup].join(", ") || "Standard Hospitality";

    return `### Dining Schedule & Format
- **Meals**: ${mealsText}
- **Service Style**: ${styleText} | ${liveText}

### Cuisine & Taste Profile
- **Primary Cuisine**: ${cuisText} ${secCuisText ? `| ${secCuisText}` : ""}
- **Flavor Profile**: ${tasteText}

### Dietary & Kitchen Setup
- **Dietary Guidelines**: ${activeDietary}
- **Preparation & Service**: ${segText}

### Special Experiences
- **Highlights**: ${expText}`;
  }, [
    mealSchedule,
    primaryStyle,
    liveStationsDesired,
    liveStationTypes,
    primaryCuisine,
    secondaryCuisines,
    tasteProfile,
    dietaryOptions,
    kitchenSegregation,
    specialFoodHighlights,
    beverageSetup,
  ]);

  const [businessSummary, setBusinessSummary] = useState<string>(
    savedFb?.businessSummary || autoGeneratedSummary
  );
  const [isSummaryEdited, setIsSummaryEdited] = useState<boolean>(
    savedFb?.isSummaryManuallyEdited || false
  );

  useEffect(() => {
    if (!isSummaryEdited) {
      setBusinessSummary(autoGeneratedSummary);
    }
  }, [autoGeneratedSummary, isSummaryEdited]);

  // Context-Aware Inspiration Prompts (Advisory Pro-tips)
  const inspirationPrompts = useMemo(() => {
    const hints: string[] = [];
    if (mealSchedule.includes("HIGH_TEA")) {
      hints.push("High Tea Selected: Suggest an Artisanal Chai & Coffee Bar or Live Waffle & Churros Counter.");
    }
    if (dietaryOptions.jainAvailable) {
      hints.push("Jain Options Required: Inform client that executive chefs craft custom Jain mocktails and desserts without gelatin.");
    }
    if (liveStationsDesired) {
      hints.push("Live Cooking Counters: High guest engagement! Suggest signature Wood-Fired Pizza or Live Dim Sum display.");
    }
    if (primaryCuisine?.name.includes("Mughlai") || primaryCuisine?.name.includes("Awadhi")) {
      hints.push("Royal Mughlai Cuisine: Consider suggesting live Handi Biryani presentation or Shahi Tukda live dessert counter.");
    }
    if (hints.length === 0) {
      hints.push("Pro Tip: Discuss beverage mixology setups to elevate the overall evening hospitality experience.");
    }
    return hints;
  }, [mealSchedule, dietaryOptions, liveStationsDesired, primaryCuisine]);

  // Context-Aware Suggested Activities (Reacts to discussion status & validation)
  const suggestedActivities = useMemo(() => {
    const activities: Array<{ priority: "URGENT" | "IMPORTANT" | "RECOMMENDATION"; text: string }> = [];
    if (discussionStatus === "COMPLETE" && validationStatus === "READY") {
      activities.push({
        priority: "RECOMMENDATION",
        text: "Discovery Complete! Proceed to Menu Engineering to assemble custom food proposal options.",
      });
    } else if (discussionStatus === "CONTINUE_LATER") {
      activities.push({
        priority: "IMPORTANT",
        text: "Discovery saved in progress. Revisit remaining cards before finalizing menu quotation.",
      });
    }

    if (dietaryOptions.jainAvailable || dietaryOptions.pureVegetarian) {
      activities.push({
        priority: "IMPORTANT",
        text: "Coordinate with Executive Chef for dedicated Jain/Veg preparation guidelines & ingredient sourcing.",
      });
    }
    if (liveStationsDesired && liveStationTypes.length > 0) {
      activities.push({
        priority: "URGENT",
        text: "Share Live Station technical checklist (power, gas, ventilation) with Venue Manager.",
      });
    }
    if (beverageSetup.includes("Custom Mocktail & Mixology Bar")) {
      activities.push({
        priority: "RECOMMENDATION",
        text: "Verify Mixologist team availability and confirm ice supply logistics for bar setup.",
      });
    }

    return activities;
  }, [discussionStatus, validationStatus, dietaryOptions, liveStationsDesired, liveStationTypes, beverageSetup]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      const fbData: FoodBeverageConversation = {
        mealSchedule,
        primaryServiceStyleId: primaryStyle?.id,
        primaryServiceStyleName: primaryStyle?.name,
        liveStationsDesired,
        liveStationTypes,
        primaryCuisineId: primaryCuisine?.id,
        primaryCuisineName: primaryCuisine?.name,
        secondaryCuisineNames: secondaryCuisines,
        tasteProfile,
        dietaryOptions,
        kitchenSegregation,
        specialFoodHighlights,
        beverageSetup,
        additionalCulinaryNotes: additionalNotes,
        businessSummary,
        isSummaryManuallyEdited: isSummaryEdited,
        discussionStatus,
        validationStatus,
      };

      const res = await fetch(`/api/cat/inquiries/${inquiryId}/discovery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: "FOOD_BEVERAGE",
          lifecycle: discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          validation: validationStatus,
          summary: businessSummary,
          foodBeverage: fbData,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save Food & Beverage discovery.");
        return;
      }

      setSuccessMessage("Food & Beverage discovery saved successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
      if (onSaveSuccess) await onSaveSuccess(json.overview);
    } catch (err) {
      console.error("Save F&B discovery error:", err);
      alert("Unexpected error saving Food & Beverage discovery.");
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <button
          type="button"
          onClick={onBackToRequirements}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discovery Hub</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Validation Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border shadow-2xs ${
              validationStatus === "READY"
                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                : validationStatus === "BLOCKED"
                ? "bg-rose-500/15 text-rose-700 border-rose-500/30"
                : "bg-amber-500/15 text-amber-700 border-amber-500/30"
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
                ? "SYSTEM READY"
                : validationStatus === "BLOCKED"
                ? "BUSINESS BLOCKED"
                : "NEEDS ATTENTION"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition cursor-pointer disabled:opacity-50"
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

      {/* Header Banner & Conversation Progress Bar */}
      <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Guided Workspace
              </span>
              <span className="text-xs font-bold text-muted-foreground">Area: Food & Beverage</span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary shrink-0" />
              <span>Food & Beverage Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Discover customer dining expectations, service format, culinary vision, and dietary guidelines.
            </p>
          </div>

          {/* Discussion Status Segmented Control */}
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
                In Progress (Continue Later)
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

        {/* Conversation Progress Bar Indicator */}
        <div className="pt-2 border-t border-border/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px] uppercase tracking-wider">
                Food & Beverage Discovery Progress
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
              className="bg-primary h-full rounded-full transition-all duration-300 shadow-2xs"
              style={{ width: `${conversationProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Guided Conversation Cards (Left) + Inspiration & Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): 5 Guided Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Meals & Dining Schedule */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Meals & Dining Schedule</h3>
                <p className="text-xs text-muted-foreground">What meals and refreshment windows will be served during your event?</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">Select Meals Included *</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_SCHEDULE_OPTIONS.map((option) => {
                  const active = mealSchedule.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMealSchedule((prev) => toggleArrayItem(prev, option.key) as MealScheduleType[])}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 stroke-3" />}
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Dining Format & Service Style */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Dining Format & Service Style</h3>
                <p className="text-xs text-muted-foreground">How would you like the food to be presented and served to your guests?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Primary Dining Format / Service Style *</label>
                <ServiceStyleLookup
                  value={primaryStyle?.name || null}
                  onChange={(style) => setPrimaryStyle(style ? { id: style.id, name: style.name } : null)}
                  placeholder="Search service styles (e.g. Royal Buffet, Pre-Plated, Live Counters)..."
                  allowQuickCreate
                  onRequestCreate={async (name) => {
                    const res = await fetch("/api/cat/service-styles", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, isActive: true, showInDiscoveryQuickSelect: false }),
                    });
                    const json = res.ok ? await res.json().catch(() => ({})) : {};
                    if (json?.success && json?.id) {
                      setPrimaryStyle({ id: json.id, name });
                      setSuccessMessage(json.isDuplicate ? "An existing service style matched your entry." : `Service Style '${name}' created.`);
                      setTimeout(() => setSuccessMessage(null), 4000);
                    }
                  }}
                />

                {/* Quick Select Chips with hierarchy & max 6 limit */}
                {quickStyles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    {quickStyles.map((chip) => {
                      const isSelected = primaryStyle?.name === chip.name;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setPrimaryStyle({ id: chip.id, name: chip.name })}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                              : "bg-amber-500/10 text-amber-800 border-amber-500/30 hover:bg-amber-500/20"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 stroke-3" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                          <span>{chip.name}</span>
                        </button>
                      );
                    })}
                    <span className="text-[10px] text-muted-foreground italic pl-1">
                      + More available via lookup search
                    </span>
                  </div>
                )}
              </div>

              {/* Live Stations desired toggle */}
              <div className="pt-2 space-y-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Are Live Cooking Stations Desired?</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLiveStationsDesired(true)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition ${
                        liveStationsDesired ? "bg-amber-500/15 text-amber-800 border-amber-500/40 shadow-2xs" : "bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      Yes, Live Stations
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveStationsDesired(false)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition ${
                        !liveStationsDesired ? "bg-muted text-foreground border-border" : "bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      No Live Stations
                    </button>
                  </div>
                </div>

                {liveStationsDesired && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground block">Select Desired Live Station Types</label>
                    <div className="flex flex-wrap gap-1.5">
                      {LIVE_STATION_PRESETS.map((preset) => {
                        const active = liveStationTypes.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLiveStationTypes((prev) => toggleArrayItem(prev, preset))}
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                              active
                                ? "bg-amber-500/20 text-amber-900 border-amber-500/40 shadow-2xs"
                                : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                            }`}
                          >
                            {active && <Check className="w-3 h-3 stroke-3" />}
                            <span>{preset}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Cuisine Preferences & Regional Flavors */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Cuisine Preferences & Regional Flavors</h3>
                <p className="text-xs text-muted-foreground">What culinary traditions and regional flavors best represent your event?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Primary Cuisine *</label>
                <CuisineLookup
                  value={primaryCuisine?.name || null}
                  onChange={(cuisine) => setPrimaryCuisine(cuisine ? { id: cuisine.id, name: cuisine.name } : null)}
                  placeholder="Search primary cuisine (e.g. North Indian Mughlai, Pan-Asian)..."
                  allowQuickCreate
                  onRequestCreate={async (name) => {
                    const res = await fetch("/api/cat/cuisines", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, isActive: true, showInDiscoveryQuickSelect: false }),
                    });
                    const json = res.ok ? await res.json().catch(() => ({})) : {};
                    if (json?.success && json?.id) {
                      setPrimaryCuisine({ id: json.id, name });
                      setSuccessMessage(json.isDuplicate ? "An existing cuisine matched your entry." : `Cuisine '${name}' created.`);
                      setTimeout(() => setSuccessMessage(null), 4000);
                    }
                  }}
                />

                {/* Quick Select Chips with hierarchy & max 6 limit */}
                {quickCuisines.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    {quickCuisines.map((chip) => {
                      const isSelected = primaryCuisine?.name === chip.name;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setPrimaryCuisine({ id: chip.id, name: chip.name })}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                              : "bg-amber-500/10 text-amber-800 border-amber-500/30 hover:bg-amber-500/20"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 stroke-3" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                          <span>{chip.name}</span>
                        </button>
                      );
                    })}
                    <span className="text-[10px] text-muted-foreground italic pl-1">
                      + More available via lookup search
                    </span>
                  </div>
                )}
              </div>

              {/* Secondary Cuisines */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Secondary & Theme Cuisines (Optional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {SECONDARY_CUISINE_PRESETS.map((preset) => {
                    const active = secondaryCuisines.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSecondaryCuisines((prev) => toggleArrayItem(prev, preset))}
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                          active
                            ? "bg-primary/20 text-primary border-primary/40 shadow-2xs"
                            : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Taste Profile with High Emphasis Cards */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Taste & Flavor Profile</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TASTE_PROFILES.map((profile) => {
                    const isSelected = tasteProfile === profile.key;
                    return (
                      <button
                        key={profile.key}
                        type="button"
                        onClick={() => setTasteProfile(profile.key)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                          isSelected
                            ? "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </div>
                        )}
                        <div className="text-xs font-extrabold text-foreground">{profile.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{profile.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Dietary & Cultural Guidelines */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Dietary & Cultural Guidelines</h3>
                <p className="text-xs text-muted-foreground">What dietary guidelines, religious preferences, or food safety rules must we respect?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted transition">
                  <input
                    type="checkbox"
                    checked={Boolean(dietaryOptions.pureVegetarian)}
                    onChange={(e) => setDietaryOptions((prev) => ({ ...prev, pureVegetarian: e.target.checked }))}
                    className="rounded-md text-primary h-4 w-4 focus:ring-primary"
                  />
                  <span className="font-extrabold text-foreground">100% Pure Vegetarian Event</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted transition">
                  <input
                    type="checkbox"
                    checked={Boolean(dietaryOptions.jainAvailable)}
                    onChange={(e) => setDietaryOptions((prev) => ({ ...prev, jainAvailable: e.target.checked }))}
                    className="rounded-md text-primary h-4 w-4 focus:ring-primary"
                  />
                  <span className="font-extrabold text-foreground">Jain Options Required (No Onion/Garlic)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted transition">
                  <input
                    type="checkbox"
                    checked={Boolean(dietaryOptions.nonVegetarianAllowed)}
                    onChange={(e) => setDietaryOptions((prev) => ({ ...prev, nonVegetarianAllowed: e.target.checked }))}
                    className="rounded-md text-primary h-4 w-4 focus:ring-primary"
                  />
                  <span className="font-extrabold text-foreground">Non-Vegetarian Dishes Included</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted transition">
                  <input
                    type="checkbox"
                    checked={Boolean(dietaryOptions.halalCertified)}
                    onChange={(e) => setDietaryOptions((prev) => ({ ...prev, halalCertified: e.target.checked }))}
                    className="rounded-md text-primary h-4 w-4 focus:ring-primary"
                  />
                  <span className="font-extrabold text-foreground">Halal Meats Required</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted transition">
                  <input
                    type="checkbox"
                    checked={Boolean(dietaryOptions.glutenFreeOptions)}
                    onChange={(e) => setDietaryOptions((prev) => ({ ...prev, glutenFreeOptions: e.target.checked }))}
                    className="rounded-md text-primary h-4 w-4 focus:ring-primary"
                  />
                  <span className="font-extrabold text-foreground">Gluten-Free Friendly Choices</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted transition">
                  <input
                    type="checkbox"
                    checked={Boolean(dietaryOptions.nutFreeAware)}
                    onChange={(e) => setDietaryOptions((prev) => ({ ...prev, nutFreeAware: e.target.checked }))}
                    className="rounded-md text-primary h-4 w-4 focus:ring-primary"
                  />
                  <span className="font-extrabold text-foreground">Nut-Free / Allergy Aware Preparation</span>
                </label>
              </div>

              {/* Preparation & Service Counter Setup (Selectable Cards) */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Preparation & Service Counter Setup</label>
                <div className="grid grid-cols-1 gap-2">
                  {KITCHEN_SEGREGATION_OPTIONS.map((seg) => {
                    const isSelected = kitchenSegregation === seg.key;
                    return (
                      <button
                        key={seg.key}
                        type="button"
                        onClick={() => setKitchenSegregation(seg.key)}
                        className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20 text-foreground"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-3" />}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-foreground">{seg.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{seg.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Special Food & Beverage Experiences */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Special Food & Beverage Experiences</h3>
                <p className="text-xs text-muted-foreground">What signature culinary highlights or beverage bars will elevate your event?</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Special Culinary Highlights</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIAL_FOOD_HIGHLIGHTS.map((item) => {
                    const active = specialFoodHighlights.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSpecialFoodHighlights((prev) => toggleArrayItem(prev, item))}
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                          active
                            ? "bg-amber-500/20 text-amber-900 border-amber-500/40 shadow-2xs"
                            : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Beverage & Bar Experience</label>
                <div className="flex flex-wrap gap-1.5">
                  {BEVERAGE_SETUP_OPTIONS.map((item) => {
                    const active = beverageSetup.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setBeverageSetup((prev) => toggleArrayItem(prev, item))}
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                          active
                            ? "bg-primary/20 text-primary border-primary/40 shadow-2xs"
                            : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted"
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-3" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Additional Culinary Notes</label>
                <textarea
                  rows={2}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Special chef instructions, host preferences, signature dishes requested..."
                  className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Inspiration Panel + Structured Summary + Suggested Activities */}
        <div className="space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-muted/40 p-4 border-b border-border/40 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Insight Assistant</h3>
            </div>
          </div>

          {/* Lighter Advisory Inspiration Panel */}
          <div className="bg-linear-to-br from-amber-500/5 via-amber-500/2 to-card border border-amber-500/20 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Culinary Discussion Tips</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Advisory discussion prompter based on captured preferences. Does not select menu items.
            </p>
            <div className="space-y-2 pt-1">
              {inspirationPrompts.map((prompt, idx) => (
                <div key={idx} className="p-2.5 bg-card border border-amber-500/15 rounded-xl text-xs text-foreground flex items-start gap-2 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-medium leading-relaxed">{prompt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compact Structured Business Summary Card */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Structured Business Summary</h3>
              {isSummaryEdited ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSummaryEdited(false);
                    setBusinessSummary(autoGeneratedSummary);
                  }}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
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
              rows={5}
              value={businessSummary}
              onChange={(e) => {
                setIsSummaryEdited(true);
                setBusinessSummary(e.target.value);
              }}
              className="w-full text-xs font-mono bg-background border border-border/60 rounded-xl p-3 leading-relaxed max-h-44 overflow-y-auto"
            />
          </div>

          {/* Context-Aware Suggested Activities */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Suggested Next Activities</span>
            </h3>
            <div className="space-y-2">
              {suggestedActivities.map((act, idx) => (
                <div key={idx} className="p-2.5 bg-muted/20 border border-border/30 rounded-xl text-xs text-foreground flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        act.priority === "URGENT"
                          ? "bg-rose-500/15 text-rose-800 border-rose-500/30"
                          : act.priority === "IMPORTANT"
                          ? "bg-amber-500/15 text-amber-800 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-800 border-emerald-500/30"
                      }`}
                    >
                      {act.priority === "URGENT"
                        ? "🔴 Urgent"
                        : act.priority === "IMPORTANT"
                        ? "🟠 Important"
                        : "🟢 Recommendation"}
                    </span>
                    <span className="text-[11px] font-medium leading-relaxed block">{act.text}</span>
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


