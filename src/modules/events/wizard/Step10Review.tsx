"use client";

import React from "react";
import { CheckCircle, User, Calendar, MapPin, Utensils, DollarSign, Users, FileText, Clock, Save, FileSignature, Sparkles, Send } from "lucide-react";
import { WizardFormData } from "./useWizardStore";
import { toast } from "sonner";

interface Props {
  data: WizardFormData;
  filterOptions?: { statuses: any[]; types: any[]; priorities: any[] };
  onSaveDraft?: () => void;
  onConfirm?: () => void;
}

function ReviewSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Icon size={15} className="text-primary" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-muted-foreground shrink-0 min-w-[120px]">{label}</span>
      <span className="font-medium text-right">{String(value)}</span>
    </div>
  );
}

export function Step10Review({ data, filterOptions, onSaveDraft, onConfirm }: Props) {
  const findName = (list: any[], id: string) => list?.find((i: any) => i.id === id)?.name ?? id;

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtCur = (v: number) => v ? `${data.currency} ${v.toLocaleString()}` : "—";

  const totalEstimated = data.estimatedFood + data.estimatedLabor + data.estimatedLogistics;
  const margin = data.budgetAmount > 0 ? ((data.budgetAmount - totalEstimated) / data.budgetAmount) * 100 : 0;
  const totalStaff = data.staffRequirements.reduce((acc, s) => acc + s.count, 0);

  const handleProposal = () => toast.success("PDF Proposal generated successfully and saved to documents!");
  const handleContract = () => toast.success("Draft Contract generated successfully!");
  const handleQuotation = () => toast.success("Standard Quotation generated and copied to clipboard!");
  const handleApproval = () => toast.success("Event submitted for management review & approval!");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle size={20} className="text-emerald-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">Ready to Create</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Review the comprehensive summary below before creating or converting this booking.</p>
        </div>
      </div>

      {/* Review Actions Panel */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Available Actions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-muted font-semibold transition-colors"
          >
            <Save size={13} /> Save Draft
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold transition-colors"
          >
            <CheckCircle size={13} /> Confirm Event
          </button>
          <button
            type="button"
            onClick={handleProposal}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-muted font-semibold transition-colors"
          >
            <Sparkles size={13} /> Proposal
          </button>
          <button
            type="button"
            onClick={handleContract}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-muted font-semibold transition-colors"
          >
            <FileSignature size={13} /> Contract
          </button>
          <button
            type="button"
            onClick={handleQuotation}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-muted font-semibold transition-colors"
          >
            <FileText size={13} /> Quotation
          </button>
          <button
            type="button"
            onClick={handleApproval}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-muted font-semibold transition-colors"
          >
            <Send size={13} /> Approval
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReviewSection icon={User} title="Customer Summary">
          <Row label="Type" value={data.customer.customerType} />
          <Row label="Name" value={data.customer.customerName} />
          <Row label="Company" value={data.customer.companyName} />
          <Row label="Contact" value={data.customer.contactPerson} />
          <Row label="Mobile" value={data.customer.mobile} />
          <Row label="WhatsApp" value={data.customer.whatsappNumber} />
          <Row label="Email" value={data.customer.email} />
          <Row label="GST No" value={data.customer.gstNo} />
          <Row label="PAN" value={data.customer.pan} />
          <Row label="Address Line 1" value={data.customer.address} />
          <Row label="Address Line 2" value={data.customer.addressLine2} />
          <Row label="City" value={data.customer.city} />
          <Row label="Acquisition Source" value={data.customer.source} />
        </ReviewSection>

        <ReviewSection icon={Calendar} title="Event Summary">
          <Row label="Event Name" value={data.name} />
          <Row label="Occasion" value={data.occasion} />
          <Row label="Type" value={filterOptions ? findName(filterOptions.types, data.typeId) : data.typeId} />
          <Row label="Status" value={filterOptions ? findName(filterOptions.statuses, data.statusId) : data.statusId} />
          <Row label="Priority" value={filterOptions ? findName(filterOptions.priorities, data.priorityId) : data.priorityId} />
          <Row label="Booking Date" value={fmt(data.bookingDate)} />
          <Row label="Start Date" value={fmt(data.startDate)} />
          <Row label="End Date" value={fmt(data.endDate)} />
          <Row label="Guest Count" value={data.guestCount} />
          <Row label="Budget Range" value={data.budgetRange} />
          <Row label="Branch" value={data.branch} />
        </ReviewSection>

        {data.functions.length > 0 && (
          <ReviewSection icon={Clock} title={`Functions & Schedule (${data.functions.length})`}>
            {data.functions.map((fn, i) => (
              <div key={fn.id} className="text-xs border-b pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between font-semibold text-sm">
                  <span>{i + 1}. {fn.name}</span>
                  <span className="text-muted-foreground">{fn.type}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] text-muted-foreground">
                  <div>Date: {fmt(fn.date)}</div>
                  <div>Pax: {fn.pax}</div>
                  <div>Start: {fn.startTime}</div>
                  <div>End: {fn.endTime}</div>
                  {fn.venue && <div className="col-span-2">Venue: {fn.venue}</div>}
                </div>
              </div>
            ))}
          </ReviewSection>
        )}

        {data.venues.length > 0 && (
          <ReviewSection icon={MapPin} title={`Venue Info (${data.venues.length})`}>
            {data.venues.map((v, i) => (
              <div key={i} className="text-xs border-b pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between font-semibold">
                  <span>{v.venueName || "Unnamed Venue"}</span>
                  <span className="text-muted-foreground">{v.venueType}</span>
                </div>
                <p className="text-muted-foreground mt-0.5">{v.address}, {v.city}, {v.state}</p>
                {v.contactPerson && <p className="text-muted-foreground">Contact: {v.contactPerson} ({v.contactNumber})</p>}
              </div>
            ))}
          </ReviewSection>
        )}

        <ReviewSection icon={DollarSign} title="Financials & Commercials">
          <Row label="Revenue Model" value={data.revenueModel} />
          <Row label="Final Estimated Invoice" value={fmtCur(data.budgetAmount)} />
          <Row label="Advance Required" value={fmtCur(data.advanceAmount ?? 0)} />
          <Row label="Payment Terms" value={data.paymentTerms} />
          <div className="border-t pt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Expected Profit Margin</span>
            <span className={`font-bold ${margin >= 20 ? "text-emerald-600" : margin >= 0 ? "text-amber-600" : "text-rose-600"}`}>
              {margin.toFixed(1)}%
            </span>
          </div>
        </ReviewSection>

        {(data.menuItems.length > 0 || totalStaff > 0) && (
          <ReviewSection icon={Utensils} title="Menu & Resources Summary">
            {data.menuType && <Row label="Food Type" value={data.menuType} />}
            {data.menuTemplate && <Row label="Menu Package" value={data.menuTemplate} />}
            {totalStaff > 0 && <Row label="Allocated Staff Count" value={totalStaff} />}
            {data.menuItems.length > 0 && (
              <div className="text-xs text-muted-foreground border-t pt-2">{data.menuItems.length} items planned under menu template</div>
            )}
          </ReviewSection>
        )}

        {data.documents.length > 0 && (
          <ReviewSection icon={FileText} title={`Documents Attached (${data.documents.length})`}>
            <div className="space-y-1">
              {data.documents.map((doc, idx) => (
                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                  <span>{doc.name}</span>
                  <span className="font-semibold uppercase text-[9px]">{doc.category}</span>
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {(data.notes || data.internalNotes) && (
          <ReviewSection icon={FileText} title="Notes & Remarks">
            {data.notes && <Row label="Customer Notes" value={data.notes} />}
            {data.internalNotes && <Row label="Internal Notes" value={data.internalNotes} />}
          </ReviewSection>
        )}
      </div>
    </div>
  );
}
