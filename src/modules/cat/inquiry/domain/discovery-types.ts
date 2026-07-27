export type DiscoveryLifecycleStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REOPENED';

export type BusinessValidationStatus = 
  | 'READY'
  | 'NEEDS_ATTENTION'
  | 'BLOCKED';

export type QuotationReadinessStatus = 
  | 'READY_FOR_QUOTATION'
  | 'NEEDS_ATTENTION'
  | 'NOT_READY';

export type DiscoveryAreaKey =
  | 'EVENT_BASICS'
  | 'VENUE'
  | 'FOOD_BEVERAGE'
  | 'BUDGET_COMMERCIALS'
  | 'SERVICE_EXPERIENCE'
  | 'DECOR_AMBIENCE'
  | 'ENTERTAINMENT_ADDONS'
  | 'SPECIAL_REQUIREMENTS';

export interface DiscoveryArea {
  id: string;
  inquiryId: string;
  areaKey: DiscoveryAreaKey;
  title: string;
  isMandatory: boolean;
  question: string;
  lifecycle: DiscoveryLifecycleStatus;
  validation: BusinessValidationStatus;
  summary: string; // Intentionally concise (1-2 lines max)
  updatedAt: string;
  updatedBy?: string;
  eventBasics?: EventBasicsConversation;
  venueDiscovery?: Record<string, any>;
  foodBeverage?: FoodBeverageConversation;
  budgetCommercial?: BudgetCommercialConversation;
  decorAmbience?: DecorAmbienceConversation;
}

export type MealScheduleType = 
  | 'HIGH_TEA'
  | 'LUNCH'
  | 'DINNER'
  | 'LUNCH_AND_DINNER'
  | 'BREAKFAST_AND_LUNCH'
  | 'ALL_DAY_PACKAGE'
  | 'LATE_NIGHT_SNACKS';

export type TasteProfileLabel = 
  | 'MILD_ELEGANT'
  | 'BALANCED_STANDARD'
  | 'AUTHENTIC_SPICY'
  | 'CUSTOM';

export type KitchenSegregationBusinessLabel = 
  | 'STANDARD_SHARED'
  | 'SEPARATE_SERVICE_COUNTERS'
  | 'DEDICATED_PREP_ZONE'
  | 'STRICT_PURE_VEG_KITCHEN';

export interface DietaryOptions {
  pureVegetarian?: boolean;
  jainAvailable?: boolean;
  halalCertified?: boolean;
  nonVegetarianAllowed?: boolean;
  glutenFreeOptions?: boolean;
  nutFreeAware?: boolean;
  veganOptions?: boolean;
}

export interface FoodBeverageConversation {
  mealSchedule: MealScheduleType[];
  primaryServiceStyleId?: string;
  primaryServiceStyleName?: string;
  liveStationsDesired: boolean;
  liveStationTypes: string[];
  primaryCuisineId?: string;
  primaryCuisineName?: string;
  secondaryCuisineIds?: string[];
  secondaryCuisineNames?: string[];
  tasteProfile: TasteProfileLabel;
  dietaryOptions: DietaryOptions;
  kitchenSegregation: KitchenSegregationBusinessLabel;
  specialFoodHighlights: string[];
  beverageSetup: string[];
  additionalCulinaryNotes?: string;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeFoodBeverageValidation(
  data?: Partial<FoodBeverageConversation>
): BusinessValidationStatus {
  if (!data) return 'NEEDS_ATTENTION';

  if (
    !data.mealSchedule || 
    data.mealSchedule.length === 0 || 
    (!data.primaryCuisineName && !data.primaryCuisineId) || 
    (!data.primaryServiceStyleName && !data.primaryServiceStyleId)
  ) {
    return 'NEEDS_ATTENTION';
  }

  // Strict Conflict Check: Pure Veg event cannot explicitly include Non-Veg dishes
  if (data.dietaryOptions?.pureVegetarian && data.dietaryOptions?.nonVegetarianAllowed) {
    return 'BLOCKED';
  }

  return 'READY';
}


export interface TodayFocusDirective {
  areaKey: DiscoveryAreaKey;
  areaTitle: string;
  actionText: string;
  reasonText: string;
}

export interface PreventingMandatoryRequirement {
  areaTitle: string;
  reason: string; // e.g. "Blocked", "Needs Attention", "Discovery in progress", "Discovery not started"
}

export interface InquiryDiscoveryOverview {
  inquiryId: string;
  quotationReadiness: QuotationReadinessStatus;
  missingMandatoryAreas: string[]; // Kept for backwards compatibility
  preventingMandatoryRequirements: PreventingMandatoryRequirement[]; // PR-IM-006 explicit reasons
  todayFocus: TodayFocusDirective;
  recommendedNextAction: string;
  discoveryProgress: {
    totalAreas: number;
    completedAreas: number;
    mandatoryTotal: number;
    mandatoryCompleted: number;
    optionalTotal: number;
    optionalCompleted: number;
    blockedCount: number;
    needsAttentionCount: number;
  };
  areas: DiscoveryArea[];
}

export type DiscussionStatus = 'COMPLETE' | 'CONTINUE_LATER';

export interface EventBasicsConversation {
  occasion: string;
  toneStyle?: string;
  tentativeDate?: string;
  dateConfidence: 'TENTATIVE' | 'CONFIRMED';
  approximateGuestCount?: number;
  importantNotes?: string;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeEventBasicsValidation(
  occasion?: string,
  tentativeDate?: string,
  approximateGuestCount?: number
): BusinessValidationStatus {
  if (!occasion?.trim() || !tentativeDate?.trim() || !approximateGuestCount || approximateGuestCount <= 0) {
    return 'NEEDS_ATTENTION';
  }
  if (approximateGuestCount > 10000) {
    return 'BLOCKED';
  }
  return 'READY';
}

export type InvestmentFocusType = 
  | 'FOOD_QUALITY_VARIETY'
  | 'BEVERAGE_HOSPITALITY'
  | 'PRESENTATION_STYLING'
  | 'BALANCED_ALL_ROUND';

export type CulinaryTradeoffType = 
  | 'FOCUS_ON_QUALITY'
  | 'FOCUS_ON_VARIETY';

export type ConsultativeProposalFormat = 
  | 'PER_GUEST_RATE'
  | 'OVERALL_EVENT_PACKAGE'
  | 'COMPARE_BOTH_OPTIONS'
  | 'HELP_ME_DECIDE';

export type ScopeInclusionType = 
  | 'ALL_INCLUSIVE_BUNDLED'
  | 'ITEMIZED_TRANSPARENT';

export type BudgetAvailabilityType = 
  | 'YES_SPECIFIC'
  | 'FLEXIBLE_RANGE'
  | 'NO_BUDGET_YET'
  | 'PREFER_NOT_TO_DISCUSS';

export type ValueSensitivityType = 
  | 'BEST_VALUE'
  | 'BALANCED_QUALITY_COST'
  | 'PREMIUM_EXPERIENCE';

export type BillingCategoryType = 
  | 'PERSONAL_INDIVIDUAL'
  | 'B2B_CORPORATE_GST'
  | 'NOT_SURE_YET';

export type PaymentScheduleType = 
  | 'STANDARD_STAGE_PAYMENTS'
  | 'TOKEN_DEPOSIT_BALANCE'
  | 'CORPORATE_INVOICING_TERMS';

export type CatererEvaluationStage = 
  | 'FIRST_DISCUSSION'
  | 'COMPARING_OPTIONS'
  | 'FINAL_SHORTLIST'
  | 'ALMOST_DECIDED';

export type DecisionAuthorityType = 
  | 'INDIVIDUAL_HOST'
  | 'FAMILY_COMMITTEE'
  | 'CORPORATE_PROCUREMENT';

export type SelectionDriverType = 
  | 'CULINARY_TASTE'
  | 'COMMERCIAL_VALUE'
  | 'BRAND_REPUTATION'
  | 'CUSTOMIZATION';

export type SalesAssessmentConfidence = 
  | 'HIGH_CONFIDENCE'
  | 'MEDIUM_CONFIDENCE'
  | 'EXPLORATORY_LOW_CONFIDENCE';

export interface BudgetCommercialConversation {
  investmentFocus: InvestmentFocusType;
  culinaryTradeoff: CulinaryTradeoffType;
  proposalFormat: ConsultativeProposalFormat;
  scopeInclusion: ScopeInclusionType;
  budgetAvailability: BudgetAvailabilityType;
  targetPerGuestMin?: number;
  targetPerGuestMax?: number;
  targetTotalCap?: number;
  valueSensitivity: ValueSensitivityType;
  billingCategory: BillingCategoryType;
  corporateGstin?: string;
  paymentSchedule: PaymentScheduleType;
  proposalTargetDate?: string;
  evaluationStage: CatererEvaluationStage;
  decisionAuthority: DecisionAuthorityType;
  selectionDriver: SelectionDriverType;
  salesAssessment?: SalesAssessmentConfidence;
  additionalNotes?: string;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeBudgetCommercialValidation(
  data?: Partial<BudgetCommercialConversation>
): BusinessValidationStatus {
  if (!data) return 'NEEDS_ATTENTION';

  // Core commercial intent must be captured
  if (
    !data.investmentFocus ||
    !data.proposalFormat ||
    !data.budgetAvailability ||
    !data.paymentSchedule ||
    !data.evaluationStage
  ) {
    return 'NEEDS_ATTENTION';
  }

  // Softened Tax Validation: Incomplete or unverified GSTIN triggers NEEDS_ATTENTION instead of BLOCKED
  if (data.billingCategory === 'B2B_CORPORATE_GST') {
    const trimmedGst = data.corporateGstin?.trim() || '';
    if (trimmedGst.length === 0 || trimmedGst.length !== 15) {
      return 'NEEDS_ATTENTION'; // Soft advisory alert for sales follow-up; never BLOCKED
    }
  }

  return 'READY';
}

// --- Decor & Ambience Discovery (IM-WP02C-05) ---

export type PreferenceImportanceWeighting = 'ESSENTIAL' | 'PREFERRED' | 'OPTIONAL';

export type EmotionalAmbienceVibe = 
  | 'ROYAL_REGAL'
  | 'WARM_INVITING_WELCOMING'
  | 'ELEGANT_SOPHISTICATED'
  | 'JOYFUL_FESTIVE_CELEBRATORY'
  | 'DRAMATIC_GLAMOROUS';

export type LightingAtmosphereType = 
  | 'WARM_CANDLELIGHT_SOFT'
  | 'DYNAMIC_THEMATIC_LIGHTING'
  | 'NATURAL_DAYLIGHT_OPEN'
  | 'DRAMATIC_SPOTLIGHT_HIGH_CONTRAST';

export type ThemeConceptType = 
  | 'TRADITIONAL_HERITAGE'
  | 'FLORAL_GARDEN_DREAM'
  | 'MODERN_CHIC_GEOMETRIC'
  | 'VINTAGE_ELEGANCE'
  | 'FUSION_BOHEMIAN';

export type VisualExecutionStyle = 
  | 'GRAND_OPULENT'
  | 'SUBTLE_MINIMALIST'
  | 'RUSTIC_ORGANIC';

export type ColorPaletteStyle = 
  | 'PASTELS_AND_SOFT_NEUTRALS'
  | 'ROYAL_GOLD_AND_DEEP_RED'
  | 'EMERALD_IVORY_AND_GOLD'
  | 'MONOCHROMATIC_SLEEK'
  | 'CUSTOM_BRAND_PALETTE';

export type GuestMemoryVisionType = 
  | 'GRAND_ENTRANCE_IMPACT'
  | 'STAGE_BACKDROP_BEAUTY'
  | 'CATERING_DINING_EXPERIENCE'
  | 'BREATHTAKING_FLORAL_ARTISTRY'
  | 'LUXURY_AMBIENCE_LIGHTING';

export type DecorFocusAreaType = 
  | 'BUFFET_CATERING_STYLING'
  | 'ENTRANCE_AND_WALKWAY'
  | 'STAGE_AND_MAIN_BACKDROP'
  | 'GUEST_DINING_TABLES'
  | 'PHOTO_BOOTH_EXPERIENCE';

export type FloralPreferenceType = 
  | 'FRESH_FLOWERS_ONLY'
  | 'ARTIFICIAL_SILK_FLORALS'
  | 'MIXED_FRESH_AND_SILK'
  | 'MINIMAL_GREENERY'
  | 'HEAVY_FLORAL_INSTALLATIONS';

export type PreExistingAssetTag = 
  | 'VENUE_LED_WALL_PROVIDED'
  | 'HOST_BRANDING_PROPS'
  | 'VENUE_FURNITURE_IN_PLACE'
  | 'HOST_CULTURAL_MANDAP_FRAME'
  | 'NONE_ALL_CATERER_DECOR';

export type VenueRestrictionStatus = 
  | 'YES_RESTRICTIONS'
  | 'NO_KNOWN_RESTRICTIONS'
  | 'NOT_SURE_YET';

export type VenueRestrictionRule = 
  | 'OPEN_FLAME_RESTRICTIONS'
  | 'HANGING_WEIGHT_LIMITS'
  | 'SHORT_SETUP_WINDOW'
  | 'OUTDOOR_WEATHER_SAFEGUARDS'
  | 'STRICT_TAKEDOWN_DEADLINE';

export type SiteVisitStatusType = 'REQUIRED' | 'NOT_REQUIRED' | 'ALREADY_VISITED';

export type InspirationReferenceType =
  | 'IMAGES'
  | 'VIDEOS'
  | 'MOOD_BOARDS'
  | 'VENUE_REFERENCE_PHOTOS';

export interface DecorAmbienceConversation {
  emotionalVibe: EmotionalAmbienceVibe;
  lightingAtmosphere: LightingAtmosphereType;
  lightingWeighting: PreferenceImportanceWeighting;
  themeConcept: ThemeConceptType;
  themeWeighting: PreferenceImportanceWeighting;
  visualStyle: VisualExecutionStyle;
  colorPalette: ColorPaletteStyle;
  colorWeighting: PreferenceImportanceWeighting;
  dominantColors: string[];
  avoidedColors: string[];
  guestMemoryVision: GuestMemoryVisionType;
  primaryFocusArea: DecorFocusAreaType;
  primaryFocusWeighting: PreferenceImportanceWeighting;
  secondaryFocusAreas: DecorFocusAreaType[];
  rankedFocusAreas?: DecorFocusAreaType[];
  floralPreference: FloralPreferenceType;
  floralWeighting: PreferenceImportanceWeighting;
  inspirationSources: string[];
  hasInspirationReferences?: boolean;
  inspirationRefTypes?: InspirationReferenceType[];
  specialHighlights: string[];
  avoidedElements?: string[];
  inspirationNotes?: string;
  preExistingAssets: PreExistingAssetTag[];
  venueRestrictionStatus: VenueRestrictionStatus;
  venueRestrictions: VenueRestrictionRule[];
  siteVisitStatus?: SiteVisitStatusType;
  logisticsNotes?: string;
  salesAssessment?: SalesAssessmentConfidence;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeDecorAmbienceValidation(
  data?: Partial<DecorAmbienceConversation>
): BusinessValidationStatus {
  if (!data) return 'NEEDS_ATTENTION';

  // Core decor intent parameters required for readiness
  if (
    !data.emotionalVibe ||
    !data.lightingAtmosphere ||
    !data.themeConcept ||
    !data.colorPalette ||
    !data.guestMemoryVision ||
    !data.primaryFocusArea ||
    !data.floralPreference ||
    !data.venueRestrictionStatus ||
    !data.preExistingAssets ||
    data.preExistingAssets.length === 0
  ) {
    return 'NEEDS_ATTENTION';
  }

  // Soft advisory validation: If venue restrictions indicated but none checked, flag NEEDS_ATTENTION
  if (data.venueRestrictionStatus === 'YES_RESTRICTIONS' && (!data.venueRestrictions || data.venueRestrictions.length === 0)) {
    return 'NEEDS_ATTENTION';
  }

  return 'READY';
}


