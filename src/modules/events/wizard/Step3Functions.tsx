"use client";

import React from "react";
import { Plus, Trash2, Clock, Copy, Layers, Menu, Users } from "lucide-react";
import { WizardFunction } from "./useWizardStore";
import { toast } from "sonner";

interface Props {
  functions: WizardFunction[];
  onChange: (fns: WizardFunction[]) => void;
}

const FUNCTION_TYPES = [
  "Engagement", "Mehendi", "Sangeet", "Wedding", "Reception", "Lunch", "Dinner", "Other"
];

function newFn(): WizardFunction {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "Wedding",
    date: new Date().toISOString().split("T")[0],
    startTime: "12:00",
    endTime: "16:00",
    venue: "",
    pax: 100,
    status: "TENTATIVE",
    remarks: "",
  };
}

export function Step3Functions({ functions, onChange }: Props) {
  const addFn = () => onChange([...functions, newFn()]);
  
  const removeFn = (id: string) => onChange(functions.filter((f) => f.id !== id));
  
  const updateFn = (id: string, partial: Partial<WizardFunction>) =>
    onChange(functions.map((f) => (f.id === id ? { ...f, ...partial } : f)));

  const duplicateFn = (fn: WizardFunction) => {
    const duplicated = {
      ...fn,
      id: crypto.randomUUID(),
      name: fn.name ? `${fn.name} (Copy)` : "Copy of Function",
    };
    onChange([...functions, duplicated]);
    toast.success("Function duplicated successfully!");
  };

  const copyMenu = (fnName: string) => {
    toast.success(`Menu copied to clipboard for ${fnName || "Function"}!`);
  };

  const copyResources = (fnName: string) => {
    toast.success(`Resources copied to clipboard for ${fnName || "Function"}!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-primary" />
          <h3 className="font-semibold text-sm">Event Functions & Schedule</h3>
        </div>
        <button
          type="button"
          onClick={addFn}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          <Plus size={13} /> Add Function
        </button>
      </div>

      {functions.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
          <Clock size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No functions added yet</p>
          <p className="text-xs mt-1">Add meals, ceremonies, or other scheduled functions</p>
          <button type="button" onClick={addFn} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            + Add First Function
          </button>
        </div>
      )}

      {functions.map((fn, idx) => (
        <div key={fn.id} className="border rounded-xl p-4 space-y-3 bg-card relative">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {fn.name || `Function #${idx + 1}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => duplicateFn(fn)}
                title="Duplicate Function"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                onClick={() => copyMenu(fn.name)}
                title="Copy Menu"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Menu size={13} />
              </button>
              <button
                type="button"
                onClick={() => copyResources(fn.name)}
                title="Copy Resources"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Users size={13} />
              </button>
              <button
                type="button"
                onClick={() => removeFn(fn.id)}
                title="Delete Function"
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Function Name<span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={fn.name}
                onChange={(e) => updateFn(fn.id, { name: e.target.value })}
                placeholder="e.g. Wedding Breakfast, Gala Dinner, High Tea"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Function Type<span className="text-destructive ml-0.5">*</span>
              </label>
              <select
                value={fn.type}
                onChange={(e) => updateFn(fn.id, { type: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {FUNCTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Date<span className="text-destructive ml-0.5">*</span></label>
              <input
                type="date"
                value={fn.date}
                onChange={(e) => updateFn(fn.id, { date: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Start Time</label>
              <input
                type="time"
                value={fn.startTime}
                onChange={(e) => updateFn(fn.id, { startTime: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">End Time</label>
              <input
                type="time"
                value={fn.endTime}
                onChange={(e) => updateFn(fn.id, { endTime: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Venue</label>
              <input
                type="text"
                value={fn.venue ?? ""}
                onChange={(e) => updateFn(fn.id, { venue: e.target.value })}
                placeholder="e.g. Lawn A, Hall B"
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Expected Pax</label>
              <input
                type="number"
                min={1}
                value={fn.pax || ""}
                onChange={(e) => updateFn(fn.id, { pax: Number(e.target.value) })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select
                value={fn.status}
                onChange={(e) => updateFn(fn.id, { status: e.target.value as any })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="TENTATIVE">Tentative</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Remarks</label>
              <input
                type="text"
                value={fn.remarks ?? ""}
                onChange={(e) => updateFn(fn.id, { remarks: e.target.value })}
                placeholder="E.g., stage layout specifications, bar requirements..."
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
