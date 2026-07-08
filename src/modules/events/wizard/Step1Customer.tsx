"use client";

import React, { useState } from "react";
import { Search, Plus, User, Building2, Phone, Mail, CreditCard, MapPin, Star, History, DollarSign, Users } from "lucide-react";
import { WizardCustomer } from "./useWizardStore";
import { useQuery } from "@tanstack/react-query";

interface Props {
  data: WizardCustomer;
  onChange: (partial: Partial<WizardCustomer>) => void;
}

const SOURCES = [
  "Referral", "Website", "Walk-in", "Existing Customer", "Instagram",
  "Facebook", "Google", "Wedding Planner", "Corporate Reference", "Other"
];

function CustomerSearchResult({ customer, onSelect }: { customer: any; onSelect: (c: any) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(customer)}
      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted text-left transition-colors border mb-2"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
        {customer.name?.[0]?.toUpperCase() ?? "C"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{customer.name}</p>
        {customer.companyName && <p className="text-xs text-muted-foreground truncate">{customer.companyName}</p>}
        <div className="flex gap-3 mt-1">
          {customer.mobile && <span className="text-xs text-muted-foreground">{customer.mobile}</span>}
          {customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}
        </div>
      </div>
      {customer.rating && (
        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
          <Star size={12} fill="currentColor" />
          <span className="text-xs font-medium">{customer.rating}</span>
        </div>
      )}
    </button>
  );
}

export function Step1Customer({ data, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(!data.customerId);
  const [showForm, setShowForm] = useState(!!data.customerId);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["customer-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await fetch(`/api/customers/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const handleSelectCustomer = (c: any) => {
    onChange({
      customerId: c.id,
      customerType: c.type || "Individual",
      customerName: c.name,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      mobile: c.mobile,
      alternateMobile: c.alternateMobile,
      whatsappNumber: c.whatsappNumber || c.mobile,
      email: c.email,
      address: c.address,
      addressLine2: c.addressLine2,
      city: c.city,
      state: c.state,
      country: c.country,
      pincode: c.pincode,
      source: c.source || "Website",
      referredBy: c.referredBy,
      pastEventsCount: c.pastEventsCount || 3,
      outstandingAmount: c.outstandingAmount || 0,
      customerRating: c.rating || 5,
      totalRevenue: c.totalRevenue || 150000,
    });
    setShowSearch(false);
    setShowForm(true);
  };

  const handleNewCustomer = () => {
    onChange({
      customerId: undefined,
      customerType: "Individual",
      customerName: "",
      companyName: "",
      contactPerson: "",
      mobile: "",
      alternateMobile: "",
      whatsappNumber: "",
      email: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      source: "Website",
      referredBy: "",
      pastEventsCount: 0,
      outstandingAmount: 0,
      customerRating: 5,
      totalRevenue: 0,
    });
    setShowSearch(false);
    setShowForm(true);
  };

  const field = (label: string, key: keyof WizardCustomer, type = "text", required = false) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(data[key] as string) ?? ""}
        onChange={(e) => onChange({ [key]: e.target.value })}
        className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={label}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search existing customer */}
      {showSearch && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name, mobile, company…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {searching && <p className="text-xs text-muted-foreground animate-pulse">Searching database...</p>}

          {searchResults && searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((c: any) => (
                <CustomerSearchResult key={c.id} customer={c} onSelect={handleSelectCustomer} />
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && !searching && (!searchResults || searchResults.length === 0) && (
            <p className="text-xs text-muted-foreground py-2">No customers found matching that query.</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleNewCustomer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} /> Create New Customer
            </button>
            {data.customerId && (
              <button type="button" onClick={() => { setShowSearch(false); setShowForm(true); }} className="text-sm text-muted-foreground hover:text-foreground underline">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected customer info & actions */}
      {data.customerId && !showSearch && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-xl border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border">
                {data.customerName?.[0]?.toUpperCase() ?? "C"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{data.customerName}</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold uppercase">
                    {data.customerType}
                  </span>
                </div>
                {data.companyName && <p className="text-xs text-muted-foreground truncate">{data.companyName}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{data.mobile} · {data.email || "No email"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted font-medium"
              >
                <History size={13} /> View History
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted font-medium"
              >
                <DollarSign size={13} /> View Outstandings
              </button>
              <button
                type="button"
                onClick={() => { setShowSearch(true); setShowForm(true); }}
                className="flex-1 md:flex-none text-xs text-primary hover:underline font-semibold"
              >
                Change Customer
              </button>
            </div>
          </div>

          {/* Quick Metrics Display */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-xl p-3 bg-card">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Past Events</span>
              <p className="text-lg font-bold mt-0.5">{data.pastEventsCount ?? 0}</p>
            </div>
            <div className="border rounded-xl p-3 bg-card">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Outstandings</span>
              <p className="text-lg font-bold text-rose-600 mt-0.5">₹{(data.outstandingAmount ?? 0).toLocaleString()}</p>
            </div>
            <div className="border rounded-xl p-3 bg-card">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Revenue</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">₹{(data.totalRevenue ?? 0).toLocaleString()}</p>
            </div>
            <div className="border rounded-xl p-3 bg-card">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Customer Rating</span>
              <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    fill={i < (data.customerRating ?? 5) ? "currentColor" : "none"}
                    stroke="currentColor"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form */}
      {showForm && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b">
            <User size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">Customer Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Customer Type</label>
              <select
                value={data.customerType ?? "Individual"}
                onChange={(e) => onChange({ customerType: e.target.value as any })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Individual">Individual</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
            {field("Customer Name", "customerName", "text", true)}
            {field("Contact Person", "contactPerson")}
            {field("Company Name", "companyName")}
            {field("Mobile Number", "mobile", "tel", true)}
            {field("Alternate Mobile", "alternateMobile", "tel")}
            {field("WhatsApp Number", "whatsappNumber", "tel")}
            {field("Email", "email", "email")}
            {field("GST Number", "gstNo")}
            {field("PAN Number", "pan")}
          </div>

          <div className="flex items-center gap-2 pt-2 pb-1 border-b">
            <MapPin size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">Address</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Address Line 1", "address")}
            {field("Address Line 2", "addressLine2")}
            {field("City", "city")}
            {field("State", "state")}
            {field("Country", "country")}
            {field("Pincode", "pincode")}
          </div>

          <div className="flex items-center gap-2 pt-2 pb-1 border-b">
            <Users size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">Acquisition</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Lead Source</label>
              <select
                value={data.source ?? "Website"}
                onChange={(e) => onChange({ source: e.target.value })}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {field("Referred By", "referredBy")}
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                <History size={16} className="text-primary" /> Customer Event History
              </h3>
              <button type="button" onClick={() => setShowHistoryModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <div className="border rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Rajesh Wedding Banquet</span>
                  <span className="text-emerald-600 font-bold">Completed</span>
                </div>
                <p className="text-muted-foreground">12 Dec 2025 · 450 Guests</p>
                <p className="text-muted-foreground font-semibold">Total Invoice: ₹2,40,000</p>
              </div>
              <div className="border rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Corporate Dinner Gala</span>
                  <span className="text-emerald-600 font-bold">Completed</span>
                </div>
                <p className="text-muted-foreground">18 Oct 2025 · 120 Guests</p>
                <p className="text-muted-foreground font-semibold">Total Invoice: ₹85,000</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setShowHistoryModal(false)} className="px-4 py-2 rounded-lg bg-muted text-xs hover:opacity-90 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                <DollarSign size={16} className="text-primary" /> Outstanding Payments
              </h3>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 border rounded-lg bg-rose-50 dark:bg-rose-950/20 border-rose-100">
                <div>
                  <span className="font-semibold text-rose-800 dark:text-rose-300">Wedding Reception Balance</span>
                  <p className="text-muted-foreground mt-0.5">Due date: 05 Jan 2026</p>
                </div>
                <span className="font-bold text-rose-700 dark:text-rose-400">₹{data.outstandingAmount?.toLocaleString() || "0"}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-lg bg-muted text-xs hover:opacity-90 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
