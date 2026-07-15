import { prisma } from "@/lib/prisma";
import type {
    InventorySummaryDTO,
    InventoryHealthDTO,
    DemandForecastDTO,
    EventMetricsDTO,
    LossMetricsDTO,
    VendorMetricsDTO,
    VendorPerformanceEntry,
    LaundryMetricsDTO,
    UtilizationMetricsDTO,
    AssetUtilizationEntry,
    RiskMetricsDTO,
    FinancialMetricsDTO,
    RiskLevel,
} from "./dashboard-types";

/**
 * DashboardAggregatorService
 *
 * Computes all executive KPIs by querying the live database.
 * Called ONLY by the scheduled background job — never by the API route.
 *
 * Performance note:
 * - All queries are tenant-scoped with indexed columns.
 * - Uses groupBy aggregations to avoid row-level iteration on StockMovement.
 * - Results are stored in DashboardSnapshot for <300ms API reads.
 */
export class DashboardAggregatorService {

    // ─── Section 1: Inventory Summary ────────────────────────────────────────

    static async computeInventorySummary(tenantId: string): Promise<InventorySummaryDTO> {
        // Aggregate stock by condition, excluding MISSING/DAMAGE audit entries
        const stockGroups = await prisma.stockMovement.groupBy({
            by: ["condition"],
            where: {
                tenantId,
                movementType: { notIn: ["MISSING", "DAMAGE"] },
            },
            _sum: { quantityChange: true },
        });

        const cleanPhysical = Number(
            stockGroups.find((g) => g.condition === "CLEAN")?._sum.quantityChange ?? 0
        );
        const dirtyPhysical = Number(
            stockGroups.find((g) => g.condition === "DIRTY")?._sum.quantityChange ?? 0
        );

        // Active reservations
        const reservationAgg = await prisma.eventReservation.aggregate({
            where: { tenantId, status: "ACTIVE" },
            _sum: { reservedQty: true },
        });
        const reserved = Number(reservationAgg._sum.reservedQty ?? 0);

        // In laundry = dispatched - (returned + damaged + missing)
        const laundryAgg = await prisma.laundryOrderItem.aggregate({
            where: { laundryOrder: { tenantId } },
            _sum: {
                qtyDispatched: true,
                qtyReturned: true,
                qtyDamaged: true,
                qtyMissing: true,
            },
        });
        const inLaundry = Math.max(
            0,
            Number(laundryAgg._sum.qtyDispatched ?? 0) -
            Number(laundryAgg._sum.qtyReturned ?? 0) -
            Number(laundryAgg._sum.qtyDamaged ?? 0) -
            Number(laundryAgg._sum.qtyMissing ?? 0)
        );

        const available = Math.max(0, cleanPhysical - reserved);

        return {
            totalPhysicalInventory: cleanPhysical + dirtyPhysical,
            availableInventory: available,
            reservedInventory: reserved,
            dirtyInventory: dirtyPhysical,
            inLaundryInventory: inLaundry,
            inventoryValue: 0, // V2 placeholder
        };
    }

    // ─── Section 2: Inventory Health Score ───────────────────────────────────

    static async computeInventoryHealth(
        tenantId: string,
        summary?: InventorySummaryDTO
    ): Promise<InventoryHealthDTO & {
        rawScores: {
            availability: number;
            stockoutRisk: number;
            dirtyRatio: number;
            lossRatio: number;
            aging: number;
        }
    }> {
        const inv = summary ?? await this.computeInventorySummary(tenantId);

        // ── Availability Score (30%)
        // High availability = high score
        const availabilityRatio = inv.totalPhysicalInventory > 0
            ? inv.availableInventory / inv.totalPhysicalInventory
            : 0;
        const availabilityScore = Math.min(100, Math.round(availabilityRatio * 100));

        // ── Stockout Risk Score (25%)
        // Compare available vs min stock levels across all apparels
        const apparels = await prisma.apparel.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, minStockLevel: true },
        });

        const stockGroups = await prisma.stockMovement.groupBy({
            by: ["apparelId", "condition"],
            where: {
                tenantId,
                movementType: { notIn: ["MISSING", "DAMAGE"] },
            },
            _sum: { quantityChange: true },
        });

        const reservationGroups = await prisma.eventReservation.groupBy({
            by: ["apparelId"],
            where: { tenantId, status: "ACTIVE" },
            _sum: { reservedQty: true },
        });

        const cleanByApparel: Record<number, number> = {};
        for (const g of stockGroups) {
            if (g.condition === "CLEAN") {
                cleanByApparel[g.apparelId] = Number(g._sum.quantityChange ?? 0);
            }
        }
        const reservedByApparel: Record<number, number> = {};
        for (const r of reservationGroups) {
            reservedByApparel[r.apparelId] = Number(r._sum.reservedQty ?? 0);
        }

        const atRiskCount = apparels.filter((a) => {
            const clean = cleanByApparel[a.id] ?? 0;
            const res = reservedByApparel[a.id] ?? 0;
            return Math.max(0, clean - res) <= a.minStockLevel;
        }).length;

        const stockoutRiskScore = apparels.length > 0
            ? Math.round((1 - atRiskCount / apparels.length) * 100)
            : 100;

        // ── Dirty Ratio Score (20%)
        // Lower dirty ratio = higher score
        const dirtyRatio = inv.totalPhysicalInventory > 0
            ? inv.dirtyInventory / inv.totalPhysicalInventory
            : 0;
        const dirtyRatioScore = Math.round(Math.max(0, (1 - dirtyRatio * 2)) * 100);

        // ── Loss Ratio Score (15%)
        const lossData = await prisma.stockMovement.aggregate({
            where: {
                tenantId,
                movementType: { in: ["MISSING", "DAMAGE"] },
            },
            _sum: { quantityChange: true },
        });
        const grossLossAbs = Math.abs(Number(lossData._sum.quantityChange ?? 0));

        const allotmentData = await prisma.stockMovement.aggregate({
            where: { tenantId, movementType: "EVENT_ALLOTMENT" },
            _sum: { quantityChange: true },
        });
        const totalAllotted = Math.abs(Number(allotmentData._sum.quantityChange ?? 0));

        const lossRatio = totalAllotted > 0 ? grossLossAbs / totalAllotted : 0;
        const lossRatioScore = Math.round(Math.max(0, (1 - lossRatio * 5)) * 100);

        // ── Aging Score (10%)
        // Count laundry orders > 7 days
        const slaDate = new Date();
        slaDate.setDate(slaDate.getDate() - 7);
        const agedOrders = await prisma.laundryOrder.count({
            where: {
                tenantId,
                status: { in: ["DISPATCHED", "PARTIAL_RETURN"] },
                dispatchDate: { lte: slaDate },
            },
        });
        const totalOpenOrders = await prisma.laundryOrder.count({
            where: { tenantId, status: { in: ["DISPATCHED", "PARTIAL_RETURN"] } },
        });
        const agingScore = totalOpenOrders > 0
            ? Math.round((1 - agedOrders / totalOpenOrders) * 100)
            : 100;

        // ── Weighted Composite Score
        const compositeScore = Math.round(
            availabilityScore * 0.30 +
            stockoutRiskScore * 0.25 +
            dirtyRatioScore * 0.20 +
            lossRatioScore * 0.15 +
            agingScore * 0.10
        );

        const grade: InventoryHealthDTO["grade"] =
            compositeScore >= 90 ? "A" :
                compositeScore >= 75 ? "B" :
                    compositeScore >= 60 ? "C" :
                        compositeScore >= 45 ? "D" : "F";

        return {
            score: compositeScore,
            grade,
            components: {
                availability: availabilityScore,
                stockoutRisk: stockoutRiskScore,
                dirtyRatio: dirtyRatioScore,
                lossRatio: lossRatioScore,
                aging: agingScore,
            },
            rawScores: {
                availability: availabilityScore,
                stockoutRisk: stockoutRiskScore,
                dirtyRatio: dirtyRatioScore,
                lossRatio: lossRatioScore,
                aging: agingScore,
            },
        };
    }

    // ─── Section 3: Demand Forecast ──────────────────────────────────────────

    static async computeDemandForecast(tenantId: string): Promise<DemandForecastDTO> {
        // Placeholder — returns mock/zero until ML/AI module exists
        return {
            predictedDemand30Days: 0,
            forecastAccuracy: 0,
            predictedPurchaseRequirement: 0,
            stockoutRisk: "LOW",
            note: "Demand forecasting is a V2 feature. Values are placeholders.",
        };
    }

    // ─── Section 4: Event KPIs ───────────────────────────────────────────────

    static async computeEventMetrics(tenantId: string): Promise<EventMetricsDTO> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [upcomingEvents, eventsThisMonth, closedThisMonth, pendingReconciliation] =
            await Promise.all([
                prisma.event.count({
                    where: { tenantId, eventDate: { gte: now }, status: { notIn: ["CLOSED"] } },
                }),
                prisma.event.count({
                    where: { tenantId, eventDate: { gte: monthStart, lte: monthEnd } },
                }),
                prisma.event.count({
                    where: {
                        tenantId,
                        eventDate: { gte: monthStart, lte: monthEnd },
                        status: "CLOSED",
                    },
                }),
                prisma.event.count({
                    where: { tenantId, status: "ALLOTTED" },
                }),
            ]);

        const eventCompletionRate = eventsThisMonth > 0
            ? Math.round((closedThisMonth / eventsThisMonth) * 100)
            : 0;

        return {
            upcomingEvents,
            eventsThisMonth,
            eventCompletionRate,
            eventsPendingReconciliation: pendingReconciliation,
        };
    }

    // ─── Section 5: Loss & Recovery ──────────────────────────────────────────

    static async computeLossMetrics(tenantId: string): Promise<LossMetricsDTO> {
        const [lossData, recoveryData, allotmentData] = await Promise.all([
            prisma.stockMovement.aggregate({
                where: {
                    tenantId,
                    movementType: { in: ["MISSING", "DAMAGE"] },
                },
                _sum: { quantityChange: true },
            }),
            prisma.stockMovement.aggregate({
                where: { tenantId, movementType: "RECOVERY" },
                _sum: { quantityChange: true },
            }),
            prisma.stockMovement.aggregate({
                where: { tenantId, movementType: "EVENT_ALLOTMENT" },
                _sum: { quantityChange: true },
            }),
        ]);

        const grossLoss = Math.abs(Number(lossData._sum.quantityChange ?? 0));
        const recovered = Math.abs(Number(recoveryData._sum.quantityChange ?? 0));
        const netLoss = Math.max(0, grossLoss - recovered);
        const totalAllotted = Math.abs(Number(allotmentData._sum.quantityChange ?? 0));

        const lossRate = totalAllotted > 0
            ? parseFloat(((netLoss / totalAllotted) * 100).toFixed(2))
            : 0;

        const recoveryRate = grossLoss > 0
            ? parseFloat(((recovered / grossLoss) * 100).toFixed(2))
            : 0;

        return {
            grossLoss,
            recovered,
            netLoss,
            lossRate,
            recoveryRate,
            financialImpact: 0, // V2 placeholder
        };
    }

    // ─── Section 6: Vendor KPIs ──────────────────────────────────────────────

    static async computeVendorMetrics(
        tenantId: string,
        riskThreshold = 50
    ): Promise<VendorMetricsDTO> {
        const vendors = await prisma.vendor.findMany({
            where: { tenantId, isActive: true },
            include: {
                laundryOrders: {
                    include: { items: true },
                },
            },
        });

        const vendorEntries: VendorPerformanceEntry[] = vendors.map((v) => {
            const orders = v.laundryOrders;
            const totalDispatched = orders.reduce(
                (sum, o) => sum + o.items.reduce((s, i) => s + i.qtyDispatched, 0),
                0
            );
            const totalReturned = orders.reduce(
                (sum, o) => sum + o.items.reduce((s, i) => s + i.qtyReturned, 0),
                0
            );

            // Average turnaround = (returnDate - dispatchDate) for closed orders
            const closedOrders = orders.filter(
                (o) => o.status === "CLOSED" && o.expectedReturnDate
            );
            const avgTurnaroundDays = closedOrders.length > 0
                ? parseFloat((closedOrders.reduce((sum, o) => {
                    const diff = (o.expectedReturnDate!.getTime() - o.dispatchDate.getTime());
                    return sum + diff / (1000 * 60 * 60 * 24);
                }, 0) / closedOrders.length).toFixed(1))
                : 0;

            // Placeholder vendor scoring formula:
            // Score = 100 * (returned / dispatched) — penalise long turnaround
            const returnRatio = totalDispatched > 0 ? totalReturned / totalDispatched : 1;
            const turnaroundPenalty = Math.min(20, avgTurnaroundDays > 7 ? (avgTurnaroundDays - 7) * 2 : 0);
            const score = Math.max(0, Math.round(returnRatio * 100 - turnaroundPenalty));

            const riskLevel: RiskLevel =
                score < riskThreshold ? "HIGH" :
                    score < 75 ? "MEDIUM" : "LOW";

            return {
                vendorId: v.id,
                vendorName: v.name,
                score,
                totalDispatched,
                totalReturned,
                avgTurnaroundDays,
                riskLevel,
            };
        });

        const sorted = [...vendorEntries].sort((a, b) => b.score - a.score);
        const overallScore = vendorEntries.length > 0
            ? Math.round(vendorEntries.reduce((s, v) => s + v.score, 0) / vendorEntries.length)
            : 0;
        const highRiskVendorCount = vendorEntries.filter((v) => v.riskLevel === "HIGH").length;
        const averageTurnaroundDays = vendorEntries.length > 0
            ? parseFloat((vendorEntries.reduce((s, v) => s + v.avgTurnaroundDays, 0) / vendorEntries.length).toFixed(1))
            : 0;

        return {
            overallScore,
            highRiskVendorCount,
            averageTurnaroundDays,
            vendorLiability: 0, // V2 placeholder
            topVendors: sorted.slice(0, 5),
            bottomVendors: sorted.slice(-5).reverse(),
        };
    }

    // ─── Section 7: Laundry KPIs ─────────────────────────────────────────────

    static async computeLaundryMetrics(tenantId: string): Promise<LaundryMetricsDTO> {
        const now = new Date();

        // Dirty stock count (via stock ledger)
        const dirtyAgg = await prisma.stockMovement.aggregate({
            where: {
                tenantId,
                condition: "DIRTY",
                movementType: { notIn: ["MISSING", "DAMAGE"] },
            },
            _sum: { quantityChange: true },
        });
        const dirtyStockQty = Math.max(0, Number(dirtyAgg._sum.quantityChange ?? 0));

        // In laundry count
        const laundryAgg = await prisma.laundryOrderItem.aggregate({
            where: { laundryOrder: { tenantId } },
            _sum: { qtyDispatched: true, qtyReturned: true, qtyDamaged: true, qtyMissing: true },
        });
        const inLaundryQty = Math.max(
            0,
            Number(laundryAgg._sum.qtyDispatched ?? 0) -
            Number(laundryAgg._sum.qtyReturned ?? 0) -
            Number(laundryAgg._sum.qtyDamaged ?? 0) -
            Number(laundryAgg._sum.qtyMissing ?? 0)
        );

        // Open laundry orders
        const openOrders = await prisma.laundryOrder.findMany({
            where: {
                tenantId,
                status: { in: ["DISPATCHED", "PARTIAL_RETURN"] },
            },
            select: { id: true, dispatchDate: true, expectedReturnDate: true },
        });

        // Aging buckets by dispatch date
        const date3 = new Date(now); date3.setDate(date3.getDate() - 3);
        const date7 = new Date(now); date7.setDate(date7.getDate() - 7);

        let within3Days = 0, within7Days = 0, over7Days = 0;
        let totalCycleDays = 0;
        let delayed = 0;

        for (const o of openOrders) {
            const ageMs = now.getTime() - o.dispatchDate.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            totalCycleDays += ageDays;

            if (ageDays <= 3) within3Days++;
            else if (ageDays <= 7) within7Days++;
            else over7Days++;

            if (o.expectedReturnDate && now > o.expectedReturnDate) delayed++;
        }

        const avgCycleDays = openOrders.length > 0
            ? parseFloat((totalCycleDays / openOrders.length).toFixed(1))
            : 0;

        return {
            dirtyStockQty,
            inLaundryQty,
            agingBuckets: { within3Days, within7Days, over7Days },
            avgCycleDays,
            delayedOrders: delayed,
        };
    }

    // ─── Section 8: Asset Utilization ────────────────────────────────────────

    static async computeUtilizationMetrics(tenantId: string): Promise<UtilizationMetricsDTO> {
        const apparels = await prisma.apparel.findMany({
            where: { tenantId, isActive: true },
            include: { category: true },
        });

        // Aggregate clean stock per apparel
        const stockGroups = await prisma.stockMovement.groupBy({
            by: ["apparelId", "condition"],
            where: {
                tenantId,
                movementType: { notIn: ["MISSING", "DAMAGE"] },
            },
            _sum: { quantityChange: true },
        });

        // Allotted per apparel (currently at event)
        const allotmentGroups = await prisma.eventReservation.groupBy({
            by: ["apparelId"],
            where: { tenantId, status: "ALLOTTED" },
            _sum: { reservedQty: true },
        });

        const cleanMap: Record<number, number> = {};
        for (const g of stockGroups) {
            if (g.condition === "CLEAN") {
                cleanMap[g.apparelId] = Number(g._sum.quantityChange ?? 0);
            }
        }
        const allotMap: Record<number, number> = {};
        for (const g of allotmentGroups) {
            allotMap[g.apparelId] = Number(g._sum.reservedQty ?? 0);
        }

        const entries: AssetUtilizationEntry[] = apparels.map((a) => {
            const available = Math.max(0, cleanMap[a.id] ?? 0);
            const allotted = allotMap[a.id] ?? 0;
            const utilizationRate = (available + allotted) > 0
                ? parseFloat(((allotted / (available + allotted)) * 100).toFixed(1))
                : 0;
            return {
                apparelId: a.id,
                apparelName: a.name,
                category: a.category.name,
                availableQty: available,
                allottedQty: allotted,
                utilizationRate,
            };
        });

        const sorted = [...entries].sort((a, b) => b.utilizationRate - a.utilizationRate);
        const overallUtilizationRate = entries.length > 0
            ? parseFloat((entries.reduce((s, e) => s + e.utilizationRate, 0) / entries.length).toFixed(1))
            : 0;

        return {
            topUtilized: sorted.slice(0, 5),
            underUtilized: sorted.slice(-5).reverse(),
            overallUtilizationRate,
        };
    }

    // ─── Section 9: Risk Dashboard ───────────────────────────────────────────

    static async computeRiskMetrics(
        tenantId: string,
        summary?: InventorySummaryDTO,
        laundry?: LaundryMetricsDTO
    ): Promise<RiskMetricsDTO> {
        const inv = summary ?? await this.computeInventorySummary(tenantId);
        const laundryData = laundry ?? await this.computeLaundryMetrics(tenantId);

        // Stockout Risk: based on available vs total ratio
        const availabilityRatio = inv.totalPhysicalInventory > 0
            ? inv.availableInventory / inv.totalPhysicalInventory
            : 1;
        const stockoutRisk: RiskLevel =
            availabilityRatio < 0.2 ? "HIGH" :
                availabilityRatio < 0.4 ? "MEDIUM" : "LOW";

        // Vendor Risk
        const highRiskVendors = await prisma.laundryOrder.count({
            where: {
                tenantId,
                status: { in: ["DISPATCHED", "PARTIAL_RETURN"] },
                expectedReturnDate: { lt: new Date() },
            },
        });
        const vendorRisk: RiskLevel =
            highRiskVendors > 5 ? "HIGH" :
                highRiskVendors > 2 ? "MEDIUM" : "LOW";

        // Laundry Bottleneck
        const laundryBottleneck: RiskLevel =
            laundryData.delayedOrders > 5 ? "HIGH" :
                laundryData.delayedOrders > 2 ? "MEDIUM" : "LOW";

        // Event Capacity Risk
        const pending = await prisma.event.count({
            where: { tenantId, status: "ALLOTTED" },
        });
        const eventCapacityRisk: RiskLevel =
            pending > 10 ? "HIGH" :
                pending > 5 ? "MEDIUM" : "LOW";

        const riskWeights: Record<RiskLevel, number> = { HIGH: 2, MEDIUM: 1, LOW: 0 };
        const totalRisk = riskWeights[stockoutRisk] + riskWeights[vendorRisk] +
            riskWeights[laundryBottleneck] + riskWeights[eventCapacityRisk];
        const overallRiskLevel: RiskLevel = totalRisk >= 5 ? "HIGH" : totalRisk >= 2 ? "MEDIUM" : "LOW";

        return {
            stockoutRisk,
            vendorRisk,
            laundryBottleneck,
            eventCapacityRisk,
            overallRiskLevel,
        };
    }

    // ─── Section 10: Financial KPIs (Placeholders) ───────────────────────────

    static async computeFinancialMetrics(tenantId: string): Promise<FinancialMetricsDTO> {
        return {
            inventoryValue: 0,
            monthlyConsumptionValue: 0,
            costOfLosses: 0,
            costOfDamages: 0,
            recoverySavings: 0,
            note: "Financial valuation is a V2 feature. All values are placeholders.",
        };
    }

    // ─── Full Aggregation ────────────────────────────────────────────────────

    /**
     * Runs all KPI computations in parallel and returns the full snapshot payload.
     * This is called once nightly by the snapshot job.
     */
    static async computeAll(tenantId: string) {
        const [summary, eventMetrics, lossMetrics, vendorMetrics, laundryMetrics, utilizationMetrics, financialMetrics] =
            await Promise.all([
                this.computeInventorySummary(tenantId),
                this.computeEventMetrics(tenantId),
                this.computeLossMetrics(tenantId),
                this.computeVendorMetrics(tenantId),
                this.computeLaundryMetrics(tenantId),
                this.computeUtilizationMetrics(tenantId),
                this.computeFinancialMetrics(tenantId),
            ]);

        const [inventoryHealth, riskMetrics, demandForecast] = await Promise.all([
            this.computeInventoryHealth(tenantId, summary),
            this.computeRiskMetrics(tenantId, summary, laundryMetrics),
            this.computeDemandForecast(tenantId),
        ]);

        return {
            summary,
            inventoryHealth,
            demandForecast,
            eventMetrics,
            lossMetrics,
            vendorMetrics,
            laundryMetrics,
            utilizationMetrics,
            riskMetrics,
            financialMetrics,
        };
    }
}

