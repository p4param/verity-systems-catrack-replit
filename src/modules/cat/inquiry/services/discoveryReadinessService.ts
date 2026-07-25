import {
  DiscoveryArea,
  DiscoveryAreaKey,
  InquiryDiscoveryOverview,
  PreventingMandatoryRequirement,
  QuotationReadinessStatus,
  TodayFocusDirective,
} from '../domain/discovery-types';

export const DEFAULT_DISCOVERY_AREAS_SPEC: Array<{
  areaKey: DiscoveryAreaKey;
  title: string;
  isMandatory: boolean;
  question: string;
}> = [
  {
    areaKey: 'EVENT_BASICS',
    title: 'Event Basics',
    isMandatory: true,
    question: 'What are we planning?',
  },
  {
    areaKey: 'VENUE',
    title: 'Venue',
    isMandatory: true,
    question: 'Where are we executing?',
  },
  {
    areaKey: 'FOOD_BEVERAGE',
    title: 'Food & Beverage',
    isMandatory: true,
    question: 'What are we serving?',
  },
  {
    areaKey: 'BUDGET_COMMERCIALS',
    title: 'Budget & Commercials',
    isMandatory: true,
    question: "What are the customer's commercial expectations?",
  },
  {
    areaKey: 'SERVICE_EXPERIENCE',
    title: 'Service Experience',
    isMandatory: false,
    question: 'How will the event feel to guests?',
  },
  {
    areaKey: 'DECOR_AMBIENCE',
    title: 'Decor & Ambience',
    isMandatory: false,
    question: 'What visual aesthetic is required?',
  },
  {
    areaKey: 'ENTERTAINMENT_ADDONS',
    title: 'Entertainment & Add-ons',
    isMandatory: false,
    question: 'What supplementary services are included?',
  },
  {
    areaKey: 'SPECIAL_REQUIREMENTS',
    title: 'Special Requirements',
    isMandatory: false,
    question: 'What constraints or unique preferences exist?',
  },
];

export function calculateInquiryDiscoveryOverview(
  inquiryId: string,
  areas: DiscoveryArea[]
): InquiryDiscoveryOverview {
  const mandatoryAreas = areas.filter((a) => a.isMandatory);
  const optionalAreas = areas.filter((a) => !a.isMandatory);

  // PR-IM-006 Correct Business Rule:
  // A mandatory Discovery Area is satisfied ONLY when BOTH:
  // 1. lifecycle === 'COMPLETED'
  // 2. validation === 'READY'
  const preventingMandatoryRequirements: PreventingMandatoryRequirement[] = [];
  const missingMandatoryTitles: string[] = [];

  for (const area of mandatoryAreas) {
    const isSatisfied = area.lifecycle === 'COMPLETED' && area.validation === 'READY';
    if (!isSatisfied) {
      missingMandatoryTitles.push(area.title);
      let reason = '';
      if (area.validation === 'BLOCKED') {
        reason = 'Blocked';
      } else if (area.validation === 'NEEDS_ATTENTION') {
        reason = 'Needs Attention';
      } else if (area.lifecycle === 'IN_PROGRESS') {
        reason = 'Discovery in progress';
      } else if (area.lifecycle === 'NOT_STARTED') {
        reason = 'Discovery not started';
      } else if (area.lifecycle === 'REOPENED') {
        reason = 'Discovery reopened';
      } else {
        reason = 'Requirements pending';
      }

      preventingMandatoryRequirements.push({
        areaTitle: area.title,
        reason,
      });
    }
  }

  const blockedAreas = areas.filter((a) => a.validation === 'BLOCKED');
  const needsAttentionAreas = areas.filter((a) => a.validation === 'NEEDS_ATTENTION');

  // Quotation Readiness Status calculation
  let quotationReadiness: QuotationReadinessStatus = 'READY_FOR_QUOTATION';

  if (preventingMandatoryRequirements.length > 0) {
    // If any mandatory area is BLOCKED or NOT_STARTED, status is NOT_READY.
    // If all mandatory areas are completed but some have NEEDS_ATTENTION, status is NEEDS_ATTENTION.
    const hasBlocked = preventingMandatoryRequirements.some((r) => r.reason === 'Blocked');
    const hasIncompleteLifecycle = preventingMandatoryRequirements.some(
      (r) => r.reason.includes('not started') || r.reason.includes('in progress') || r.reason.includes('reopened')
    );

    if (hasBlocked || hasIncompleteLifecycle) {
      quotationReadiness = 'NOT_READY';
    } else {
      quotationReadiness = 'NEEDS_ATTENTION';
    }
  } else if (blockedAreas.length > 0 || needsAttentionAreas.length > 0) {
    quotationReadiness = 'NEEDS_ATTENTION';
  }

  // Derive Today's Focus Directive
  let todayFocus: TodayFocusDirective;

  const highestPriorityIssueArea =
    blockedAreas[0] ||
    needsAttentionAreas[0] ||
    mandatoryAreas.find((a) => !(a.lifecycle === 'COMPLETED' && a.validation === 'READY')) ||
    optionalAreas.find((a) => a.lifecycle !== 'COMPLETED') ||
    areas[0];

  if (highestPriorityIssueArea.validation === 'BLOCKED') {
    todayFocus = {
      areaKey: highestPriorityIssueArea.areaKey,
      areaTitle: highestPriorityIssueArea.title,
      actionText: `Resolve blocker in ${highestPriorityIssueArea.title}`,
      reasonText: `Validation is currently BLOCKED. Critical details must be resolved before proceeding.`,
    };
  } else if (highestPriorityIssueArea.validation === 'NEEDS_ATTENTION') {
    todayFocus = {
      areaKey: highestPriorityIssueArea.areaKey,
      areaTitle: highestPriorityIssueArea.title,
      actionText: `Address attention flags in ${highestPriorityIssueArea.title}`,
      reasonText: `Business validation requires review before quotation.`,
    };
  } else if (highestPriorityIssueArea.lifecycle !== 'COMPLETED') {
    todayFocus = {
      areaKey: highestPriorityIssueArea.areaKey,
      areaTitle: highestPriorityIssueArea.title,
      actionText: `Complete ${highestPriorityIssueArea.title} discovery`,
      reasonText: highestPriorityIssueArea.isMandatory
        ? `Mandatory requirement discovery is incomplete.`
        : `Secondary requirement discovery pending discussion.`,
    };
  } else {
    todayFocus = {
      areaKey: highestPriorityIssueArea.areaKey,
      areaTitle: highestPriorityIssueArea.title,
      actionText: `Review completed discovery and request quotation`,
      reasonText: `All mandatory discovery areas are completed and validated. Ready to generate quotation.`,
    };
  }

  // Recommended Next Action
  let recommendedNextAction = '';
  if (preventingMandatoryRequirements.length > 0) {
    const firstPreventing = preventingMandatoryRequirements[0];
    recommendedNextAction = `Resolve ${firstPreventing.areaTitle} (${firstPreventing.reason})`;
  } else if (blockedAreas.length > 0) {
    recommendedNextAction = `Unblock discovery area: ${blockedAreas[0].title}`;
  } else if (needsAttentionAreas.length > 0) {
    recommendedNextAction = `Address attention flags in ${needsAttentionAreas[0].title}`;
  } else {
    recommendedNextAction = `Generate quotation proposal for customer review`;
  }

  const mandatorySatisfiedCount = mandatoryAreas.filter(
    (a) => a.lifecycle === 'COMPLETED' && a.validation === 'READY'
  ).length;
  const optionalCompleted = optionalAreas.filter((a) => a.lifecycle === 'COMPLETED').length;

  return {
    inquiryId,
    quotationReadiness,
    missingMandatoryAreas: missingMandatoryTitles,
    preventingMandatoryRequirements,
    todayFocus,
    recommendedNextAction,
    discoveryProgress: {
      totalAreas: areas.length,
      completedAreas: mandatorySatisfiedCount + optionalCompleted,
      mandatoryTotal: mandatoryAreas.length,
      mandatoryCompleted: mandatorySatisfiedCount,
      optionalTotal: optionalAreas.length,
      optionalCompleted,
      blockedCount: blockedAreas.length,
      needsAttentionCount: needsAttentionAreas.length,
    },
    areas,
  };
}
