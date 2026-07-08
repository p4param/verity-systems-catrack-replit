import { z } from "zod";

// ─── Rate Contracts ─────────────────────────────────────────────────────────────
export const CreateVendorRateSchema = z.object({
    vendorId: z.number().int().positive(),
    apparelId: z.number().int().positive(),
    washingRate: z.number().min(0),
    ironingRate: z.number().min(0).optional(),
    dryCleaningRate: z.number().min(0).optional(),
    effectiveFrom: z.coerce.date(),
    effectiveTo: z.coerce.date().optional(),
});

export const UpdateVendorRateSchema = z.object({
    washingRate: z.number().min(0).optional(),
    ironingRate: z.number().min(0).nullable().optional(),
    dryCleaningRate: z.number().min(0).nullable().optional(),
    effectiveTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
});

// ─── Invoices ───────────────────────────────────────────────────────────────────
export const GenerateInvoiceSchema = z.object({
    vendorId: z.number().int().positive(),
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
    remarks: z.string().optional(),
});

// ─── Payments ───────────────────────────────────────────────────────────────────
export const CreatePaymentSchema = z.object({
    vendorId: z.number().int().positive(),
    paymentDate: z.coerce.date(),
    amount: z.number().positive(),
    paymentMethod: z.enum(["BANK_TRANSFER", "CHEQUE", "CASH", "ONLINE"]),
    referenceNo: z.string().optional(),
    remarks: z.string().optional(),
    allocations: z.array(z.object({
        invoiceId: z.number().int().positive(),
        amountApplied: z.number().positive(),
    })).min(1),
});

// ─── Liabilities ────────────────────────────────────────────────────────────────
export const WaiveLiabilitySchema = z.object({
    remarks: z.string().min(1, "Waiver reason is required"),
});

// ─── Statement & Report Queries ─────────────────────────────────────────────────
export const VendorStatementQuerySchema = z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
});

export const VendorAgingQuerySchema = z.object({
    vendorId: z.string().transform(v => parseInt(v)).pipe(z.number().int().positive()).optional(),
});

export const ReportQuerySchema = z.object({
    vendorId: z.string().transform(v => parseInt(v)).pipe(z.number().int().positive()).optional(),
    apparelId: z.string().transform(v => parseInt(v)).pipe(z.number().int().positive()).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
});

// ─── Loss Responsibility (used in LaundryReturn extension) ──────────────────────
export const LossResponsibilityEnum = z.enum([
    "CUSTOMER",
    "LAUNDRY_VENDOR",
    "COMPANY",
    "EVENT_TEAM",
    "UNKNOWN",
]);
