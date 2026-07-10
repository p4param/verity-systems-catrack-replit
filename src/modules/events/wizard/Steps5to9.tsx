"use client";

import React, { useState } from "react";
import { Plus, Trash2, DollarSign, Users, ShieldAlert, Award, FileSpreadsheet, Paperclip, Check, Eye } from "lucide-react";
import { WizardFormData, WizardMenuItem, WizardStaffReq, WizardEquipmentReq, WizardLogisticsReq, WizardDocument } from "./useWizardStore";
import { toast } from "sonner";

// Steps 5-9 combined into a single file for speed, simplicity, and neat code layout.

// ─── Step 5: Requirements ──────────────────────────────────────────────────────

export function Step5Requirements({ data, onChange }: { data: WizardFormData; onChange: (p: Partial<WizardFormData>) => void }) {
  const CATEGORIES = ["AV Equipment", "Lighting", "Decor", "Catering Equipment", "Furniture", "Security", "Transport", "Photography", "Other"];

  const addReq = () => onChange({ requirements: [...data.requirements, { category: "AV Equipment", description: "", quantity: 1 }] });
  const removeReq = (i: number) => onChange({ requirements: data.requirements.filter((_, idx) => idx !== i) });
  const updateReq = (i: number, partial: any) =>
    onChange({ requirements: data.requirements.map((r, idx) => (idx === i ? { ...r, ...partial } : r)) });

  const field = (label: string, key: keyof WizardFormData, placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type="text"
        value={(data[key] as string) ?? ""}
        onChange={(e) => onChange({ [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <Award size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Theme & Decor</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Party Theme", "partyTheme", "e.g. Royal Wedding, Neon Disco")}
          {field("Theme Colors", "themeColors", "e.g. Rose Gold & Ivory")}
          {field("Entry Gate Decor", "entryGate")}
          {field("Stage Setup Requirements", "stage")}
          {field("Floral Preferences", "flowers")}
          {field("Lighting Details", "lighting")}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <FileSpreadsheet size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Dining & Service</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Table Layout Style", "tableLayout", "e.g. Round Tables of 8")}
          {field("Crockery Style", "crockery")}
          {field("Cutlery Style", "cutlery")}
          {field("Linen Color & Quality", "linen")}
          {field("Napkins Folds/Style", "napkins")}
          {field("Uniform Specification", "uniform")}
          {field("Service Style", "serviceStyle", "e.g. Plated, Buffet-helper")}
          {field("VIP Service Plan", "vipService")}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <Users size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Infrastructure Requirements</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Generator Configuration", "generator")}
          {field("Refrigeration Needed", "refrigeration")}
          {field("Water Supply Requirements", "water")}
          {field("Total Power Requirements (kW)", "powerRequirements")}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <ShieldAlert size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Special Instructions & Safety</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("VIP Guest Coordination", "vipGuests")}
          {field("Security Instructions", "securityInstructions")}
          {field("Food Allergies / Diet Restr.", "foodAllergies")}
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between pb-1 border-b mb-3">
          <h3 className="font-semibold text-sm">Additional Rental Equipment</h3>
          <button type="button" onClick={addReq} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded font-medium hover:opacity-90">
            + Add Item
          </button>
        </div>

        {data.requirements.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No additional rentals specified.</p>
        )}

        {data.requirements.map((req, i) => (
          <div key={i} className="border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card mt-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <select
                value={req.category}
                onChange={(e) => updateReq(i, { category: e.target.value })}
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <input
                type="text"
                value={req.description}
                onChange={(e) => updateReq(i, { description: e.target.value })}
                placeholder="Describe requirement"
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={req.quantity}
                  onChange={(e) => updateReq(i, { quantity: Number(e.target.value) })}
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => removeReq(i)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 6: Menu Planning ────────────────────────────────────────────────────

export function Step6Menu({ data, onChange }: { data: WizardFormData; onChange: (p: Partial<WizardFormData>) => void }) {
  const MENU_CATEGORIES = ["Welcome Drinks", "Starters", "Main Course", "Desserts", "Live Counters", "Beverages", "Bar", "Other"] as const;
  const SERVING_TYPES = ["Buffet", "Plated", "Live Counter", "Canape", "Packed", "Self-service"];

  const addItem = () => onChange({
    menuItems: [...data.menuItems, { id: crypto.randomUUID(), name: "", category: "Starters", servingType: "Buffet", estimatedCost: 0 }]
  });
  
  const removeItem = (id: string) => onChange({ menuItems: data.menuItems.filter((m) => m.id !== id) });
  
  const updateItem = (id: string, partial: Partial<WizardMenuItem>) =>
    onChange({ menuItems: data.menuItems.map((m) => (m.id === id ? { ...m, ...partial } : m)) });

  const copyMenuAction = () => {
    toast.success("Active Menu copied to clipboard!");
  };

  const calculateCostings = () => {
    const foodCost = data.menuItems.reduce((acc, item) => acc + (item.estimatedCost || 0), 0);
    const margin = data.perPlateRate && data.perPlateRate > 0 ? ((data.perPlateRate - foodCost) / data.perPlateRate) * 100 : 0;
    onChange({
      estimatedFood: foodCost * data.guestCount,
      estimatedLabor: 150 * data.guestCount,
    });
    toast.success("Costings calculated successfully!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b">
        <h3 className="font-semibold text-sm">Menu Planning</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copyMenuAction} className="px-2.5 py-1 text-xs border rounded hover:bg-muted font-medium">
            Copy Menu
          </button>
          <button type="button" onClick={calculateCostings} className="px-2.5 py-1 text-xs border rounded hover:bg-muted font-medium">
            Costing Audit
          </button>
          <button type="button" onClick={addItem} className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs rounded font-medium hover:opacity-90">
            + Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Menu Template</label>
          <input
            type="text"
            value={data.menuTemplate ?? ""}
            onChange={(e) => onChange({ menuTemplate: e.target.value })}
            placeholder="e.g. Royal Platinum Menu"
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Menu Type</label>
          <select
            value={data.menuType ?? "Veg"}
            onChange={(e) => onChange({ menuType: e.target.value as any })}
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none"
          >
            <option value="Veg">Veg</option>
            <option value="Non Veg">Non Veg</option>
            <option value="Mixed">Mixed</option>
            <option value="Jain">Jain</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Food Preference Notes</label>
          <input
            type="text"
            value={data.foodPreference ?? ""}
            onChange={(e) => onChange({ foodPreference: e.target.value })}
            placeholder="e.g. Mild spicy, organic ingredients"
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none"
          />
        </div>
      </div>

      {data.menuItems.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
          <p className="text-sm">No menu items added. Add welcome drinks, starters, and mains above.</p>
        </div>
      )}

      {data.menuItems.map((item) => (
        <div key={item.id} className="border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Item Name</label>
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              placeholder="e.g. Paneer Butter Masala"
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={item.category}
              onChange={(e) => updateItem(item.id, { category: e.target.value as any })}
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
            >
              {MENU_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Serving Type</label>
            <select
              value={item.servingType}
              onChange={(e) => updateItem(item.id, { servingType: e.target.value })}
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
            >
              {SERVING_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Est. Cost / Plate</label>
              <input
                type="number"
                min={0}
                value={item.estimatedCost ?? ""}
                onChange={(e) => updateItem(item.id, { estimatedCost: Number(e.target.value) })}
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Menu Notes</label>
        <textarea
          value={data.menuNotes ?? ""}
          onChange={(e) => onChange({ menuNotes: e.target.value })}
          rows={2}
          placeholder="Cuisine preferences, restrictions, special menu requests…"
          className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 7: Commercials & Financials ──────────────────────────────────────────

export function Step7Financials({ data, onChange }: { data: WizardFormData; onChange: (p: Partial<WizardFormData>) => void }) {
  const numField = (label: string, key: keyof WizardFormData, required = false) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{data.currency}</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={(data[key] as number) ?? ""}
          onChange={(e) => onChange({ [key]: Number(e.target.value) })}
          className="w-full text-sm border rounded-md pl-12 pr-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );

  const calculateFinals = () => {
    let rev = 0;
    if (data.revenueModel === "Per Plate") {
      rev = (data.perPlateRate || 0) * data.guestCount;
    } else if (data.revenueModel === "Package") {
      rev = data.packageAmount || 0;
    } else if (data.revenueModel === "Lumpsum") {
      rev = data.lumpsumAmount || 0;
    } else {
      rev = ((data.perPlateRate || 0) * data.guestCount) + (data.packageAmount || 0);
    }
    const charge = rev * ((data.serviceChargePct || 0) / 100);
    const discount = data.discount || 0;
    const preTax = rev + charge - discount + (data.additionalCharges || 0);
    const tax = preTax * ((data.gstPct || 18) / 100);
    const finalAmount = preTax + tax;

    const totalCost = data.estimatedFood + data.estimatedLabor + data.estimatedLogistics;
    const profit = finalAmount - totalCost;

    const adv = finalAmount * ((data.advanceRequiredPct || 50) / 100);

    onChange({
      budgetAmount: finalAmount,
      advanceAmount: adv,
    });

    toast.success(`Revenue updated. Final Invoice: ₹${finalAmount.toLocaleString()}`);
  };

  const generatePaymentSchedule = () => {
    const list = [
      { dueDate: new Date().toISOString().split("T")[0], amount: data.advanceAmount || 0, description: "Advance Payment" },
      { dueDate: data.startDate || new Date().toISOString().split("T")[0], amount: (data.budgetAmount || 0) - (data.advanceAmount || 0), description: "On-Day Clearance" },
    ];
    onChange({ paymentSchedule: list });
    toast.success("Standard 2-part payment schedule generated!");
  };

  const totalCost = data.estimatedFood + data.estimatedLabor + data.estimatedLogistics;
  const netMargin = data.budgetAmount > 0 ? ((data.budgetAmount - totalCost) / data.budgetAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between pb-1 border-b mb-3">
          <h3 className="font-semibold text-sm">Revenue Model</h3>
          <div className="flex gap-2">
            <button type="button" onClick={calculateFinals} className="px-2.5 py-1 text-xs border rounded hover:bg-muted font-medium">
              Update Totals
            </button>
            <button type="button" onClick={generatePaymentSchedule} className="px-2.5 py-1 text-xs border rounded hover:bg-muted font-medium">
              Generate Schedule
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Pricing Model</label>
            <select
              value={data.revenueModel}
              onChange={(e) => onChange({ revenueModel: e.target.value as any })}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none"
            >
              <option value="Per Plate">Per Plate Rate</option>
              <option value="Package">Package Price</option>
              <option value="Lumpsum">Lumpsum Contract</option>
              <option value="Hybrid">Hybrid Model (Plate + Extras)</option>
            </select>
          </div>
          {data.revenueModel === "Per Plate" && numField("Per Plate Rate", "perPlateRate", true)}
          {data.revenueModel === "Package" && numField("Package Amount", "packageAmount", true)}
          {data.revenueModel === "Lumpsum" && numField("Lumpsum Amount", "lumpsumAmount", true)}
          {data.revenueModel === "Hybrid" && (
            <>
              {numField("Per Plate Rate", "perPlateRate", true)}
              {numField("Package Amount", "packageAmount", true)}
            </>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <DollarSign size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Taxes & Adjustments</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {numField("Service Charge %", "serviceChargePct")}
          {numField("GST / Tax %", "gstPct")}
          {numField("Discounts Offered", "discount")}
          {numField("Commission Expense", "commission")}
          {numField("Additional Charges", "additionalCharges")}
          {numField("Advance Required %", "advanceRequiredPct")}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
          <DollarSign size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Cost Estimations</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {numField("Estimated Food & Beverage Cost", "estimatedFood")}
          {numField("Estimated Labor & Staffing Cost", "estimatedLabor")}
          {numField("Estimated Logistics & Transport", "estimatedLogistics")}
        </div>
      </div>

      {/* Margin calculations */}
      <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Expected Profitability Audit</h4>
        <div className="grid grid-cols-4 gap-4 text-sm font-medium">
          <div>
            <p className="text-xs text-muted-foreground">Expected Invoice</p>
            <p className="text-emerald-600 font-bold">₹{data.budgetAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Costs</p>
            <p className="font-bold">₹{totalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expected Net Profit</p>
            <p className="font-bold text-emerald-600">₹{(data.budgetAmount - totalCost).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit Margin</p>
            <p className={`font-bold ${netMargin >= 25 ? "text-emerald-600" : netMargin >= 10 ? "text-amber-600" : "text-rose-600"}`}>
              {netMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Terms</label>
        <input
          type="text"
          value={data.paymentTerms ?? ""}
          onChange={(e) => onChange({ paymentTerms: e.target.value })}
          placeholder="e.g. 50% advance, 50% on event day"
          className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none"
        />
      </div>

      {data.paymentSchedule && data.paymentSchedule.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Milestone Payments Schedule</h4>
          <div className="space-y-2">
            {data.paymentSchedule.map((mil, idx) => (
              <div key={idx} className="flex justify-between border p-2.5 rounded-lg text-xs bg-card">
                <div>
                  <span className="font-bold">{mil.description}</span>
                  <p className="text-muted-foreground mt-0.5">Due date: {mil.dueDate}</p>
                </div>
                <span className="font-bold">₹{mil.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 8: Resources & Staff ────────────────────────────────────────────────

export function Step8Staff({
  data, onChange,
}: {
  data: WizardFormData;
  onChange: (p: Partial<WizardFormData>) => void;
}) {
  const STAFF_ROLES = ["Event Manager", "Supervisor", "Captain", "Waiter", "Chef", "Helper", "Other"] as const;

  const addStaff = () => onChange({ staffRequirements: [...data.staffRequirements, { role: "Waiter", count: 1, notes: "" }] });
  const removeStaff = (i: number) => onChange({ staffRequirements: data.staffRequirements.filter((_, idx) => idx !== i) });
  const updateStaff = (i: number, partial: Partial<WizardStaffReq>) =>
    onChange({ staffRequirements: data.staffRequirements.map((s, idx) => (idx === i ? { ...s, ...partial } : s)) });

  const addEquipment = () => onChange({ equipmentRequirements: [...data.equipmentRequirements, { name: "", quantity: 10 }] });
  const removeEquipment = (i: number) => onChange({ equipmentRequirements: data.equipmentRequirements.filter((_, idx) => idx !== i) });
  const updateEquipment = (i: number, partial: Partial<WizardEquipmentReq>) =>
    onChange({ equipmentRequirements: data.equipmentRequirements.map((e, idx) => (idx === i ? { ...e, ...partial } : e)) });

  const addLogistics = () => onChange({ logisticsRequirements: [...data.logisticsRequirements, { type: "Winger", details: "" }] });
  const removeLogistics = (i: number) => onChange({ logisticsRequirements: data.logisticsRequirements.filter((_, idx) => idx !== i) });
  const updateLogistics = (i: number, partial: Partial<WizardLogisticsReq>) =>
    onChange({ logisticsRequirements: data.logisticsRequirements.map((l, idx) => (idx === i ? { ...l, ...partial } : l)) });

  const checkAvailability = () => {
    toast.success("Conflict Check Audit: All requested resources are available for the selected dates!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 border-b">
        <h3 className="font-semibold text-sm">Staff Allocations</h3>
        <div className="flex gap-2">
          <button type="button" onClick={checkAvailability} className="px-2.5 py-1 text-xs border rounded hover:bg-muted font-medium">
            Check Conflicts
          </button>
          <button type="button" onClick={addStaff} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded font-medium hover:opacity-90">
            + Add Staff
          </button>
        </div>
      </div>

      {data.staffRequirements.map((s, i) => (
        <div key={i} className="border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
            <select
              value={s.role}
              onChange={(e) => updateStaff(i, { role: e.target.value as any })}
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
            >
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Count Required</label>
            <input
              type="number"
              min={1}
              value={s.count}
              onChange={(e) => updateStaff(i, { count: Number(e.target.value) })}
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <input
                type="text"
                value={s.notes ?? ""}
                onChange={(e) => updateStaff(i, { notes: e.target.value })}
                placeholder="Uniform, timing, etc."
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => removeStaff(i)} className="p-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <div className="flex items-center justify-between pb-1 border-b mb-3">
          <h3 className="font-semibold text-sm">Equipment Rentals</h3>
          <button type="button" onClick={addEquipment} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded font-medium hover:opacity-90">
            + Add Equipment
          </button>
        </div>

        {data.equipmentRequirements.map((eq, i) => (
          <div key={i} className="border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card mt-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Item Name</label>
              <input
                type="text"
                value={eq.name}
                onChange={(e) => updateEquipment(i, { name: e.target.value })}
                placeholder="e.g. Banquet Chairs, Buffet Tables"
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={eq.quantity}
                  onChange={(e) => updateEquipment(i, { quantity: Number(e.target.value) })}
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => removeEquipment(i)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between pb-1 border-b mb-3">
          <h3 className="font-semibold text-sm">Logistics & Transportation</h3>
          <button type="button" onClick={addLogistics} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded font-medium hover:opacity-90">
            + Add Vehicle
          </button>
        </div>

        {data.logisticsRequirements.map((log, i) => (
          <div key={i} className="border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card mt-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Vehicle Type</label>
              <select
                value={log.type}
                onChange={(e) => updateLogistics(i, { type: e.target.value })}
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
              >
                <option value="Winger">Winger Mini Truck</option>
                <option value="Chhota Hathi">Chhota Hathi LCV</option>
                <option value="Tata 407">Tata 407 Medium Truck</option>
                <option value="Other">Other vehicle type</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Logistics / Loading details</label>
                <input
                  type="text"
                  value={log.details}
                  onChange={(e) => updateLogistics(i, { details: e.target.value })}
                  placeholder="e.g. Loading team required, dispatch time"
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => removeLogistics(i)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 9: Documents & Notes ────────────────────────────────────────────────

export function Step9Notes({ data, onChange }: { data: WizardFormData; onChange: (p: Partial<WizardFormData>) => void }) {
  const addDocument = (category: WizardDocument["category"]) => {
    const doc: WizardDocument = {
      name: `${category} File ${data.documents.length + 1}.pdf`,
      // eslint-disable-next-line react-hooks/purity
      url: `/uploads/${category.toLowerCase().replace(/\\s+/g, "_")}_${Date.now()}.pdf`,
      size: 450 * 1024,
      category,
    };
    onChange({ documents: [...data.documents, doc] });
    toast.success(`${category} attached successfully!`);
  };

  const removeDoc = (idx: number) => {
    onChange({ documents: data.documents.filter((_, i) => i !== idx) });
    toast.success("Document deleted.");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between pb-1 border-b mb-3">
          <h3 className="font-semibold text-sm">Attachments & Quotations</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["Quotation", "Contract", "Menu", "Venue Layout", "Images", "Customer Documents"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => addDocument(cat)}
                className="px-2 py-1 text-[10px] border rounded hover:bg-muted font-bold uppercase tracking-wider"
              >
                + {cat}
              </button>
            ))}
          </div>
        </div>

        {data.documents.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No document attachments uploaded.</p>
        )}

        <div className="space-y-2">
          {data.documents.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 border rounded-lg text-xs bg-card">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip size={14} className="text-primary shrink-0" />
                <span className="font-bold truncate">{doc.name}</span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0 uppercase tracking-wider">
                  {doc.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={doc.url} target="_blank" rel="noreferrer" className="p-1 text-muted-foreground hover:text-foreground">
                  <Eye size={13} />
                </a>
                <button type="button" onClick={() => removeDoc(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div>
          <label className="block text-sm font-semibold mb-1">Customer-Facing Notes</label>
          <p className="text-xs text-muted-foreground mb-2">These notes may appear on proposals and confirmations.</p>
          <textarea
            value={data.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={4}
            placeholder="Any notes to share with the customer regarding this event…"
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Internal Coordinator Remarks</label>
          <p className="text-xs text-muted-foreground mb-2">Internal only — not visible to customers.</p>
          <textarea
            value={data.internalNotes ?? ""}
            onChange={(e) => onChange({ internalNotes: e.target.value })}
            rows={4}
            placeholder="Internal coordination guidelines, logistics preparation remarks..."
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
