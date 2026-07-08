import { prisma } from "../../prisma";
import { VendorLedgerService } from "./vendor-ledger-service";

/**
 * Vendor statement and aging report generation.
 */
export class VendorStatementService {
    /**
     * Generates a vendor statement with opening balance, transactions, and closing balance.
     */
    static async getStatement(
        tenantId: number,
        vendorId: number,
        options?: { fromDate?: Date; toDate?: Date }
    ) {
        // 1. Calculate opening balance (all entries before fromDate)
        let openingBalance = 0;
        if (options?.fromDate) {
            const priorEntries = await prisma.vendorLedger.aggregate({
                where: {
                    tenantId,
                    vendorId,
                    transactionDate: { lt: options.fromDate },
                },
                _sum: { debit: true, credit: true },
            });
            openingBalance = Number(priorEntries._sum.debit ?? 0) - Number(priorEntries._sum.credit ?? 0);
        }

        // 2. Get transactions in range
        const transactions = await VendorLedgerService.getEntries(
            tenantId,
            vendorId,
            options
        );

        // 3. Build running balance
        let runningBalance = openingBalance;
        const transactionsWithBalance = transactions.map(t => {
            runningBalance += Number(t.debit) - Number(t.credit);
            return {
                ...t,
                debit: Number(t.debit),
                credit: Number(t.credit),
                runningBalance,
            };
        });

        // 4. Closing balance
        const closingBalance = runningBalance;

        // 5. Get vendor info
        const vendor = await prisma.vendor.findUniqueOrThrow({
            where: { id: vendorId, tenantId },
        });

        return {
            vendor: {
                id: vendor.id,
                name: vendor.name,
                contactInfo: vendor.contactInfo,
                paymentTerms: vendor.paymentTerms,
            },
            fromDate: options?.fromDate ?? null,
            toDate: options?.toDate ?? null,
            openingBalance,
            transactions: transactionsWithBalance,
            closingBalance,
        };
    }

    /**
     * Generates an aging report across all vendors (or for a specific vendor).
     * Buckets: 0-30, 31-60, 61-90, 90+ days.
     */
    static async getAgingReport(tenantId: number, vendorId?: number) {
        const where: any = {
            tenantId,
            status: { in: ["POSTED", "PARTIALLY_PAID"] },
            deletedAt: null,
        };
        if (vendorId) where.vendorId = vendorId;

        const invoices = await prisma.laundryVendorInvoice.findMany({
            where,
            include: { vendor: true },
        });

        const now = new Date();
        const agingMap: Record<number, {
            vendorId: number;
            vendorName: string;
            current: number;    // 0-30
            days31to60: number;
            days61to90: number;
            over90: number;
            total: number;
        }> = {};

        for (const inv of invoices) {
            const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
            if (outstanding <= 0) continue;

            const daysDue = Math.floor(
                (now.getTime() - inv.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (!agingMap[inv.vendorId]) {
                agingMap[inv.vendorId] = {
                    vendorId: inv.vendorId,
                    vendorName: inv.vendor.name,
                    current: 0,
                    days31to60: 0,
                    days61to90: 0,
                    over90: 0,
                    total: 0,
                };
            }

            const bucket = agingMap[inv.vendorId];
            if (daysDue <= 30) {
                bucket.current += outstanding;
            } else if (daysDue <= 60) {
                bucket.days31to60 += outstanding;
            } else if (daysDue <= 90) {
                bucket.days61to90 += outstanding;
            } else {
                bucket.over90 += outstanding;
            }
            bucket.total += outstanding;
        }

        // Add liability amounts
        const liabilityWhere: any = {
            tenantId,
            status: { in: ["OPEN", "PARTIALLY_SETTLED"] },
        };
        if (vendorId) liabilityWhere.vendorId = vendorId;

        const liabilities = await prisma.vendorLiability.findMany({
            where: liabilityWhere,
            include: { vendor: true },
        });

        for (const lib of liabilities) {
            const outstanding = Number(lib.amount) - Number(lib.settledAmount);
            if (outstanding <= 0) continue;

            const daysDue = Math.floor(
                (now.getTime() - lib.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (!agingMap[lib.vendorId]) {
                agingMap[lib.vendorId] = {
                    vendorId: lib.vendorId,
                    vendorName: lib.vendor.name,
                    current: 0,
                    days31to60: 0,
                    days61to90: 0,
                    over90: 0,
                    total: 0,
                };
            }

            const bucket = agingMap[lib.vendorId];
            if (daysDue <= 30) {
                bucket.current += outstanding;
            } else if (daysDue <= 60) {
                bucket.days31to60 += outstanding;
            } else if (daysDue <= 90) {
                bucket.days61to90 += outstanding;
            } else {
                bucket.over90 += outstanding;
            }
            bucket.total += outstanding;
        }

        const vendors = Object.values(agingMap).sort((a, b) => b.total - a.total);

        // Grand totals
        const totals = vendors.reduce(
            (acc, v) => ({
                current: acc.current + v.current,
                days31to60: acc.days31to60 + v.days31to60,
                days61to90: acc.days61to90 + v.days61to90,
                over90: acc.over90 + v.over90,
                total: acc.total + v.total,
            }),
            { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }
        );

        return { vendors, totals };
    }
}
