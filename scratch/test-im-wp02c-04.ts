import {
  computeBudgetCommercialValidation,
  BudgetCommercialConversation,
} from "../src/modules/cat/inquiry/domain/discovery-types";

async function runVerification() {
  console.log("--- Running IM-WP02C-04 Budget & Commercial Discovery Verification ---");

  // 1. Validation Test: Incomplete Data -> NEEDS_ATTENTION
  const valIncomplete = computeBudgetCommercialValidation({});
  console.log("1. Domain Validation (Incomplete):", valIncomplete);
  if (valIncomplete !== "NEEDS_ATTENTION") {
    throw new Error("Expected NEEDS_ATTENTION for incomplete data");
  }

  // 2. Validation Test: Complete Data -> READY
  const valComplete = computeBudgetCommercialValidation({
    investmentFocus: "FOOD_QUALITY_VARIETY",
    proposalFormat: "PER_GUEST_RATE",
    budgetAvailability: "FLEXIBLE_RANGE",
    paymentSchedule: "STANDARD_STAGE_PAYMENTS",
    evaluationStage: "COMPARING_OPTIONS",
  });
  console.log("2. Domain Validation (Complete):", valComplete);
  if (valComplete !== "READY") {
    throw new Error("Expected READY for complete commercial data");
  }

  // 3. Validation Test: Softened Tax Validation (B2B GSTIN invalid length -> NEEDS_ATTENTION, never BLOCKED)
  const valSoftGst = computeBudgetCommercialValidation({
    investmentFocus: "FOOD_QUALITY_VARIETY",
    proposalFormat: "PER_GUEST_RATE",
    budgetAvailability: "FLEXIBLE_RANGE",
    paymentSchedule: "STANDARD_STAGE_PAYMENTS",
    evaluationStage: "COMPARING_OPTIONS",
    billingCategory: "B2B_CORPORATE_GST",
    corporateGstin: "12345", // Incomplete length
  });
  console.log("3. Domain Validation (Incomplete GSTIN):", valSoftGst);
  if (valSoftGst !== "NEEDS_ATTENTION") {
    throw new Error("Expected NEEDS_ATTENTION for incomplete GSTIN");
  }

  console.log("--- IM-WP02C-04 VERIFICATION COMPLETE: ALL CHECKS PASSED ---");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
