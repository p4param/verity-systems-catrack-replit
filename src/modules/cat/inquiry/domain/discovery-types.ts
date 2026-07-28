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
  serviceExperience?: ServiceExperienceConversation;
  entertainmentExperience?: EntertainmentExperienceConversation;
  specialRequirements?: SpecialRequirementsConversation;
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

// --- Service Experience Discovery (IM-WP02C-06) ---
// PreferenceImportanceWeighting is reused from the Decor & Ambience section above.

export type HospitalityVisionType =
  | 'LUXURY_FIVE_STAR'
  | 'WARM_FAMILY_HOSPITALITY'
  | 'PROFESSIONAL_EFFICIENT'
  | 'ROYAL_TRADITIONAL_HOSPITALITY'
  | 'FRIENDLY_RELAXED'
  | 'ELEGANT_DISCREET';

export type ServiceAtmospherePreference =
  | 'HIGHLY_ATTENTIVE'
  | 'AVAILABLE_UNOBTRUSIVE'
  | 'FORMAL'
  | 'CASUAL'
  | 'PERSONALIZED';

export type GuestExperiencePriority =
  | 'WARM_HOSPITALITY'
  | 'FAST_FOOD_SERVICE'
  | 'PERSONALIZED_GUEST_CARE'
  | 'QUEUE_FREE_EXPERIENCE'
  | 'BEVERAGE_SERVICE'
  | 'CHILDRENS_ASSISTANCE'
  | 'SENIOR_CITIZEN_SUPPORT';

export type HostInvolvementPreference =
  | 'RELAX_AND_ENJOY'
  | 'STAY_INFORMED'
  | 'BE_INVOLVED_KEY_MOMENTS'
  | 'COORDINATE_THROUGHOUT';

export type CommunicationStyleType =
  | 'SINGLE_POINT_OF_CONTACT'
  | 'CONTINUOUS_UPDATES'
  | 'MILESTONE_UPDATES_ONLY'
  | 'MINIMAL_INTERRUPTIONS';

export type VipGuestTag =
  | 'VIP_GUESTS'
  | 'SENIOR_CITIZENS'
  | 'CHILDREN'
  | 'ACCESSIBILITY_NEEDS'
  | 'INTERNATIONAL_GUESTS'
  | 'RELIGIOUS_DIGNITARIES';

export type SignatureHospitalityMoment =
  | 'WARM_WELCOME_EXPERIENCE'
  | 'PERSONALIZED_GREETINGS'
  | 'ARRIVAL_REFRESHMENTS'
  | 'VIP_TABLE_SERVICE'
  | 'CAKE_CEREMONY_SUPPORT'
  | 'TOAST_COORDINATION'
  | 'FAREWELL_HOSPITALITY'
  | 'DEPARTURE_THANK_YOU';

export type ServicePreferenceTag =
  | 'PREMIUM_UNIFORMED_SERVICE'
  | 'TRADITIONAL_ATTIRE'
  | 'ENGLISH_SPEAKING_STAFF'
  | 'LOCAL_LANGUAGE_PREFERENCE'
  | 'CHILD_FRIENDLY_STAFF'
  | 'ALLERGY_AWARENESS';

export interface ServiceExperienceConversation {
  hospitalityVision: HospitalityVisionType;
  hospitalityVisionWeighting: PreferenceImportanceWeighting;
  serviceAtmospherePreference: ServiceAtmospherePreference;

  guestExperiencePriorities: GuestExperiencePriority[];
  guestExperienceWeighting: PreferenceImportanceWeighting;

  hostInvolvementPreference: HostInvolvementPreference;
  communicationStyle: CommunicationStyleType;
  communicationStyleWeighting: PreferenceImportanceWeighting;

  vipGuestTags: VipGuestTag[];
  vipServiceWeighting: PreferenceImportanceWeighting;
  vipAdditionalNotes?: string;

  signatureMoments: SignatureHospitalityMoment[];
  signatureMomentsWeighting: PreferenceImportanceWeighting;

  servicePreferenceTags: ServicePreferenceTag[];
  practicalNotes?: string;

  hospitalityMemoryResponse?: string;

  salesAssessment?: SalesAssessmentConfidence;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeServiceExperienceValidation(
  data?: Partial<ServiceExperienceConversation>
): BusinessValidationStatus {
  if (!data) return 'NEEDS_ATTENTION';

  // Core hospitality intent must be captured
  if (
    !data.hospitalityVision ||
    !data.serviceAtmospherePreference ||
    !data.hostInvolvementPreference ||
    !data.communicationStyle ||
    !data.guestExperiencePriorities ||
    data.guestExperiencePriorities.length === 0
  ) {
    return 'NEEDS_ATTENTION';
  }

  return 'READY';
}

// --- Entertainment & Add-ons Discovery (IM-WP02C-07) ---
// PreferenceImportanceWeighting is reused from the Decor & Ambience section above.

export type EventAtmosphereType =
  | 'LIVELY_HIGH_ENERGY'
  | 'WARM_RELAXED_SOCIAL'
  | 'ELEGANT_REFINED'
  | 'FUN_FILLED_FAMILY'
  | 'CULTURAL_TRADITIONAL';

export type GuestEngagementStyle =
  | 'FULLY_IMMERSED_PARTICIPATING'
  | 'ENTERTAINED_WHILE_MINGLING'
  | 'LIGHT_BACKGROUND_ENJOYMENT';

export type BackgroundEntertainmentTag = 'INSTRUMENTAL_MUSIC';

export type FeaturedEntertainmentTag =
  | 'DJ'
  | 'LIVE_BAND'
  | 'SINGER'
  | 'CULTURAL_PERFORMANCES'
  | 'DANCE_PERFORMANCES'
  | 'HOST_EMCEE';

export type EntertainmentAvoidTag =
  | 'LOUD_MUSIC_DURING_DINING'
  | 'NO_FIRE_PYROTECHNICS'
  | 'KEEP_FAMILY_FRIENDLY'
  | 'NO_LATE_NIGHT_LOUD_PERFORMANCES';

export type GuestParticipationLevel =
  | 'FULLY_PARTICIPATING_HANDS_ON'
  | 'WATCHING_ENJOYING'
  | 'MIX_OF_BOTH';

export type InteractiveExperienceTag =
  | 'PHOTO_BOOTH'
  | 'SELFIE_STATION'
  | 'KIDS_ENTERTAINMENT'
  | 'GAMES'
  | 'INTERACTIVE_EXPERIENCES'
  | 'LIVE_DEMONSTRATIONS';

export type TechnologyBusinessPurpose =
  | 'ENHANCE_GUEST_ENGAGEMENT'
  | 'CAPTURE_MEMORIES_KEEPSAKE'
  | 'EVENT_BRANDING_PROMOTION'
  | 'SUPPORT_PRESENTATIONS_SPEECHES'
  | 'ELEVATE_VISUAL_IMPACT';

export type TechnologyEnhancementTag =
  | 'LED_WALL'
  | 'LIVE_STREAMING'
  | 'EVENT_RECORDING'
  | 'PROJECTORS'
  | 'PRESENTATION_SUPPORT'
  | 'DIGITAL_DISPLAYS'
  | 'EVENT_BRANDING';

export type VenueAwarenessStatus =
  | 'NO_KNOWN_RESTRICTIONS'
  | 'SOME_RESTRICTIONS_KNOWN'
  | 'NOT_SURE_YET';

export type ValueAddedServiceTag =
  | 'WELCOME_DRINKS'
  | 'VALET_PARKING'
  | 'GUEST_REGISTRATION'
  | 'RETURN_GIFTS'
  | 'HOSPITALITY_DESK'
  | 'DIRECTIONAL_SIGNAGE'
  | 'TRANSPORTATION_ASSISTANCE';

export type ServiceOwnershipPreference =
  | 'SELF_COORDINATING'
  | 'REQUEST_TEAM_HELP'
  | 'SHARED_COORDINATION'
  | 'NOT_DECIDED_YET';

export type SignatureExperienceTag =
  | 'AMAZING_ENTERTAINMENT'
  | 'BEAUTIFUL_CELEBRATION_MOMENTS'
  | 'INTERACTIVE_GUEST_EXPERIENCES'
  | 'LUXURY_WELCOME'
  | 'TECHNOLOGY_EXPERIENCE'
  | 'PERSONAL_TOUCHES'
  | 'SIMPLE_ELEGANT_CELEBRATION';

export interface EntertainmentExperienceConversation {
  eventAtmosphere: EventAtmosphereType;
  eventAtmosphereWeighting: PreferenceImportanceWeighting;
  guestEngagementStyle: GuestEngagementStyle;

  backgroundEntertainment: BackgroundEntertainmentTag[];
  featuredEntertainment: FeaturedEntertainmentTag[];
  entertainmentAvoidTags: EntertainmentAvoidTag[];
  entertainmentGenresToAvoid?: string;

  guestParticipationLevel: GuestParticipationLevel;
  interactiveExperiences: InteractiveExperienceTag[];
  otherGuestActivities?: string;

  technologyBusinessPurpose: TechnologyBusinessPurpose[];
  technologyEnhancements: TechnologyEnhancementTag[];
  venueAwarenessStatus: VenueAwarenessStatus;
  venueAwarenessNotes?: string;

  valueAddedServices: ValueAddedServiceTag[];
  serviceImportanceWeighting: PreferenceImportanceWeighting;
  serviceOwnershipPreference: ServiceOwnershipPreference;

  signatureExperience: SignatureExperienceTag[];
  priorityExperience?: SignatureExperienceTag;
  signatureExperienceNotes?: string;

  salesAssessment?: SalesAssessmentConfidence;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeEntertainmentExperienceValidation(
  data?: Partial<EntertainmentExperienceConversation>
): BusinessValidationStatus {
  if (!data) return 'NEEDS_ATTENTION';

  // Core experience vision must be captured — everything else in this
  // workspace is a legitimately optional add-on (a customer may want zero
  // music, zero technology, and zero value-added services).
  if (!data.eventAtmosphere || !data.guestEngagementStyle) {
    return 'NEEDS_ATTENTION';
  }

  return 'READY';
}

// --- Special Requirements Discovery (IM-WP02C-08) ---
// No PreferenceImportanceWeighting anywhere in this interface — deliberate.
// Every field below is informational awareness only.

export type AccessibilityConsiderationTag =
  | 'WHEELCHAIR_ACCESS'
  | 'ELDERLY_GUESTS'
  | 'CHILDREN'
  | 'NURSING_MOTHERS'
  | 'ACCESSIBLE_SEATING'
  | 'MOBILITY_ASSISTANCE';

export type HealthWellbeingConsiderationTag =
  | 'SEVERE_ALLERGIES_AWARENESS'
  | 'EMERGENCY_MEDICAL_AWARENESS'
  | 'MEDICATION_STORAGE_NEEDS'
  | 'FIRST_AID_EXPECTATIONS'
  | 'GUEST_SENSITIVITIES';

export type CulturalReligiousConsiderationTag =
  | 'RELIGIOUS_CUSTOMS'
  | 'CEREMONIAL_EXPECTATIONS'
  | 'PRAYER_REQUIREMENTS'
  | 'TRADITIONAL_PRACTICES'
  | 'LANGUAGE_PREFERENCES';

export type SecurityProtocolTag =
  | 'VIP_ATTENDANCE'
  | 'RESTRICTED_ACCESS'
  | 'GUEST_PRIVACY'
  | 'PHOTOGRAPHY_RESTRICTIONS'
  | 'MEDIA_PRESENCE';

export type VenueGuidelineTag =
  | 'PERMITS_ALREADY_KNOWN'
  | 'VENUE_COMPLIANCE_EXPECTATIONS'
  | 'NOISE_RESTRICTIONS'
  | 'ENVIRONMENTAL_RULES'
  | 'SUSTAINABILITY_REQUESTS';

// Each card's fields are grouped into its own nested interface, mounted as a
// property on the root SpecialRequirementsConversation object — rather than
// six flat, same-level field groups — so each card's data has room to grow
// independently (e.g. a future field added to Health & Guest Wellbeing can
// never collide with or be confused for a field on a different card).

export interface AccessibilityGuestComfort {
  considerations: AccessibilityConsiderationTag[];
  otherAccessibilityNotes?: string;
}

export interface HealthGuestWellbeing {
  considerations: HealthWellbeingConsiderationTag[];
  otherHealthConsiderations?: string;
}

export interface CulturalReligiousConsiderations {
  considerations: CulturalReligiousConsiderationTag[];
  culturalSensitivityNotes?: string;
}

export interface SecurityProtocolExpectations {
  considerations: SecurityProtocolTag[];
  securityCoordinationNotes?: string;
}

export interface VenueGuidelinesEventConsiderations {
  considerations: VenueGuidelineTag[];
  wasteManagementNotes?: string;
}

export interface SpecialRequestsPeaceOfMind {
  specialRequestsNotes?: string;
}

export interface SpecialRequirementsConversation {
  accessibility: AccessibilityGuestComfort;
  healthWellbeing: HealthGuestWellbeing;
  culturalReligious: CulturalReligiousConsiderations;
  securityProtocol: SecurityProtocolExpectations;
  venueGuidelines: VenueGuidelinesEventConsiderations;
  specialRequests: SpecialRequestsPeaceOfMind;

  salesAssessment?: SalesAssessmentConfidence;
  businessSummary: string;
  isSummaryManuallyEdited?: boolean;
  discussionStatus: DiscussionStatus;
  validationStatus: BusinessValidationStatus;
}

export function computeSpecialRequirementsValidation(
  data?: Partial<SpecialRequirementsConversation>
): BusinessValidationStatus {
  if (!data) return 'NEEDS_ATTENTION';

  // Business rule for this workspace: zero mandatory fields. Every card is
  // optional, informational awareness — "no special requirements" is itself
  // a complete business answer. This is not an absence of validation logic;
  // it is the validated business rule, expressed as an empty rule set.
  return 'READY';
}


