import { prisma } from "../../prisma";

/**
 * Dashboard KPIs for vendor billing module.
 */
export class VendorBillingDashboardService {
    static async getKPIs(tenantId: number) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // ─── Total Vendor Payable (from ledger) ──────────────────────────────────
        const ledgerAgg = await prisma.vendorLedger.aggregate({
            where: { tenantId },
            _sum: { debit: true, credit: true },
        });
        const totalVendorPayable = Number(ledgerAgg._sum.debit ?? 0) - Number(ledgerAgg._sum.credit ?? 0);

        // ─── Overdue Payables (invoices > 30 days outstanding) ────────────────────
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const overdueInvoices = await prisma.laundryVendorInvoice.findMany({
            where: {
                tenantId,
                status: { in: ["POSTED", "PARTIALLY_PAID"] },
                invoiceDate: { lt: thirtyDaysAgo },
                deletedAt: null,
            },
        });
        const overduePayables = overdueInvoices.reduce(
            (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0
        );

        // ─── Monthly Washing Cost ────────────────────────────────────────────────
        const monthlyInvoices = await prisma.laundryVendorInvoice.aggregate({
            where: {
                tenantId,
                status: { notIn: ["DRAFT", "CANCELLED"] },
                invoiceDate: { gte: monthStart, lte: monthEnd },
                deletedAt: null,
            },
            _sum: { subtotal: true },
        });
        const monthlyWashingCost = Number(monthlyInvoices._sum.subtotal ?? 0);

        // ─── Average Cost Per Piece ───────────────────────────────────────────────
        const allItems = await prisma.laundryVendorInvoiceItem.aggregate({
            where: {
                invoice: {
                    tenantId,
                    status: { notIn: ["DRAFT", "CANCELLED"] },
                    deletedAt: null,
                },
            },
            _sum: { quantity: true, amount: true },
        });
        const totalQty = Number(allItems._sum.quantity ?? 0);
        const totalAmt = Number(allItems._sum.amount ?? 0);
        const avgCostPerPiece = totalQty > 0 ? totalAmt / totalQty : 0;

        // ─── Top Vendors by Cost ──────────────────────────────────────────────────
        const invoicesForTop = await prisma.laundryVendorInvoice.findMany({
            where: {
                tenantId,
                status: { notIn: ["DRAFT", "CANCELLED"] },
                deletedAt: null,
            },
            include: { vendor: true },
        });

        const vendorCostMap: Record<number, { name: string; total: number }> = {};
        for (const inv of invoicesForTop) {
            if (!vendorCostMap[inv.vendorId]) {
                vendorCostMap[inv.vendorId] = { name: inv.vendor.name, total: 0 };
            }
            vendorCostMap[inv.vendorId].total += Number(inv.subtotal);
        }
        const topVendorsByCost = Object.entries(vendorCostMap)
            .map(([id, d]) => ({ vendorId: parseInt(id), vendorName: d.name, totalCost: d.total }))
            .sort((a, b) => b.totalCost - a.totalCost)
            .slice(0, 5);

        // ─── Top Vendors by Outstanding ───────────────────────────────────────────
        const vendors = await prisma.vendor.findMany({ where: { tenantId, isActive: true } });
        const vendorOutstandings: { vendorId: number; vendorName: string; outstanding: number }[] = [];

        for (const vendor of vendors) {
            const vLedger = await prisma.vendorLedger.aggregate({
                where: { tenantId, vendorId: vendor.id },
                _sum: { debit: true, credit: true },
            });
            const outstanding = Number(vLedger._sum.debit ?? 0) - Number(vLedger._sum.credit ?? 0);
            if (outstanding > 0) {
                vendorOutstandings.push({ vendorId: vendor.id, vendorName: vendor.name, outstanding });
            }
        }
        const topVendorsByOutstanding = vendorOutstandings
            .sort((a, b) => b.outstanding - a.outstanding)
            .slice(0, 5);

        // ─── Vendor Liability & Recovery ──────────────────────────────────────────
        const liabilityAgg = await prisma.vendorLiability.aggregate({
            where: { tenantId },
            _sum: { amount: true, settledAmount: true },
        });
        const vendorLiabilityAmount = Number(liabilityAgg._sum.amount ?? 0);

        const creditAgg = await prisma.vendorLiabilityCredit.aggregate({
            where: { tenantId },
            _sum: { amount: true },
        });
        const vendorRecoveryCredits = Number(creditAgg._sum.amount ?? 0);
        const netVendorExposure = vendorLiabilityAmount - vendorRecoveryCredits;

        return {
            totalVendorPayable,
            overduePayables,
            monthlyWashingCost,
            avgCostPerPiece: parseFloat(avgCostPerPiece.toFixed(2)),
            topVendorsByCost,
            topVendorsByOutstanding,
            vendorLiabilityAmount,
            vendorRecoveryCredits,
            netVendorExposure,
        };
    }
}
