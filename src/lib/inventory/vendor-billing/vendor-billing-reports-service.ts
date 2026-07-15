import { prisma } from "../../prisma";

interface ReportFilter {
    tenantId: string;
    vendorId?: number;
    apparelId?: number;
    fromDate?: Date;
    toDate?: Date;
}

/**
 * All vendor billing reports.
 */
export class VendorBillingReportsService {
    /**
     * Vendor Invoice Register — all invoices with vendor, dates, amounts, status.
     */
    static async getInvoiceRegister(filter: ReportFilter) {
        const where: any = { tenantId: filter.tenantId, deletedAt: null };
        if (filter.vendorId) where.vendorId = filter.vendorId;
        if (filter.fromDate || filter.toDate) {
            where.invoiceDate = {};
            if (filter.fromDate) where.invoiceDate.gte = filter.fromDate;
            if (filter.toDate) where.invoiceDate.lte = filter.toDate;
        }

        return await prisma.laundryVendorInvoice.findMany({
            where,
            include: { vendor: true, items: { include: { apparel: true } } },
            orderBy: { invoiceDate: "desc" },
        });
    }

    /**
     * Vendor Payment Register — all payments with allocations.
     */
    static async getPaymentRegister(filter: ReportFilter) {
        const where: any = { tenantId: filter.tenantId };
        if (filter.vendorId) where.vendorId = filter.vendorId;
        if (filter.fromDate || filter.toDate) {
            where.paymentDate = {};
            if (filter.fromDate) where.paymentDate.gte = filter.fromDate;
            if (filter.toDate) where.paymentDate.lte = filter.toDate;
        }

        return await prisma.vendorPayment.findMany({
            where,
            include: {
                vendor: true,
                allocations: { include: { invoice: true } },
            },
            orderBy: { paymentDate: "desc" },
        });
    }

    /**
     * Vendor Liability Register — all liabilities with status and credits.
     */
    static async getLiabilityRegister(filter: ReportFilter) {
        const where: any = { tenantId: filter.tenantId };
        if (filter.vendorId) where.vendorId = filter.vendorId;
        if (filter.apparelId) where.apparelId = filter.apparelId;

        return await prisma.vendorLiability.findMany({
            where,
            include: { vendor: true, apparel: true, credits: true },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Vendor Recovery Credit Register — all credits issued.
     */
    static async getRecoveryCreditRegister(filter: ReportFilter) {
        const where: any = { tenantId: filter.tenantId };
        if (filter.vendorId) {
            where.liability = { vendorId: filter.vendorId };
        }

        return await prisma.vendorLiabilityCredit.findMany({
            where,
            include: {
                liability: { include: { vendor: true, apparel: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Vendor Outstanding Report — per-vendor outstanding balances.
     */
    static async getOutstandingReport(filter: ReportFilter) {
        const vendors = await prisma.vendor.findMany({
            where: {
                tenantId: filter.tenantId,
                isActive: true,
                ...(filter.vendorId && { id: filter.vendorId }),
            },
        });

        const results = [];
        for (const vendor of vendors) {
            const ledgerAgg = await prisma.vendorLedger.aggregate({
                where: { tenantId: filter.tenantId, vendorId: vendor.id },
                _sum: { debit: true, credit: true },
            });

            const totalDebit = Number(ledgerAgg._sum.debit ?? 0);
            const totalCredit = Number(ledgerAgg._sum.credit ?? 0);
            const outstanding = totalDebit - totalCredit;

            if (outstanding !== 0 || filter.vendorId) {
                results.push({
                    vendorId: vendor.id,
                    vendorName: vendor.name,
                    totalInvoiced: totalDebit,
                    totalPaid: totalCredit,
                    outstanding,
                });
            }
        }

        return results.sort((a, b) => b.outstanding - a.outstanding);
    }

    /**
     * Washing Cost by Vendor — aggregate invoice amounts per vendor.
     */
    static async getWashingCostByVendor(filter: ReportFilter) {
        const where: any = {
            tenantId: filter.tenantId,
            status: { notIn: ["DRAFT", "CANCELLED"] },
            deletedAt: null,
        };
        if (filter.vendorId) where.vendorId = filter.vendorId;
        if (filter.fromDate || filter.toDate) {
            where.invoiceDate = {};
            if (filter.fromDate) where.invoiceDate.gte = filter.fromDate;
            if (filter.toDate) where.invoiceDate.lte = filter.toDate;
        }

        const invoices = await prisma.laundryVendorInvoice.findMany({
            where,
            include: { vendor: true, items: true },
        });

        const vendorMap: Record<number, { vendorName: string; totalAmount: number; totalQuantity: number; invoiceCount: number }> = {};
        for (const inv of invoices) {
            if (!vendorMap[inv.vendorId]) {
                vendorMap[inv.vendorId] = { vendorName: inv.vendor.name, totalAmount: 0, totalQuantity: 0, invoiceCount: 0 };
            }
            vendorMap[inv.vendorId].totalAmount += Number(inv.subtotal);
            vendorMap[inv.vendorId].totalQuantity += inv.items.reduce((s, i) => s + Number(i.quantity), 0);
            vendorMap[inv.vendorId].invoiceCount++;
        }

        return Object.entries(vendorMap).map(([vendorId, data]) => ({
            vendorId: parseInt(vendorId),
            ...data,
            avgCostPerPiece: data.totalQuantity > 0 ? data.totalAmount / data.totalQuantity : 0,
        })).sort((a, b) => b.totalAmount - a.totalAmount);
    }

    /**
     * Washing Cost by Apparel — aggregate costs per apparel item.
     */
    static async getWashingCostByApparel(filter: ReportFilter) {
        const where: any = {
            invoice: {
                tenantId: filter.tenantId,
                status: { notIn: ["DRAFT", "CANCELLED"] },
                deletedAt: null,
                ...(filter.vendorId && { vendorId: filter.vendorId }),
                ...(filter.fromDate && { invoiceDate: { gte: filter.fromDate } }),
            },
        };
        if (filter.apparelId) where.apparelId = filter.apparelId;

        const items = await prisma.laundryVendorInvoiceItem.findMany({
            where,
            include: { apparel: { include: { category: true } }, invoice: true },
        });

        const apparelMap: Record<number, { apparelName: string; categoryName: string; totalQuantity: number; totalAmount: number }> = {};
        for (const item of items) {
            if (!apparelMap[item.apparelId]) {
                apparelMap[item.apparelId] = {
                    apparelName: item.apparel.name,
                    categoryName: item.apparel.category.name,
                    totalQuantity: 0,
                    totalAmount: 0,
                };
            }
            apparelMap[item.apparelId].totalQuantity += Number(item.quantity);
            apparelMap[item.apparelId].totalAmount += Number(item.amount);
        }

        return Object.entries(apparelMap).map(([apparelId, data]) => ({
            apparelId: parseInt(apparelId),
            ...data,
            avgRate: data.totalQuantity > 0 ? data.totalAmount / data.totalQuantity : 0,
        })).sort((a, b) => b.totalAmount - a.totalAmount);
    }

    /**
     * Washing Cost by Month — monthly aggregate.
     */
    static async getWashingCostByMonth(filter: ReportFilter) {
        const where: any = {
            tenantId: filter.tenantId,
            status: { notIn: ["DRAFT", "CANCELLED"] },
            deletedAt: null,
        };
        if (filter.vendorId) where.vendorId = filter.vendorId;
        if (filter.fromDate || filter.toDate) {
            where.invoiceDate = {};
            if (filter.fromDate) where.invoiceDate.gte = filter.fromDate;
            if (filter.toDate) where.invoiceDate.lte = filter.toDate;
        }

        const invoices = await prisma.laundryVendorInvoice.findMany({
            where,
            include: { items: true },
            orderBy: { invoiceDate: "asc" },
        });

        const monthMap: Record<string, { month: string; totalAmount: number; totalQuantity: number; invoiceCount: number }> = {};
        for (const inv of invoices) {
            const key = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
            if (!monthMap[key]) {
                monthMap[key] = { month: key, totalAmount: 0, totalQuantity: 0, invoiceCount: 0 };
            }
            monthMap[key].totalAmount += Number(inv.subtotal);
            monthMap[key].totalQuantity += inv.items.reduce((s, i) => s + Number(i.quantity), 0);
            monthMap[key].invoiceCount++;
        }

        return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    }

    /**
     * Vendor Loss & Recovery Report — liabilities vs credits per vendor.
     */
    static async getLossRecoveryReport(filter: ReportFilter) {
        const liabWhere: any = { tenantId: filter.tenantId };
        if (filter.vendorId) liabWhere.vendorId = filter.vendorId;

        const liabilities = await prisma.vendorLiability.findMany({
            where: liabWhere,
            include: { vendor: true, apparel: true, credits: true },
        });

        const vendorMap: Record<number, {
            vendorName: string;
            grossLiability: number;
            recoveryCredits: number;
            netLiability: number;
            openCount: number;
            settledCount: number;
            waivedCount: number;
        }> = {};

        for (const lib of liabilities) {
            if (!vendorMap[lib.vendorId]) {
                vendorMap[lib.vendorId] = {
                    vendorName: lib.vendor.name,
                    grossLiability: 0,
                    recoveryCredits: 0,
                    netLiability: 0,
                    openCount: 0,
                    settledCount: 0,
                    waivedCount: 0,
                };
            }
            const entry = vendorMap[lib.vendorId];
            entry.grossLiability += Number(lib.amount);
            const credits = lib.credits.reduce((s, c) => s + Number(c.amount), 0);
            entry.recoveryCredits += credits;

            if (lib.status === "OPEN" || lib.status === "PARTIALLY_SETTLED") entry.openCount++;
            else if (lib.status === "SETTLED" || lib.status === "CREDITED") entry.settledCount++;
            else if (lib.status === "WAIVED") entry.waivedCount++;
        }

        return Object.entries(vendorMap).map(([vendorId, data]) => ({
            vendorId: parseInt(vendorId),
            ...data,
            netLiability: data.grossLiability - data.recoveryCredits,
        })).sort((a, b) => b.netLiability - a.netLiability);
    }
}

