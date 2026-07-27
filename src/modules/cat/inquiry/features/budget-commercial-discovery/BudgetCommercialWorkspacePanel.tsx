"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  RotateCcw,
  ShieldCheck,
  Zap,
  Lock,
  TrendingUp,
  FileText,
  Calendar,
  Users,
  Target,
  Briefcase,
  HelpCircle,
  Eye,
  Award,
  CircleCheck,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  DiscoveryArea,
  InquiryDiscoveryOverview,
  BusinessValidationStatus,
  DiscussionStatus,
  BudgetCommercialConversation,
  InvestmentFocusType,
  CulinaryTradeoffType,
  ConsultativeProposalFormat,
  ScopeInclusionType,
  BudgetAvailabilityType,
  ValueSensitivityType,
  BillingCategoryType,
  PaymentScheduleType,
  CatererEvaluationStage,
  DecisionAuthorityType,
  SelectionDriverType,
  SalesAssessmentConfidence,
  computeBudgetCommercialValidation,
} from "@/modules/cat/inquiry/domain/discovery-types";

interface BudgetCommercialWorkspacePanelProps {
  inquiryId: string;
  initialArea: DiscoveryArea | null;
  onBackToRequirements: () => void;
  onSaveSuccess: (overview?: InquiryDiscoveryOverview) => void | Promise<void>;
}

// Indian locale currency formatter
function formatCurrency(val?: number | string | null): string {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "number" ? val : Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

const INVESTMENT_FOCUS_OPTIONS: { key: InvestmentFocusType; label: string; desc: string }[] = [
  { key: "FOOD_QUALITY_VARIETY", label: "Food Quality & Culinary Variety", desc: "Gourmet food, live chef counters & signature regional flavors" },
  { key: "BEVERAGE_HOSPITALITY", label: "Beverage & Hospitality Experience", desc: "Craft mocktails, artisanal coffee setup & attentive butler service" },
  { key: "PRESENTATION_STYLING", label: "Event Presentation & Styling", desc: "Luxury food displays, thematic counters & visual props" },
  { key: "BALANCED_ALL_ROUND", label: "Balanced All-Round Experience", desc: "Equal focus across food, service & presentation" },
];

const CULINARY_TRADEOFF_OPTIONS: { key: CulinaryTradeoffType; label: string; desc: string }[] = [
  { key: "FOCUS_ON_QUALITY", label: "Focus on Ingredient & Dish Quality", desc: "Prefers higher ingredient quality & live counters over sheer dish count" },
  { key: "FOCUS_ON_VARIETY", label: "Focus on Menu Variety & Dish Count", desc: "Prefers a wider selection of appetizers, mains & dessert options" },
];

const PROPOSAL_FORMAT_OPTIONS: { key: ConsultativeProposalFormat; label: string; desc: string }[] = [
  { key: "PER_GUEST_RATE", label: "Per Guest Rate", desc: "Per-head price bundling menu & core service" },
  { key: "OVERALL_EVENT_PACKAGE", label: "Overall Event Package", desc: "Fixed lump-sum price for total event scope" },
  { key: "COMPARE_BOTH_OPTIONS", label: "Compare Both Options", desc: "Show both per-guest and event package structures" },
  { key: "HELP_ME_DECIDE", label: "Help Me Decide", desc: "Recommend the best structure based on guest count & event type" },
];

const SCOPE_INCLUSION_OPTIONS: { key: ScopeInclusionType; label: string; desc: string }[] = [
  { key: "ALL_INCLUSIVE_BUNDLED", label: "All-Inclusive Bundled Scope", desc: "Crockery, cutlery, basic buffet decor & service staff included" },
  { key: "ITEMIZED_TRANSPARENT", label: "Itemized & Separated Scope", desc: "Food cost separated from staffing, equipment & logistics add-ons" },
];

const BUDGET_AVAILABILITY_OPTIONS: { key: BudgetAvailabilityType; label: string; desc: string }[] = [
  { key: "YES_SPECIFIC", label: "Specific Target Budget", desc: "I have a specific target amount in mind" },
  { key: "FLEXIBLE_RANGE", label: "Flexible Target Range", desc: "I have an approximate range in mind" },
  { key: "NO_BUDGET_YET", label: "No Fixed Budget Yet", desc: "Guide me based on menu & service options" },
  { key: "PREFER_NOT_TO_DISCUSS", label: "Prefer Not to Discuss Yet", desc: "Discuss after reviewing initial proposal options" },
];

const VALUE_SENSITIVITY_OPTIONS: { key: ValueSensitivityType; label: string; desc: string }[] = [
  { key: "BEST_VALUE", label: "Best Value", desc: "Prioritizes cost efficiency and smart budget optimization" },
  { key: "BALANCED_QUALITY_COST", label: "Balance Quality & Cost", desc: "Seeks optimal balance of premium quality and fair pricing" },
  { key: "PREMIUM_EXPERIENCE", label: "Premium Experience", desc: "Prioritizes luxury execution and uncompromised food quality" },
];

const BILLING_CATEGORY_OPTIONS: { key: BillingCategoryType; label: string; desc: string }[] = [
  { key: "PERSONAL_INDIVIDUAL", label: "Personal / Individual Billing", desc: "Direct personal host billing" },
  { key: "B2B_CORPORATE_GST", label: "B2B Corporate Invoice (GST)", desc: "Corporate invoice with GSTIN tax credit details" },
  { key: "NOT_SURE_YET", label: "Not Sure Yet", desc: "Advise me during proposal review" },
];

const PAYMENT_SCHEDULE_OPTIONS: { key: PaymentScheduleType; label: string; desc: string }[] = [
  { key: "STANDARD_STAGE_PAYMENTS", label: "Standard Stage Advance & Balance", desc: "Booking deposit, mid-point menu lock, and balance on event day" },
  { key: "TOKEN_DEPOSIT_BALANCE", label: "Token Deposit + Balance on Event Completion", desc: "Small booking deposit + full balance upon event conclusion" },
  { key: "CORPORATE_INVOICING_TERMS", label: "Corporate Invoicing & Deferred Payment Alignment", desc: "Post-event corporate invoicing with 15–30 day credit alignment" },
];

const EVALUATION_STAGE_OPTIONS: { key: CatererEvaluationStage; label: string; desc: string }[] = [
  { key: "FIRST_DISCUSSION", label: "First Discussion", desc: "First caterer we are speaking with" },
  { key: "COMPARING_OPTIONS", label: "Comparing Options", desc: "Actively speaking with 2–3 caterers" },
  { key: "FINAL_SHORTLIST", label: "Final Shortlist", desc: "Down to final 2 caterers" },
  { key: "ALMOST_DECIDED", label: "Almost Decided", desc: "Ready to book if proposal matches expectations" },
];

const DECISION_AUTHORITY_OPTIONS: { key: DecisionAuthorityType; label: string; desc: string }[] = [
  { key: "INDIVIDUAL_HOST", label: "Individual Host", desc: "Single primary host / decision maker" },
  { key: "FAMILY_COMMITTEE", label: "Family Committee", desc: "Family elders & multi-stakeholder consensus" },
  { key: "CORPORATE_PROCUREMENT", label: "Corporate Procurement", desc: "Formal corporate procurement committee / RFP process" },
];

const SELECTION_DRIVER_OPTIONS: { key: SelectionDriverType; label: string; desc: string }[] = [
  { key: "CULINARY_TASTE", label: "Culinary Taste & Food Quality", desc: "Food tasting result is the #1 decision driver" },
  { key: "COMMERCIAL_VALUE", label: "Total Commercial Value", desc: "Overall price competitiveness is the #1 decision driver" },
  { key: "BRAND_REPUTATION", label: "Brand Reputation & Track Record", desc: "Execution track record & caterer reputation is #1" },
  { key: "CUSTOMIZATION", label: "Customization & Responsiveness", desc: "Flexibility in tailoring menu & service is #1" },
];

const SALES_ASSESSMENT_OPTIONS: { key: SalesAssessmentConfidence; label: string; colorClass: string; desc: string }[] = [
  { key: "HIGH_CONFIDENCE", label: "High Confidence (High Win Probability)", colorClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-800", desc: "Client expectations & budget are strongly aligned; high likelihood to close." },
  { key: "MEDIUM_CONFIDENCE", label: "Medium Confidence (Competitive Evaluation)", colorClass: "bg-amber-500/15 border-amber-500/30 text-amber-800", desc: "Client is actively evaluating caterers; strong proposal & food tasting needed." },
  { key: "EXPLORATORY_LOW_CONFIDENCE", label: "Exploratory / High Risk", colorClass: "bg-rose-500/15 border-rose-500/30 text-rose-800", desc: "Early research stage or budget mismatch; follow up carefully." },
];

interface PriorityActivity {
  text: string;
  priority: "URGENT" | "IMPORTANT" | "RECOMMENDATION";
}

export default function BudgetCommercialWorkspacePanel({
  inquiryId,
  initialArea,
  onBackToRequirements,
  onSaveSuccess,
}: BudgetCommercialWorkspacePanelProps) {
  const savedBc = initialArea?.budgetCommercial;

  // Form States
  const [investmentFocus, setInvestmentFocus] = useState<InvestmentFocusType>(
    savedBc?.investmentFocus || "FOOD_QUALITY_VARIETY"
  );
  const [culinaryTradeoff, setCulinaryTradeoff] = useState<CulinaryTradeoffType>(
    savedBc?.culinaryTradeoff || "FOCUS_ON_QUALITY"
  );

  const [proposalFormat, setProposalFormat] = useState<ConsultativeProposalFormat>(
    savedBc?.proposalFormat || "PER_GUEST_RATE"
  );
  const [scopeInclusion, setScopeInclusion] = useState<ScopeInclusionType>(
    savedBc?.scopeInclusion || "ALL_INCLUSIVE_BUNDLED"
  );

  const [budgetAvailability, setBudgetAvailability] = useState<BudgetAvailabilityType>(
    savedBc?.budgetAvailability || "FLEXIBLE_RANGE"
  );
  const [targetPerGuestMin, setTargetPerGuestMin] = useState<string>(
    savedBc?.targetPerGuestMin ? String(savedBc.targetPerGuestMin) : "2500"
  );
  const [targetPerGuestMax, setTargetPerGuestMax] = useState<string>(
    savedBc?.targetPerGuestMax ? String(savedBc.targetPerGuestMax) : "3200"
  );
  const [targetTotalCap, setTargetTotalCap] = useState<string>(
    savedBc?.targetTotalCap ? String(savedBc.targetTotalCap) : "500000"
  );
  const [valueSensitivity, setValueSensitivity] = useState<ValueSensitivityType>(
    savedBc?.valueSensitivity || "BALANCED_QUALITY_COST"
  );

  const [billingCategory, setBillingCategory] = useState<BillingCategoryType>(
    savedBc?.billingCategory || "PERSONAL_INDIVIDUAL"
  );
  const [corporateGstin, setCorporateGstin] = useState<string>(
    savedBc?.corporateGstin || ""
  );
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleType>(
    savedBc?.paymentSchedule || "STANDARD_STAGE_PAYMENTS"
  );

  const [proposalTargetDate, setProposalTargetDate] = useState<string>(
    savedBc?.proposalTargetDate || ""
  );
  const [evaluationStage, setEvaluationStage] = useState<CatererEvaluationStage>(
    savedBc?.evaluationStage || "COMPARING_OPTIONS"
  );
  const [decisionAuthority, setDecisionAuthority] = useState<DecisionAuthorityType>(
    savedBc?.decisionAuthority || "INDIVIDUAL_HOST"
  );
  const [selectionDriver, setSelectionDriver] = useState<SelectionDriverType>(
    savedBc?.selectionDriver || "CULINARY_TASTE"
  );

  const [salesAssessment, setSalesAssessment] = useState<SalesAssessmentConfidence | undefined>(
    savedBc?.salesAssessment || "HIGH_CONFIDENCE"
  );
  const [additionalNotes, setAdditionalNotes] = useState<string>(
    savedBc?.additionalNotes || ""
  );

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatus>(
    savedBc?.discussionStatus || "CONTINUE_LATER"
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Conversation Progress Calculation (5 Cards)
  const conversationProgress = useMemo(() => {
    let completed = 0;
    if (investmentFocus) completed++;
    if (proposalFormat) completed++;
    if (budgetAvailability) completed++;
    if (billingCategory && paymentSchedule) completed++;
    if (evaluationStage) completed++;
    const percentage = Math.round((completed / 5) * 100);
    return { completed, total: 5, percentage };
  }, [investmentFocus, proposalFormat, budgetAvailability, billingCategory, paymentSchedule, evaluationStage]);

  // Compute Validation Status (Advisory soft validation for GSTIN)
  const validationStatus: BusinessValidationStatus = useMemo(() => {
    return computeBudgetCommercialValidation({
      investmentFocus,
      proposalFormat,
      budgetAvailability,
      paymentSchedule,
      evaluationStage,
      billingCategory,
      corporateGstin,
    });
  }, [investmentFocus, proposalFormat, budgetAvailability, paymentSchedule, evaluationStage, billingCategory, corporateGstin]);

  // Structured Business Summary Auto-generation
  const autoGeneratedSummary = useMemo(() => {
    const invFocusText = INVESTMENT_FOCUS_OPTIONS.find((o) => o.key === investmentFocus)?.label || investmentFocus;
    const invTradeText = CULINARY_TRADEOFF_OPTIONS.find((o) => o.key === culinaryTradeoff)?.label || culinaryTradeoff;

    const propFormatText = PROPOSAL_FORMAT_OPTIONS.find((o) => o.key === proposalFormat)?.label || proposalFormat;
    const scopeIncText = SCOPE_INCLUSION_OPTIONS.find((o) => o.key === scopeInclusion)?.label || scopeInclusion;

    const budgetAvailText = BUDGET_AVAILABILITY_OPTIONS.find((o) => o.key === budgetAvailability)?.label || budgetAvailability;
    let budgetFiguresText = "Not specified / Undisclosed";
    if (budgetAvailability === "YES_SPECIFIC" || budgetAvailability === "FLEXIBLE_RANGE") {
      const minP = formatCurrency(targetPerGuestMin);
      const maxP = formatCurrency(targetPerGuestMax);
      const perGuestStr = minP && maxP ? `${minP} – ${maxP} per guest` : (minP || maxP ? `${minP || maxP} per guest` : '');
      const capStr = targetTotalCap ? `Total Cap: ${formatCurrency(targetTotalCap)}` : '';
      budgetFiguresText = [perGuestStr, capStr].filter(Boolean).join(" | ") || "Indicative targets pending";
    }
    const valueSensText = VALUE_SENSITIVITY_OPTIONS.find((o) => o.key === valueSensitivity)?.label || valueSensitivity;

    const billingCatText = BILLING_CATEGORY_OPTIONS.find((o) => o.key === billingCategory)?.label || billingCategory;
    const gstinStr = billingCategory === "B2B_CORPORATE_GST" ? (corporateGstin?.trim() ? `GSTIN: ${corporateGstin.trim()}` : "GSTIN Pending Verification") : "";
    const paymentSchedText = PAYMENT_SCHEDULE_OPTIONS.find((o) => o.key === paymentSchedule)?.label || paymentSchedule;

    const dateStr = proposalTargetDate ? proposalTargetDate : "As soon as possible";
    const evalStageText = EVALUATION_STAGE_OPTIONS.find((o) => o.key === evaluationStage)?.label || evaluationStage;
    const decAuthText = DECISION_AUTHORITY_OPTIONS.find((o) => o.key === decisionAuthority)?.label || decisionAuthority;
    const driverText = SELECTION_DRIVER_OPTIONS.find((o) => o.key === selectionDriver)?.label || selectionDriver;

    // Open Questions
    const openQuestions: string[] = [];
    if (budgetAvailability === "NO_BUDGET_YET" || budgetAvailability === "PREFER_NOT_TO_DISCUSS") {
      openQuestions.push("Target budget figure undisclosed; provide 2 menu price tier options in proposal.");
    }
    if (billingCategory === "B2B_CORPORATE_GST" && (!corporateGstin || corporateGstin.trim().length !== 15)) {
      openQuestions.push("Verify corporate GSTIN registration details prior to invoice issue.");
    }
    if (!proposalTargetDate) {
      openQuestions.push("Confirm preferred proposal delivery date with client.");
    }

    const openQStr = openQuestions.length > 0 ? openQuestions.map((q) => `- ${q}`).join("\n") : "- All core commercial parameters aligned.";

    return `### Investment & Experience Priorities
- **Investment Focus**: ${invFocusText}
- **Quality Trade-off**: ${invTradeText}

### Commercial Structure & Proposal Format
- **Proposal Format**: ${propFormatText}
- **Scope Expectations**: ${scopeIncText}

### Budget Guidelines
- **Budget Availability**: ${budgetAvailText}
- **Indicative Figures**: ${budgetFiguresText}
- **Value Preference**: ${valueSensText}

### Billing & Payment Terms
- **Billing Category**: ${billingCatText} ${gstinStr ? `(${gstinStr})` : ""}
- **Payment Schedule**: ${paymentSchedText}

### Decision Timeline & Caterer Evaluation
- **Proposal Target Date**: ${dateStr}
- **Evaluation Stage**: ${evalStageText}
- **Decision Authority**: ${decAuthText}
- **Primary Selection Driver**: ${driverText}

### Open Commercial Questions
${openQStr}`;
  }, [
    investmentFocus,
    culinaryTradeoff,
    proposalFormat,
    scopeInclusion,
    budgetAvailability,
    targetPerGuestMin,
    targetPerGuestMax,
    targetTotalCap,
    valueSensitivity,
    billingCategory,
    corporateGstin,
    paymentSchedule,
    proposalTargetDate,
    evaluationStage,
    decisionAuthority,
    selectionDriver,
  ]);

  const [businessSummary, setBusinessSummary] = useState<string>(
    savedBc?.businessSummary || autoGeneratedSummary
  );
  const [isSummaryEdited, setIsSummaryEdited] = useState<boolean>(
    savedBc?.isSummaryManuallyEdited || false
  );

  useEffect(() => {
    if (!isSummaryEdited) {
      setBusinessSummary(autoGeneratedSummary);
    }
  }, [autoGeneratedSummary, isSummaryEdited]);

  // Urgency-Aware & Context-Driven Next Activities with Priority Badges
  const priorityActivities: PriorityActivity[] = useMemo(() => {
    const list: PriorityActivity[] = [];

    // Check Proposal Target Date Urgency
    if (proposalTargetDate) {
      const targetTime = new Date(proposalTargetDate).getTime();
      const nowTime = new Date().getTime();
      const diffHours = (targetTime - nowTime) / (1000 * 3600);
      if (diffHours > 0 && diffHours <= 48) {
        list.push({
          text: "Client requested proposal delivery within 48 hours. Expedite menu costing & chef consultation.",
          priority: "URGENT",
        });
      }
    }

    if (billingCategory === "B2B_CORPORATE_GST" && (!corporateGstin || corporateGstin.trim().length !== 15)) {
      list.push({
        text: "Verify corporate GSTIN tax registration details for invoicing approval.",
        priority: "IMPORTANT",
      });
    }

    if (selectionDriver === "CULINARY_TASTE") {
      list.push({
        text: "Schedule Chef Tasting session at central kitchen before issuing final commercial proposal.",
        priority: "RECOMMENDATION",
      });
    }

    if (evaluationStage === "COMPARING_OPTIONS" || evaluationStage === "FINAL_SHORTLIST") {
      list.push({
        text: "Highlight caterer execution track record & live counter video showcase in the proposal package.",
        priority: "IMPORTANT",
      });
    }

    if (validationStatus === "READY") {
      list.push({
        text: "Commercial Discovery Ready! Proceed to Quotation Engineering to generate formal proposal.",
        priority: "RECOMMENDATION",
      });
    }

    return list;
  }, [proposalTargetDate, billingCategory, corporateGstin, selectionDriver, evaluationStage, validationStatus]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      const bcData: BudgetCommercialConversation = {
        investmentFocus,
        culinaryTradeoff,
        proposalFormat,
        scopeInclusion,
        budgetAvailability,
        targetPerGuestMin: targetPerGuestMin ? Number(targetPerGuestMin) : undefined,
        targetPerGuestMax: targetPerGuestMax ? Number(targetPerGuestMax) : undefined,
        targetTotalCap: targetTotalCap ? Number(targetTotalCap) : undefined,
        valueSensitivity,
        billingCategory,
        corporateGstin: corporateGstin || undefined,
        paymentSchedule,
        proposalTargetDate: proposalTargetDate || undefined,
        evaluationStage,
        decisionAuthority,
        selectionDriver,
        salesAssessment,
        additionalNotes: additionalNotes || undefined,
        businessSummary,
        isSummaryManuallyEdited: isSummaryEdited,
        discussionStatus,
        validationStatus,
      };

      const res = await fetch(`/api/cat/inquiries/${inquiryId}/discovery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: "BUDGET_COMMERCIALS",
          lifecycle: discussionStatus === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS",
          validation: validationStatus,
          summary: businessSummary,
          budgetCommercial: bcData,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (!res.ok || !json?.success) {
        alert(json?.error || "Failed to save Budget & Commercial discovery.");
        return;
      }

      setSuccessMessage("Budget & Commercial discovery saved successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
      if (onSaveSuccess) await onSaveSuccess(json.overview);
    } catch (err) {
      console.error("Save Budget Commercial discovery error:", err);
      alert("Unexpected error saving Budget & Commercial discovery.");
    } finally {
      setSaving(false);
    }
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

        {/* Header Action Balance: Save Discovery is Primary Action, Badge communicates status */}
        <div className="flex items-center gap-3">
          {/* Status Badge (Reduced Emphasis) */}
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
                ? "Commercial Discovery Ready"
                : validationStatus === "BLOCKED"
                ? "Business Blocked"
                : "Needs Attention"}
            </span>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Discovery"}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Banner & Premium Commercial Discovery Progress */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Guided Workspace
              </span>
              <span className="text-xs font-bold text-muted-foreground">Area: Budget & Commercials</span>
            </div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary shrink-0" />
              <span>Budget & Commercial Discovery</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Discover financial expectations, investment priorities, commercial structure, payment terms, and decision timeline.
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

        {/* Premium Progress Section (UX Item 1 & 9) */}
        <div className="pt-3 border-t border-border/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Budget & Commercial Discovery Progress
              </span>
              {conversationProgress.completed === conversationProgress.total && validationStatus === "READY" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/25">
                  <Check className="w-3 h-3 stroke-3" /> Discovery Ready
                </span>
              )}
            </div>
            <span className="text-xs font-black text-primary">
              {conversationProgress.completed} of {conversationProgress.total} Cards Completed ({conversationProgress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden border border-border/30 shadow-inner">
            <div
              className="bg-linear-to-r from-primary via-primary/90 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-2xs"
              style={{ width: `${conversationProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Guided Conversation Cards (Left) + Cohesive Insight Assistant Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): 5 Guided Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Investment Priorities */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Investment Priorities</h3>
                <p className="text-xs text-muted-foreground">Let's understand what matters most for your event experience.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Experiential Investment Focus *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INVESTMENT_FOCUS_OPTIONS.map((option) => {
                    const isSelected = investmentFocus === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setInvestmentFocus(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </div>
                        )}
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Culinary Tradeoff */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Culinary Trade-off Preference</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CULINARY_TRADEOFF_OPTIONS.map((option) => {
                    const isSelected = culinaryTradeoff === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setCulinaryTradeoff(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs text-foreground scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:border-primary/30"
                        }`}
                      >
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Commercial Expectations */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Commercial Expectations</h3>
                <p className="text-xs text-muted-foreground">Let's discuss how you'd like us to structure your proposal.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Consultative Proposal Format *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROPOSAL_FORMAT_OPTIONS.map((option) => {
                    const isSelected = proposalFormat === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setProposalFormat(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </div>
                        )}
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope Inclusions Expectation */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Scope Inclusions Expectation</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SCOPE_INCLUSION_OPTIONS.map((option) => {
                    const isSelected = scopeInclusion === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setScopeInclusion(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs text-foreground scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:border-primary/30"
                        }`}
                      >
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Budget Expectations (Progressive Disclosure) */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Budget Expectations</h3>
                <p className="text-xs text-muted-foreground">Let's explore your target budget and financial expectations.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Step 1: Budget Target Availability */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Budget Target Availability *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUDGET_AVAILABILITY_OPTIONS.map((option) => {
                    const isSelected = budgetAvailability === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setBudgetAvailability(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </div>
                        )}
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Progressive Numerical Figures (Shown ONLY if YES_SPECIFIC or FLEXIBLE_RANGE) */}
              {(budgetAvailability === "YES_SPECIFIC" || budgetAvailability === "FLEXIBLE_RANGE") && (
                <div className="p-4 bg-muted/20 border border-primary/20 rounded-2xl space-y-3 transition-all duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span>Indicative Financial Targets</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      (Values displayed in localized INR format)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-muted-foreground block">Target Per-Guest Min</label>
                        <span className="text-[10px] font-black text-primary">{formatCurrency(targetPerGuestMin)}</span>
                      </div>
                      <input
                        type="number"
                        value={targetPerGuestMin}
                        onChange={(e) => setTargetPerGuestMin(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-muted-foreground block">Target Per-Guest Max</label>
                        <span className="text-[10px] font-black text-primary">{formatCurrency(targetPerGuestMax)}</span>
                      </div>
                      <input
                        type="number"
                        value={targetPerGuestMax}
                        onChange={(e) => setTargetPerGuestMax(e.target.value)}
                        placeholder="e.g. 3500"
                        className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-muted-foreground block">Total Catering Cap</label>
                        <span className="text-[10px] font-black text-primary">{formatCurrency(targetTotalCap)}</span>
                      </div>
                      <input
                        type="number"
                        value={targetTotalCap}
                        onChange={(e) => setTargetTotalCap(e.target.value)}
                        placeholder="e.g. 500000"
                        className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Value Sensitivity */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Commercial Value Preference</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VALUE_SENSITIVITY_OPTIONS.map((option) => {
                    const isSelected = valueSensitivity === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setValueSensitivity(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs text-foreground scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:border-primary/30"
                        }`}
                      >
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Billing & Payment Preferences (Separated) */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Billing & Payment Preferences</h3>
                <p className="text-xs text-muted-foreground">Let's align on billing structure and payment preferences.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Billing Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Billing Category *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BILLING_CATEGORY_OPTIONS.map((option) => {
                    const isSelected = billingCategory === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setBillingCategory(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </div>
                        )}
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Progressive GSTIN Field (Shown ONLY if B2B_CORPORATE_GST) */}
                {billingCategory === "B2B_CORPORATE_GST" && (
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Corporate GSTIN Number (15 Characters - Soft Advisory Validation)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={corporateGstin}
                      onChange={(e) => setCorporateGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs font-mono tracking-wider uppercase focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                    {corporateGstin && corporateGstin.trim().length !== 15 && (
                      <p className="text-[10px] font-semibold text-amber-600 mt-1">
                        ⚠️ Advisory: Standard GSTIN is 15 characters. Incomplete info requires verification prior to invoice issue.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Schedule */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Corporate / Payment Schedule Preference *</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {PAYMENT_SCHEDULE_OPTIONS.map((option) => {
                    const isSelected = paymentSchedule === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setPaymentSchedule(option.key)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20 text-foreground scale-[1.005]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
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
                          <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Proposal Timeline & Decision Process */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/40 pb-3.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Proposal Timeline & Decision Process</h3>
                <p className="text-xs text-muted-foreground">Let's map out your proposal timeline and decision process.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Proposal Target Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">When would you like to receive the proposal?</label>
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={proposalTargetDate}
                    onChange={(e) => setProposalTargetDate(e.target.value)}
                    className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
              </div>

              {/* Caterer Evaluation Stage */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Caterer Evaluation Stage *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EVALUATION_STAGE_OPTIONS.map((option) => {
                    const isSelected = evaluationStage === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setEvaluationStage(option.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer relative ${
                          isSelected
                            ? "bg-linear-to-br from-primary/15 via-primary/5 to-card border-primary shadow-xs ring-2 ring-primary/20 scale-[1.01]"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </div>
                        )}
                        <div className="text-xs font-extrabold text-foreground">{option.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Decision Authority & Primary Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Decision Authority</label>
                  <div className="space-y-2">
                    {DECISION_AUTHORITY_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setDecisionAuthority(option.key)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                          decisionAuthority === option.key
                            ? "bg-primary/10 border-primary text-foreground font-extrabold shadow-2xs"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:border-primary/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Primary Selection Driver</label>
                  <div className="space-y-2">
                    {SELECTION_DRIVER_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectionDriver(option.key)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                          selectionDriver === option.key
                            ? "bg-primary/10 border-primary text-foreground font-extrabold shadow-2xs"
                            : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted hover:border-primary/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-border/40">
                <label className="text-xs font-bold text-foreground block">Additional Commercial & Process Notes</label>
                <textarea
                  rows={2}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Special billing instructions, RFP requirements, host preferences..."
                  className="w-full text-xs bg-background border border-border/60 rounded-xl p-3 focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Unified Cohesive "Insight Assistant" Sidebar (UX Item 2) */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-xs divide-y divide-border/40 overflow-hidden self-start">
          {/* Sidebar Header */}
          <div className="bg-muted/40 p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                Insight Assistant
              </h3>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Commercial Discovery
            </span>
          </div>

          {/* 1. Internal Sales Assessment (Salesperson Only) */}
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
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${
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

          {/* 2. Structured Handover Summary (UX Item 6) */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Structured Business Summary
              </h3>
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
                  <span>Reset Summary</span>
                </button>
              ) : (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                  AUTO GENERATED
                </span>
              )}
            </div>

            <textarea
              rows={7}
              value={businessSummary}
              onChange={(e) => {
                setIsSummaryEdited(true);
                setBusinessSummary(e.target.value);
              }}
              className="w-full text-xs font-mono bg-background border border-border/60 rounded-xl p-3 leading-relaxed max-h-52 overflow-y-auto focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>

          {/* 3. Suggested Next Activities with Priority Badges (UX Item 7) */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Suggested Next Activities</span>
            </h3>

            <div className="space-y-2">
              {priorityActivities.map((act, idx) => {
                const priorityBadgeClass =
                  act.priority === "URGENT"
                    ? "bg-rose-500/15 text-rose-800 border-rose-500/30"
                    : act.priority === "IMPORTANT"
                    ? "bg-amber-500/15 text-amber-800 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-800 border-emerald-500/30";

                return (
                  <div
                    key={idx}
                    className="p-3 bg-muted/20 border border-border/30 rounded-xl text-xs text-foreground space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-2xs">
                        <span className={`px-1.5 py-0.5 rounded ${priorityBadgeClass}`}>
                          {act.priority === "URGENT"
                            ? "🔴 Urgent"
                            : act.priority === "IMPORTANT"
                            ? "🟠 Important"
                            : "🟢 Recommendation"}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed pt-0.5">{act.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


