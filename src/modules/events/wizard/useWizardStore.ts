"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Wizard Form Data Shape ────────────────────────────────────────────────────

export interface WizardCustomer {
  customerId?: string;
  customerType?: "Individual" | "Corporate";
  customerName?: string;
  contactPerson?: string;
  mobile?: string;
  alternateMobile?: string;
  whatsappNumber?: string;
  email?: string;
  companyName?: string;
  gstNo?: string;
  pan?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: string;
  referredBy?: string;
  // History display mocks
  pastEventsCount?: number;
  outstandingAmount?: number;
  customerRating?: number;
  totalRevenue?: number;
}

export interface WizardFunction {
  id: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  pax: number;
  status: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  remarks?: string;
}

export interface WizardVenue {
  venueId?: string;
  venueName?: string;
  venueType?: "Farm House" | "Hotel" | "Banquet" | "Residence" | "Outdoor" | "Corporate Office" | "Other";
  address?: string;
  city?: string;
  state?: string;
  mapsUrl?: string;
  lat?: string;
  lng?: string;
  contactPerson?: string;
  contactNumber?: string;
  capacity?: number;
  parkingAvailable?: boolean;
  kitchenAvailable?: boolean;
  powerAvailability?: string;
  generatorAvailable?: boolean;
  accommodationRequired?: boolean;
  specialInstructions?: string;
}

export interface WizardMenuItem {
  id: string;
  name: string;
  category: "Welcome Drinks" | "Starters" | "Main Course" | "Desserts" | "Live Counters" | "Beverages" | "Bar" | "Other";
  servingType: string;
  estimatedCost?: number;
}

export interface WizardStaffReq {
  role: "Event Manager" | "Supervisor" | "Captain" | "Waiter" | "Chef" | "Helper" | "Other";
  count: number;
  notes?: string;
}

export interface WizardEquipmentReq {
  name: string;
  quantity: number;
}

export interface WizardLogisticsReq {
  type: string;
  details: string;
}

export interface WizardDocument {
  name: string;
  url: string;
  size: number;
  category: "Quotation" | "Contract" | "Menu" | "Venue Layout" | "Images" | "Customer Documents" | "Other";
}

export interface WizardFormData {
  // Step 1 – Customer
  customer: WizardCustomer;
  // Step 2 – Event Info
  name: string;
  typeId: string;
  occasion: string;
  bookingDate: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  budgetRange?: string;
  priorityId: string;
  currency: string;
  statusId: string;
  leadSource?: string;
  salesExecId: string;
  managerId?: string;
  branch?: string;
  company?: string;
  city?: string;
  tags?: string;
  specialOccasionNotes?: string;
  remarks?: string;
  // Step 3 – Functions
  functions: WizardFunction[];
  // Step 4 – Venues
  venues: WizardVenue[];
  // Step 5 – Requirements
  partyTheme?: string;
  themeColors?: string;
  entryGate?: string;
  stage?: string;
  flowers?: string;
  lighting?: string;
  tableLayout?: string;
  crockery?: string;
  cutlery?: string;
  linen?: string;
  napkins?: string;
  uniform?: string;
  serviceStyle?: string;
  vipService?: string;
  generator?: string;
  refrigeration?: string;
  water?: string;
  powerRequirements?: string;
  specialInstructions?: string;
  vipGuests?: string;
  securityInstructions?: string;
  foodAllergies?: string;
  requirements: { category: string; description: string; quantity: number }[];
  // Step 6 – Menu
  menuTemplate?: string;
  menuType?: "Veg" | "Non Veg" | "Mixed" | "Jain";
  foodPreference?: string;
  menuItems: WizardMenuItem[];
  menuNotes?: string;
  // Step 7 – Financials
  revenueModel: "Per Plate" | "Package" | "Lumpsum" | "Hybrid";
  perPlateRate?: number;
  packageAmount?: number;
  lumpsumAmount?: number;
  additionalCharges?: number;
  serviceChargePct?: number;
  gstPct?: number;
  discount?: number;
  commission?: number;
  advanceRequiredPct?: number;
  paymentTerms?: string;
  paymentSchedule?: { dueDate: string; amount: number; description: string }[];
  budgetAmount: number;
  estimatedFood: number;
  estimatedLabor: number;
  estimatedLogistics: number;
  advanceAmount?: number;
  // Step 8 – Staff & Resources
  staffRequirements: WizardStaffReq[];
  equipmentRequirements: WizardEquipmentReq[];
  logisticsRequirements: WizardLogisticsReq[];
  // Step 9 – Documents & Notes
  notes?: string;
  internalNotes?: string;
  documents: WizardDocument[];
}

const DRAFT_KEY = "event_wizard_draft";

const initialData: WizardFormData = {
  customer: {
    customerType: "Individual",
    source: "Website",
    pastEventsCount: 0,
    outstandingAmount: 0,
    customerRating: 5,
    totalRevenue: 0,
  },
  name: "",
  typeId: "",
  occasion: "",
  bookingDate: new Date().toISOString().split("T")[0],
  startDate: "",
  endDate: "",
  guestCount: 0,
  budgetRange: "2-5 Lakhs",
  priorityId: "",
  currency: "INR",
  statusId: "",
  leadSource: "",
  salesExecId: "",
  managerId: undefined,
  branch: "",
  company: "",
  city: "",
  tags: "",
  specialOccasionNotes: "",
  remarks: "",
  functions: [],
  venues: [],
  partyTheme: "",
  themeColors: "",
  entryGate: "",
  stage: "",
  flowers: "",
  lighting: "",
  tableLayout: "",
  crockery: "",
  cutlery: "",
  linen: "",
  napkins: "",
  uniform: "",
  serviceStyle: "",
  vipService: "",
  generator: "",
  refrigeration: "",
  water: "",
  powerRequirements: "",
  specialInstructions: "",
  vipGuests: "",
  securityInstructions: "",
  foodAllergies: "",
  requirements: [],
  menuTemplate: "",
  menuType: "Veg",
  foodPreference: "",
  menuItems: [],
  menuNotes: "",
  revenueModel: "Per Plate",
  perPlateRate: 0,
  packageAmount: 0,
  lumpsumAmount: 0,
  additionalCharges: 0,
  serviceChargePct: 0,
  gstPct: 18,
  discount: 0,
  commission: 0,
  advanceRequiredPct: 50,
  paymentTerms: "50% advance, 50% on event day",
  paymentSchedule: [],
  budgetAmount: 0,
  estimatedFood: 0,
  estimatedLabor: 0,
  estimatedLogistics: 0,
  advanceAmount: 0,
  staffRequirements: [],
  equipmentRequirements: [],
  logisticsRequirements: [],
  notes: "",
  internalNotes: "",
  documents: [],
};

export function useWizardStore() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(() => {
    if (typeof window === "undefined") return initialData;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...initialData, ...JSON.parse(saved) } : initialData;
    } catch {
      return initialData;
    }
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = 10;

  // Persist draft to localStorage
  const saveDraft = useCallback(() => {
    setIsSaving(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      setLastSaved(new Date());
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(() => {
      if (isDirty) saveDraft();
    }, 30_000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [isDirty, saveDraft]);

  const update = useCallback((partial: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
    setIsDirty(true);
  }, []);

  const updateCustomer = useCallback((partial: Partial<WizardCustomer>) => {
    setFormData((prev) => ({ ...prev, customer: { ...prev.customer, ...partial } }));
    setIsDirty(true);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData(initialData);
    setIsDirty(false);
    setStep(1);
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, totalSteps)), [totalSteps]);
  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const goTo = useCallback((s: number) => setStep(Math.max(1, Math.min(s, totalSteps))), [totalSteps]);

  return {
    step, totalSteps, formData, isDirty, isSaving, lastSaved,
    update, updateCustomer, saveDraft, clearDraft, goNext, goPrev, goTo,
  };
}
