import { prisma } from "../prisma";
import { StockCondition } from "../../generated/client";

export interface ReportFilter {
    vendorId?: number;
    apparelId?: number;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
}

export class VendorReportService {
    /**
     * Vendor Stock Exposure Report
     * Aggregates LaundryOrderItem data by Vendor and Apparel
     */
    static async getStockExposure(tenantId: number, filter: ReportFilter) {
        const where: any = {
            laundryOrder: {
                tenantId,
                ...(filter.vendorId && { vendorId: filter.vendorId }),
                ...(filter.startDate && { createdAt: { gte: filter.startDate } }),
                ...(filter.endDate && { createdAt: { lte: filter.endDate } }),
            },
            ...(filter.apparelId && { apparelId: filter.apparelId }),
        };

        const items = await prisma.laundryOrderItem.findMany({
            where,
            include: {
                laundryOrder: { include: { vendor: true } },
                apparel: { include: { category: true } }
            }
        });

        // Grouping logic
        const grouped = items.reduce((acc: any, item) => {
            const key = `${item.laundryOrder.vendorId}-${item.apparelId}`;
            if (!acc[key]) {
                acc[key] = {
                    vendorName: item.laundryOrder.vendor.name,
                    apparelName: item.apparel.name,
                    categoryName: item.apparel.category.name,
                    dispatched: 0,
                    returned: 0,
                    missing: 0,
                    damaged: 0,
                    netWithVendor: 0
                };
            }
            acc[key].dispatched += item.qtyDispatched;
            acc[key].returned += item.qtyReturned;
            acc[key].missing += item.qtyMissing;
            acc[key].damaged += item.qtyDamaged;
            acc[key].netWithVendor += (item.qtyDispatched - item.qtyReturned - item.qtyMissing - item.qtyDamaged);
            return acc;
        }, {});

        return Object.values(grouped);
    }

    /**
     * Vendor Performance Scorecard
     */
    static async getPerformanceScorecard(tenantId: number, filter: ReportFilter) {
        const exposure = await this.getStockExposure(tenantId, filter);

        // Group by Vendor for scorecard
        const scorecard = exposure.reduce((acc: any, item: any) => {
            if (!acc[item.vendorName]) {
                acc[item.vendorName] = {
                    vendorName: item.vendorName,
                    totalDispatched: 0,
                    totalMissing: 0,
                    totalDamaged: 0,
                    totalRecovered: 0, // Need to fetch recoveries
                    netLoss: 0,
                };
            }
            acc[item.vendorName].totalDispatched += item.dispatched;
            acc[item.vendorName].totalMissing += item.missing;
            acc[item.vendorName].totalDamaged += item.damaged;
            acc[item.vendorName].netLoss += (item.missing + item.damaged);
            return acc;
        }, {});

        // Add recovery data
        const recoveries = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                movementType: 'RECOVERY',
                referenceType: 'LAUNDRY',
                ...(filter.startDate && { createdAt: { gte: filter.startDate } }),
                ...(filter.endDate && { createdAt: { lte: filter.endDate } }),
            }
        });

        // Map recoveries back to vendors efficiently
        const orderIds = Array.from(new Set(recoveries.map(r => (r as any).referenceId))).filter((id): id is number => id !== null && id !== undefined);
        const recoveryOrders = await prisma.laundryOrder.findMany({
            where: { id: { in: orderIds } },
            include: { vendor: true }
        });
        const orderToVendorMap = new Map<number, string>(recoveryOrders.map(o => [o.id, o.vendor.name]));

        for (const recovery of recoveries) {
            const refId = (recovery as any).referenceId;
            const vendorName = refId ? orderToVendorMap.get(refId) : undefined;
            if (vendorName && scorecard[vendorName]) {
                scorecard[vendorName].totalRecovered += Number(recovery.quantity || 0);
            }
        }

        return Object.values(scorecard).map((v: any) => ({
            ...v,
            lossRate: v.totalDispatched > 0 ? (v.netLoss / v.totalDispatched) * 100 : 0,
            recoveryRate: v.netLoss > 0 ? (v.totalRecovered / v.netLoss) * 100 : 0
        }));
    }

    /**
     * Laundry Aging Report
     */
    static async getLaundryAging(tenantId: number, filter: ReportFilter) {
        const orders = await prisma.laundryOrder.findMany({
            where: {
                tenantId,
                status: { in: ['DISPATCHED', 'PARTIAL_RETURN'] },
                ...(filter.vendorId && { vendorId: filter.vendorId }),
            },
            include: {
                vendor: true,
                items: { include: { apparel: true } }
            }
        });

        const now = new Date();
        return orders.flatMap(order =>
            order.items.map(item => {
                const daysInLaundry = Math.floor((now.getTime() - order.dispatchDate.getTime()) / (1000 * 60 * 60 * 24));
                const remaining = item.qtyDispatched - item.qtyReturned - item.qtyMissing - item.qtyDamaged;

                if (remaining <= 0) return null;

                return {
                    vendorName: order.vendor.name,
                    apparelName: item.apparel.name,
                    dispatchDate: order.dispatchDate,
                    daysInLaundry,
                    quantity: remaining,
                    riskLevel: daysInLaundry >= 7 ? 'CRITICAL' : daysInLaundry >= 3 ? 'WARNING' : 'NORMAL'
                };
            })
        ).filter(Boolean);
    }

    /**
     * Vendor Liability Report (Financial)
     */
    static async getVendorLiability(tenantId: number, filter: ReportFilter) {
        const exposure = await this.getStockExposure(tenantId, filter);

        // Fetch apparel unit values
        const apparels = await prisma.apparel.findMany({
            where: { tenantId }
        });
        const valueMap = new Map(apparels.map(a => [a.name, Number(a.unitValue)]));

        return exposure.map((item: any) => {
            const unitValue = Number(valueMap.get(item.apparelName) || 0);
            const netLoss = Number(item.missing || 0) + Number(item.damaged || 0);
            return {
                ...item,
                netLoss,
                unitValue,
                liabilityAmount: netLoss * unitValue
            };
        });
    }

    /**
     * Laundry Order Reconciliation
     */
    static async getReconciliationReport(tenantId: number, filter: ReportFilter) {
        const orders = await prisma.laundryOrder.findMany({
            where: {
                tenantId,
                ...(filter.vendorId && { vendorId: filter.vendorId }),
                ...(filter.startDate && { createdAt: { gte: filter.startDate } }),
                ...(filter.endDate && { createdAt: { lte: filter.endDate } }),
            },
            include: {
                vendor: true,
                items: { include: { apparel: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return orders.map(o => ({
            ...o,
            vendorName: o.vendor?.name || "Unknown Vendor"
        }));
    }
}
