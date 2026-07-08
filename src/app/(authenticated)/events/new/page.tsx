"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Save, X, Check,
  User, Calendar, Clock, MapPin, Package, Utensils,
  DollarSign, Users, FileText, ClipboardCheck,
} from "lucide-react";
import { useWizardStore } from "@/modules/events/wizard/useWizardStore";
import { Step1Customer } from "@/modules/events/wizard/Step1Customer";
import { Step2EventInfo } from "@/modules/events/wizard/Step2EventInfo";
import { Step3Functions } from "@/modules/events/wizard/Step3Functions";
import { Step4Venue } from "@/modules/events/wizard/Step4Venue";
import {
  Step5Requirements,
  Step6Menu,
  Step7Financials,
  Step8Staff,
  Step9Notes,
} from "@/modules/events/wizard/Steps5to9";
import { Step10Review } from "@/modules/events/wizard/Step10Review";
import { useCreateEvent, useEventFilters } from "@/modules/events/hooks";

// ─── Step Config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Customer", icon: User, short: "Customer" },
  { id: 2, label: "Event Info", icon: Calendar, short: "Event" },
  { id: 3, label: "Functions", icon: Clock, short: "Functions" },
  { id: 4, label: "Venue", icon: MapPin, short: "Venue" },
  { id: 5, label: "Requirements", icon: Package, short: "Reqs" },
  { id: 6, label: "Menu", icon: Utensils, short: "Menu" },
  { id: 7, label: "Financials", icon: DollarSign, short: "Finance" },
  { id: 8, label: "Staff", icon: Users, short: "Staff" },
  { id: 9, label: "Notes", icon: FileText, short: "Notes" },
  { id: 10, label: "Review", icon: ClipboardCheck, short: "Review" },
];

// ─── Step Validation ──────────────────────────────────────────────────────────

function validateStep(step: number, formData: any): string | null {
  if (step === 1) {
    if (!formData.customer.customerName?.trim()) return "Customer name is required";
    if (!formData.customer.mobile?.trim()) return "Mobile number is required";
  }
  if (step === 2) {
    if (!formData.name?.trim()) return "Event name is required";
    if (!formData.typeId) return "Event type is required";
    if (!formData.statusId) return "Event status is required";
    if (!formData.startDate) return "Event start date is required";
    if (!formData.endDate) return "Event end date is required";
    if (!formData.guestCount || formData.guestCount < 1) return "Guest count must be at least 1";
    if (!formData.budgetAmount || formData.budgetAmount <= 0) return "Budget amount is required";
    if (new Date(formData.endDate) < new Date(formData.startDate)) return "End date must be after start date";
  }
  return null;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100);
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Step Navigator ───────────────────────────────────────────────────────────

function StepNav({
  steps, currentStep, onGo,
}: {
  steps: typeof STEPS;
  currentStep: number;
  onGo: (n: number) => void;
}) {
  return (
    <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
      {steps.map((s, idx) => {
        const isDone = s.id < currentStep;
        const isActive = s.id === currentStep;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => s.id < currentStep && onGo(s.id)}
              disabled={s.id > currentStep}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isDone
                  ? "text-primary hover:bg-primary/10 cursor-pointer"
                  : "text-muted-foreground cursor-not-allowed opacity-50"
              }`}
            >
              {isDone ? (
                <Check size={12} className="shrink-0" />
              ) : (
                <Icon size={12} className="shrink-0" />
              )}
              {s.short}
            </button>
            {idx < steps.length - 1 && (
              <div className={`w-4 h-px shrink-0 ${isDone ? "bg-primary" : "bg-border"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Wizard Page ──────────────────────────────────────────────────────────

export default function NewEventPage() {
  const router = useRouter();
  const {
    step, totalSteps, formData, isDirty, isSaving, lastSaved,
    update, updateCustomer, saveDraft, clearDraft, goNext, goPrev, goTo,
  } = useWizardStore();

  const createEvent = useCreateEvent();
  const { data: filterOptions } = useEventFilters();

  const currentStepConfig = STEPS[step - 1];

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowRight") goNext();
      if (e.altKey && e.key === "ArrowLeft") goPrev();
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); saveDraft(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, saveDraft]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleNext = useCallback(() => {
    const err = validateStep(step, formData);
    if (err) { toast.error(err); return; }
    goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, formData, goNext]);

  const handlePrev = useCallback(() => {
    goPrev();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goPrev]);

  const handleSubmit = useCallback(async () => {
    // Final validation across critical steps
    const step1err = validateStep(1, formData);
    const step2err = validateStep(2, formData);
    if (step1err) { toast.error(`Step 1: ${step1err}`); goTo(1); return; }
    if (step2err) { toast.error(`Step 2: ${step2err}`); goTo(2); return; }

    try {
      const payload = {
        name: formData.name,
        typeId: formData.typeId,
        statusId: formData.statusId,
        priorityId: formData.priorityId,
        customerId: formData.customer.customerId || "00000000-0000-0000-0000-000000000001",
        contactId: "00000000-0000-0000-0000-000000000001",
        salesExecId: formData.salesExecId || "00000000-0000-0000-0000-000000000001",
        managerId: formData.managerId || null,
        bookingDate: formData.bookingDate,
        startDate: formData.startDate,
        endDate: formData.endDate,
        guestCount: formData.guestCount,
        budgetAmount: formData.budgetAmount,
        currency: formData.currency,
        remarks: formData.remarks || null,

        // Extended relations
        functions: formData.functions,
        venues: formData.venues,
        requirements: formData.requirements,
        menuItems: formData.menuItems,
        menuNotes: formData.menuNotes,
        specialInstructions: formData.specialInstructions,
        estimatedFood: formData.estimatedFood,
        estimatedLabor: formData.estimatedLabor,
        estimatedLogistics: formData.estimatedLogistics,
        advanceAmount: formData.advanceAmount,
        paymentTerms: formData.paymentTerms,
        staffRequirements: formData.staffRequirements,
        notes: formData.notes,
        internalNotes: formData.internalNotes,
      };

      const result = await createEvent.mutateAsync(payload);
      clearDraft();
      toast.success("Event created successfully!");
      router.push(`/events/${result.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    }
  }, [formData, createEvent, clearDraft, router, goTo]);

  const handleDiscard = useCallback(() => {
    if (isDirty && !confirm("Discard all changes and exit?")) return;
    clearDraft();
    router.push("/events");
  }, [isDirty, clearDraft, router]);

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Customer data={formData.customer} onChange={updateCustomer} />;
      case 2:
        return <Step2EventInfo data={formData} onChange={update} />;
      case 3:
        return (
          <Step3Functions
            functions={formData.functions}
            onChange={(fns) => update({ functions: fns })}
          />
        );
      case 4:
        return (
          <Step4Venue
            venues={formData.venues}
            onChange={(venues) => update({ venues })}
          />
        );
      case 5:
        return (
          <Step5Requirements
            data={formData}
            onChange={update}
          />
        );
      case 6:
        return (
          <Step6Menu
            data={formData}
            onChange={update}
          />
        );
      case 7:
        return <Step7Financials data={formData} onChange={update} />;
      case 8:
        return <Step8Staff data={formData} onChange={update} />;
      case 9:
        return <Step9Notes data={formData} onChange={update} />;
      case 10:
        return (
          <Step10Review
            data={formData}
            filterOptions={filterOptions}
            onSaveDraft={saveDraft}
            onConfirm={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="border-b bg-card px-4 sm:px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleDiscard}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Discard & Exit"
          >
            <X size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm truncate">New Event</h1>
            <p className="text-xs text-muted-foreground">
              Step {step} of {totalSteps} — {currentStepConfig.label}
            </p>
          </div>
        </div>

        <div className="flex-1 hidden lg:block">
          <StepNav steps={STEPS} currentStep={step} onGo={goTo} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastSaved && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Saved {lastSaved.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {isSaving ? "Saving…" : "Save Draft"}
          </button>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="px-4 sm:px-6 pt-2 pb-0 shrink-0">
        <ProgressBar step={step} total={totalSteps} />
        {/* Mobile step indicator */}
        <div className="flex lg:hidden items-center justify-center gap-1.5 mt-2 flex-wrap">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                s.id === step ? "w-6 bg-primary" :
                s.id < step ? "w-3 bg-primary/60" :
                "w-3 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              {React.createElement(currentStepConfig.icon, { size: 18, className: "text-primary" })}
              <h2 className="text-lg font-bold">{currentStepConfig.label}</h2>
              <span className="text-xs text-muted-foreground ml-1">{step}/{totalSteps}</span>
            </div>
          </div>

          <div className="min-h-[400px]">
            {renderStep()}
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <div className="border-t bg-card px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          disabled={step === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md border text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-600 hidden sm:block">Unsaved changes</span>
          )}
          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createEvent.isPending}
              className="flex items-center gap-1.5 px-6 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {createEvent.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Check size={16} /> Create Event
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
