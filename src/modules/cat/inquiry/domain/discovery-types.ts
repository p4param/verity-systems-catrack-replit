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

