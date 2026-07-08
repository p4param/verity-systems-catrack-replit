import { prisma } from "../../prisma";
import { createAuditLog } from "../../audit";
import { DocumentNumberService } from "./document-number-service";
import { VendorLedgerService } from "./vendor-ledger-service";

/**
 * Manages vendor payments and their allocation to invoices.
 * Supports partial payments, multi-invoice allocation, and over-allocation prevention.
 */
export class VendorPaymentService {
    /**
     * Creates a payment with invoice allocations.
     * Validates: allocation total ≤ payment amount, per-invoice allocation ≤ outstanding.
     */
    static async createPayment(input: {
        tenantId: number;
        vendorId: number;
        paymentDate: Date;
        amount: number;
        paymentMethod: string;
        referenceNo?: string;
        remarks?: string;
        allocations: { invoiceId: number; amountApplied: number }[];
        createdBy: number;
    }) {
        return await prisma.$transaction(async (tx) => {
            // 1. Validate allocation total ≤ payment amount
            const allocationTotal = input.allocations.reduce((sum, a) => sum + a.amountApplied, 0);
            if (allocationTotal > input.amount) {
                throw new Error(
                    `Total allocation (${allocationTotal}) exceeds payment amount (${input.amount}).`
                );
            }

            // 2. Validate per-invoice allocation ≤ outstanding
            for (const alloc of input.allocations) {
                const invoice = await tx.laundryVendorInvoice.findUniqueOrThrow({
                    where: { id: alloc.invoiceId, tenantId: input.tenantId },
                });

                if (invoice.vendorId !== input.vendorId) {
                    throw new Error(`Invoice ${invoice.invoiceNo} does not belong to vendor ${input.vendorId}.`);
                }

                if (invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
                    throw new Error(`Cannot allocate payment to invoice ${invoice.invoiceNo} with status ${invoice.status}.`);
                }

                const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
                if (alloc.amountApplied > outstanding) {
                    throw new Error(
                        `Allocation (${alloc.amountApplied}) exceeds outstanding (${outstanding}) for invoice ${invoice.invoiceNo}.`
                    );
                }
            }

            // 3. Generate payment number
            const paymentNo = await DocumentNumberService.getNextNumber(
                input.tenantId,
                "LAUNDRY_VENDOR_PAYMENT",
                tx
            );

            // 4. Create payment
            const payment = await tx.vendorPayment.create({
                data: {
                    tenantId: input.tenantId,
                    paymentNo,
                    vendorId: input.vendorId,
                    paymentDate: input.paymentDate,
                    amount: input.amount,
                    paymentMethod: input.paymentMethod,
                    referenceNo: input.referenceNo,
                    remarks: input.remarks,
                    status: "DRAFT",
                    createdBy: input.createdBy,
                },
            });

            // 5. Create allocations
            for (const alloc of input.allocations) {
                await tx.vendorPaymentAllocation.create({
                    data: {
                        paymentId: payment.id,
                        invoiceId: alloc.invoiceId,
                        amountApplied: alloc.amountApplied,
                    },
                });
            }

            await createAuditLog({
                tenantId: input.tenantId,
                actorUserId: input.createdBy,
                action: "VENDOR_BILLING.PAYMENT_CREATED",
                details: `Created payment ${paymentNo} for vendor ${input.vendorId}: amount=${input.amount}`,
            }, tx);

            return await tx.vendorPayment.findUniqueOrThrow({
                where: { id: payment.id },
                include: { allocations: { include: { invoice: true } } },
            });
        });
    }

    /**
     * Posts a payment (DRAFT → POSTED).
     * Updates invoice paidAmounts and statuses. Creates VendorLedger credit entry.
     */
    static async postPayment(tenantId: number, paymentId: number, userId: number) {
        return await prisma.$transaction(async (tx) => {
            const payment = await tx.vendorPayment.findUniqueOrThrow({
                where: { id: paymentId, tenantId },
                include: { allocations: true },
            });

            if (payment.status !== "DRAFT") {
                throw new Error(`Payment can only be posted from DRAFT status. Current: ${payment.status}`);
            }

            // Re-validate allocations against current invoice state
            for (const alloc of payment.allocations) {
                const invoice = await tx.laundryVendorInvoice.findUniqueOrThrow({
                    where: { id: alloc.invoiceId },
                });
                const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
                if (Number(alloc.amountApplied) > outstanding) {
                    throw new Error(
                        `Allocation (${alloc.amountApplied}) exceeds current outstanding (${outstanding}) for invoice ID ${invoice.id}.`
                    );
                }
            }

            // Post payment
            const updated = await tx.vendorPayment.update({
                where: { id: paymentId },
                data: { status: "POSTED" },
            });

            // Update invoice paidAmounts and statuses
            for (const alloc of payment.allocations) {
                const invoice = await tx.laundryVendorInvoice.update({
                    where: { id: alloc.invoiceId },
                    data: {
                        paidAmount: { increment: Number(alloc.amountApplied) },
                    },
                });

                const newPaid = Number(invoice.paidAmount);
                const total = Number(invoice.totalAmount);
                let newStatus = invoice.status;

                if (newPaid >= total) {
                    newStatus = "PAID";
                } else if (newPaid > 0) {
                    newStatus = "PARTIALLY_PAID";
                }

                if (newStatus !== invoice.status) {
                    await tx.laundryVendorInvoice.update({
                        where: { id: alloc.invoiceId },
                        data: { status: newStatus },
                    });
                }
            }

            // Create ledger CREDIT entry
            await VendorLedgerService.appendEntry({
                tenantId,
                vendorId: payment.vendorId,
                transactionDate: payment.paymentDate,
                transactionType: "PAYMENT",
                referenceType: "PAYMENT",
                referenceId: payment.id,
                debit: 0,
                credit: Number(payment.amount),
                remarks: `Payment ${payment.paymentNo} posted`,
            }, tx);

            await createAuditLog({
                tenantId,
                actorUserId: userId,
                action: "VENDOR_BILLING.PAYMENT_POSTED",
                details: `Posted payment ${payment.paymentNo}, amount=${payment.amount}`,
            }, tx);

            return updated;
        });
    }

    /**
     * Voids a posted payment. Creates reversing ledger entries and resets invoice paidAmounts.
     */
    static async voidPayment(tenantId: number, paymentId: number, userId: number) {
        return await prisma.$transaction(async (tx) => {
            const payment = await tx.vendorPayment.findUniqueOrThrow({
                where: { id: paymentId, tenantId },
                include: { allocations: true },
            });

            if (payment.status !== "POSTED") {
                throw new Error(`Only POSTED payments can be voided. Current: ${payment.status}`);
            }

            // Void the payment
            const updated = await tx.vendorPayment.update({
                where: { id: paymentId },
                data: { status: "VOID" },
            });

            // Reverse invoice paidAmounts and statuses
            for (const alloc of payment.allocations) {
                const invoice = await tx.laundryVendorInvoice.update({
                    where: { id: alloc.invoiceId },
                    data: {
                        paidAmount: { decrement: Number(alloc.amountApplied) },
                    },
                });

                const newPaid = Number(invoice.paidAmount);
                let newStatus = invoice.status;

                if (newPaid <= 0) {
                    newStatus = "POSTED";
                } else {
                    newStatus = "PARTIALLY_PAID";
                }

                if (newStatus !== invoice.status) {
                    await tx.laundryVendorInvoice.update({
                        where: { id: alloc.invoiceId },
                        data: { status: newStatus },
                    });
                }
            }

            // Create reversing ledger entry
            await VendorLedgerService.appendEntry({
                tenantId,
                vendorId: payment.vendorId,
                transactionDate: new Date(),
                transactionType: "PAYMENT",
                referenceType: "PAYMENT",
                referenceId: payment.id,
                debit: Number(payment.amount),
                credit: 0,
                remarks: `Payment ${payment.paymentNo} voided — reversing entry`,
            }, tx);

            await createAuditLog({
                tenantId,
                actorUserId: userId,
                action: "VENDOR_BILLING.PAYMENT_VOIDED",
                details: `Voided payment ${payment.paymentNo}`,
            }, tx);

            return updated;
        });
    }

    /**
     * Gets a single payment with allocations.
     */
    static async getPayment(tenantId: number, paymentId: number) {
        return await prisma.vendorPayment.findUnique({
            where: { id: paymentId, tenantId },
            include: {
                vendor: true,
                allocations: { include: { invoice: true } },
            },
        });
    }

    /**
     * Lists payments with optional filters.
     */
    static async listPayments(
        tenantId: number,
        options?: { vendorId?: number; status?: string }
    ) {
        const where: any = { tenantId };
        if (options?.vendorId) where.vendorId = options.vendorId;
        if (options?.status) where.status = options.status;

        return await prisma.vendorPayment.findMany({
            where,
            include: { vendor: true, allocations: true },
            orderBy: { createdAt: "desc" },
        });
    }
}
