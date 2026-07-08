import { prisma } from "../../prisma";
import { Prisma } from "../../../generated/client";
import { createAuditLog } from "../../audit";
import { DocumentNumberService } from "./document-number-service";
import { VendorRateService } from "./vendor-rate-service";
import { VendorLedgerService } from "./vendor-ledger-service";

/**
 * Generates and manages vendor invoices from laundry return movements.
 * Invoices are auto-generated from LAUNDRY_RETURN_RECEIVED movements
 * that haven't been billed yet (via LaundryBillingSource exclusion).
 */
export class VendorInvoiceService {
    /**
     * Auto-generates an invoice from unbilled LAUNDRY_RETURN_RECEIVED movements
     * for a specific vendor within a date range.
     */
    static async generateInvoice(input: {
        tenantId: number;
        vendorId: number;
        fromDate: Date;
        toDate: Date;
        remarks?: string;
        createdBy: number;
    }) {
        return await prisma.$transaction(async (tx) => {
            // 1. Find unbilled LAUNDRY_RETURN_RECEIVED movements for this vendor
            //    Movements are linked to vendor via LaundryOrder reference
            const unbilledMovements = await tx.stockMovement.findMany({
                where: {
                    tenantId: input.tenantId,
                    movementType: "LAUNDRY_RETURN_RECEIVED",
                    createdAt: { gte: input.fromDate, lte: input.toDate },
                    referenceType: "LAUNDRY",
                    billingSource: null, // Not yet billed
                },
                include: {
                    apparel: true,
                },
            });

            if (unbilledMovements.length === 0) {
                throw new Error("No unbilled laundry return movements found for this vendor in the specified period.");
            }

            // 2. Filter to movements that belong to this vendor's laundry orders
            const referenceIds = [...new Set(unbilledMovements.map(m => m.referenceId).filter((id): id is number => id !== null))];
            const vendorOrders = await tx.laundryOrder.findMany({
                where: {
                    id: { in: referenceIds },
                    vendorId: input.vendorId,
                    tenantId: input.tenantId,
                },
                select: { id: true },
            });
            const vendorOrderIds = new Set(vendorOrders.map(o => o.id));

            const vendorMovements = unbilledMovements.filter(
                m => m.referenceId !== null && vendorOrderIds.has(m.referenceId)
            );

            if (vendorMovements.length === 0) {
                throw new Error("No unbilled laundry return movements found for this vendor in the specified period.");
            }

            // 3. Group by apparel and aggregate quantities
            const apparelGroups: Record<number, { apparelId: number; quantity: number; movements: typeof vendorMovements }> = {};
            for (const m of vendorMovements) {
                if (!apparelGroups[m.apparelId]) {
                    apparelGroups[m.apparelId] = { apparelId: m.apparelId, quantity: 0, movements: [] };
                }
                apparelGroups[m.apparelId].quantity += Math.abs(m.quantityChange);
                apparelGroups[m.apparelId].movements.push(m);
            }

            // 4. Look up active rates for each apparel and build invoice items
            const invoiceItems: { apparelId: number; quantity: number; rate: number; amount: number }[] = [];
            let subtotal = 0;

            for (const group of Object.values(apparelGroups)) {
                const rate = await VendorRateService.getActiveRate(
                    input.tenantId,
                    input.vendorId,
                    group.apparelId,
                    input.toDate,
                    tx
                );

                if (!rate) {
                    const apparel = vendorMovements.find(m => m.apparelId === group.apparelId)?.apparel;
                    throw new Error(
                        `No active rate found for vendor ${input.vendorId}, apparel "${apparel?.name ?? group.apparelId}" on date ${input.toDate.toISOString().split("T")[0]}.`
                    );
                }

                const washingRate = Number(rate.washingRate);
                const amount = group.quantity * washingRate;
                subtotal += amount;

                invoiceItems.push({
                    apparelId: group.apparelId,
                    quantity: group.quantity,
                    rate: washingRate,
                    amount,
                });
            }

            // 5. Get tax rate from InventorySettings
            const settings = await tx.inventorySettings.findUnique({
                where: { tenantId: input.tenantId },
            });
            const taxRate = Number(settings?.defaultTaxRate ?? 0);
            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = subtotal + taxAmount;

            // 6. Generate invoice number
            const invoiceNo = await DocumentNumberService.getNextNumber(
                input.tenantId,
                "LAUNDRY_VENDOR_INVOICE",
                tx
            );

            // 7. Create the invoice
            const invoice = await tx.laundryVendorInvoice.create({
                data: {
                    tenantId: input.tenantId,
                    invoiceNo,
                    vendorId: input.vendorId,
                    fromDate: input.fromDate,
                    toDate: input.toDate,
                    invoiceDate: new Date(),
                    subtotal,
                    taxRate,
                    taxAmount,
                    totalAmount,
                    status: "DRAFT",
                    remarks: input.remarks,
                    createdBy: input.createdBy,
                    items: {
                        create: invoiceItems.map(item => ({
                            apparelId: item.apparelId,
                            quantity: item.quantity,
                            rate: item.rate,
                            amount: item.amount,
                        })),
                    },
                },
                include: { items: true },
            });

            // 8. Create billing source links (prevent double-billing)
            for (const group of Object.values(apparelGroups)) {
                for (const movement of group.movements) {
                    await tx.laundryBillingSource.create({
                        data: {
                            tenantId: input.tenantId,
                            invoiceId: invoice.id,
                            stockMovementId: movement.id,
                            quantity: Math.abs(movement.quantityChange),
                        },
                    });
                }
            }

            // 9. Audit
            await createAuditLog({
                tenantId: input.tenantId,
                actorUserId: input.createdBy,
                action: "VENDOR_BILLING.INVOICE_CREATED",
                details: `Generated invoice ${invoiceNo} for vendor ${input.vendorId}: subtotal=${subtotal}, tax=${taxAmount}, total=${totalAmount}`,
            }, tx);

            return invoice;
        });
    }

    /**
     * Posts an invoice (DRAFT → POSTED). Creates VendorLedger debit entry.
     * Invoice items become immutable after posting.
     */
    static async postInvoice(tenantId: number, invoiceId: number, userId: number) {
        return await prisma.$transaction(async (tx) => {
            const invoice = await tx.laundryVendorInvoice.findUniqueOrThrow({
                where: { id: invoiceId, tenantId },
            });

            if (invoice.status !== "DRAFT") {
                throw new Error(`Invoice can only be posted from DRAFT status. Current: ${invoice.status}`);
            }

            const updated = await tx.laundryVendorInvoice.update({
                where: { id: invoiceId },
                data: { status: "POSTED" },
            });

            // Create ledger DEBIT entry (vendor owes us nothing — we owe them)
            await VendorLedgerService.appendEntry({
                tenantId,
                vendorId: invoice.vendorId,
                transactionDate: invoice.invoiceDate,
                transactionType: "INVOICE",
                referenceType: "INVOICE",
                referenceId: invoice.id,
                debit: Number(invoice.totalAmount),
                credit: 0,
                remarks: `Invoice ${invoice.invoiceNo} posted`,
            }, tx);

            await createAuditLog({
                tenantId,
                actorUserId: userId,
                action: "VENDOR_BILLING.INVOICE_POSTED",
                details: `Posted invoice ${invoice.invoiceNo}, total=${invoice.totalAmount}`,
            }, tx);

            return updated;
        });
    }

    /**
     * Cancels an invoice. Creates a reversing ledger entry if previously posted.
     */
    static async cancelInvoice(tenantId: number, invoiceId: number, userId: number) {
        return await prisma.$transaction(async (tx) => {
            const invoice = await tx.laundryVendorInvoice.findUniqueOrThrow({
                where: { id: invoiceId, tenantId },
            });

            if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
                throw new Error(`Cannot cancel invoice with status: ${invoice.status}`);
            }

            if (Number(invoice.paidAmount) > 0) {
                throw new Error("Cannot cancel an invoice that has payments allocated. Void the payments first.");
            }

            const updated = await tx.laundryVendorInvoice.update({
                where: { id: invoiceId },
                data: { status: "CANCELLED", deletedAt: new Date() },
            });

            // If it was POSTED, create reversing ledger entry
            if (invoice.status === "POSTED" || invoice.status === "PARTIALLY_PAID") {
                await VendorLedgerService.appendEntry({
                    tenantId,
                    vendorId: invoice.vendorId,
                    transactionDate: new Date(),
                    transactionType: "CREDIT_NOTE",
                    referenceType: "INVOICE",
                    referenceId: invoice.id,
                    debit: 0,
                    credit: Number(invoice.totalAmount),
                    remarks: `Invoice ${invoice.invoiceNo} cancelled — reversing entry`,
                }, tx);
            }

            // Release billing sources so movements can be rebilled
            await tx.laundryBillingSource.deleteMany({
                where: { invoiceId: invoice.id, tenantId },
            });

            await createAuditLog({
                tenantId,
                actorUserId: userId,
                action: "VENDOR_BILLING.INVOICE_CANCELLED",
                details: `Cancelled invoice ${invoice.invoiceNo}`,
            }, tx);

            return updated;
        });
    }

    /**
     * Gets a single invoice with items.
     */
    static async getInvoice(tenantId: number, invoiceId: number) {
        return await prisma.laundryVendorInvoice.findUnique({
            where: { id: invoiceId, tenantId },
            include: {
                vendor: true,
                items: { include: { apparel: true } },
                billingSources: true,
                paymentAllocations: { include: { payment: true } },
            },
        });
    }

    /**
     * Lists invoices with optional filters.
     */
    static async listInvoices(
        tenantId: number,
        options?: { vendorId?: number; status?: string }
    ) {
        const where: any = { tenantId, deletedAt: null };
        if (options?.vendorId) where.vendorId = options.vendorId;
        if (options?.status) where.status = options.status;

        return await prisma.laundryVendorInvoice.findMany({
            where,
            include: { vendor: true, items: true },
            orderBy: { createdAt: "desc" },
        });
    }
}
