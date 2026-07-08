import { DashboardRepository } from "./dashboard-repository";
import { DashboardAggregatorService } from "./dashboard-aggregator";
import type {
    ExecutiveDashboardResponse,
    InventorySummaryDTO,
    InventoryHealthDTO,
    DemandForecastDTO,
    EventMetricsDTO,
    LossMetricsDTO,
    VendorMetricsDTO,
    LaundryMetricsDTO,
    UtilizationMetricsDTO,
    RiskMetricsDTO,
    FinancialMetricsDTO,
    TrendsResponse,
} from "./dashboard-types";

/**
 * DashboardService
 *
 * Orchestrates the dashboard data flow:
 *  1. Primary path: read from DashboardSnapshot (fast, <50ms)
 *  2. Fallback path: live aggregation if today's snapshot is missing (slower, used until first job run)
 *
 * API routes call this service only.
 */
export class DashboardService {

    /**
     * Returns the full executive dashboard response.
     * Reads from snapshot for <300ms performance.
     */
    static async getExecutiveDashboard(tenantId: number): Promise<ExecutiveDashboardResponse> {
        const snapshot = await DashboardRepository.getLatestSnapshot(tenantId);

        // ─── Fast path: snapshot exists ───────────────────────────────────────
        if (snapshot) {
            const recommendations = await DashboardRepository.getActiveRecommendations(tenantId);

            const toNum = (v: unknown) => v === null || v === undefined ? 0 : Number(v);

            const summary: InventorySummaryDTO = {
                totalPhysicalInventory: toNum(snapshot.totalPhysicalInventory),
                availableInventory: toNum(snapshot.availableInventory),
                reservedInventory: toNum(snapshot.reservedInventory),
                dirtyInventory: toNum(snapshot.dirtyInventory),
                inLaundryInventory: toNum(snapshot.inLaundryInventory),
                inventoryValue: 0,
            };

            const score = toNum(snapshot.inventoryHealth);
            const inventoryHealth: InventoryHealthDTO = {
                score,
                grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F",
                components: {
                    availability: toNum(snapshot.availabilityScore),
                    stockoutRisk: toNum(snapshot.stockoutRiskScore),
                    dirtyRatio: toNum(snapshot.dirtyRatioScore),
                    lossRatio: toNum(snapshot.lossRatioScore),
                    aging: toNum(snapshot.agingScore),
                },
            };

            const demandForecast: DemandForecastDTO = {
                predictedDemand30Days: toNum(snapshot.predictedDemand30Days),
                forecastAccuracy: toNum(snapshot.forecastAccuracy),
                predictedPurchaseRequirement: toNum(snapshot.predictedPurchaseRequirement),
                stockoutRisk: (snapshot.stockoutRisk as DemandForecastDTO["stockoutRisk"]) ?? "LOW",
                note: "Demand forecasting is a V2 feature.",
            };

            const eventMetrics: EventMetricsDTO = {
                upcomingEvents: toNum(snapshot.upcomingEvents),
                eventsThisMonth: toNum(snapshot.eventsThisMonth),
                eventCompletionRate: toNum(snapshot.eventCompletionRate),
                eventsPendingReconciliation: toNum(snapshot.eventsPendingReconciliation),
            };

            const lossMetrics: LossMetricsDTO = {
                grossLoss: toNum(snapshot.grossLoss),
                recovered: toNum(snapshot.recovered),
                netLoss: toNum(snapshot.netLoss),
                lossRate: toNum(snapshot.lossRate),
                recoveryRate: toNum(snapshot.recoveryRate),
                financialImpact: 0,
            };

            const vendorMetrics: VendorMetricsDTO = {
                overallScore: toNum(snapshot.vendorScore),
                highRiskVendorCount: toNum(snapshot.highRiskVendorCount),
                averageTurnaroundDays: toNum(snapshot.averageTurnaroundDays),
                vendorLiability: 0,
                topVendors: [],
                bottomVendors: [],
            };

            const laundryMetrics: LaundryMetricsDTO = {
                dirtyStockQty: toNum(snapshot.dirtyStock),
                inLaundryQty: toNum(snapshot.inLaundry),
                agingBuckets: {
                    within3Days: toNum(snapshot.laundryAging0to3),
                    within7Days: toNum(snapshot.laundryAging4to7),
                    over7Days: toNum(snapshot.laundryAgingOver7),
                },
                avgCycleDays: toNum(snapshot.avgLaundryCycleDays),
                delayedOrders: toNum(snapshot.delayedLaundryOrders),
            };

            const utilizationMetrics: UtilizationMetricsDTO = {
                topUtilized: [],
                underUtilized: [],
                overallUtilizationRate: 0,
            };

            const riskMetrics: RiskMetricsDTO = {
                stockoutRisk: (snapshot.stockoutRiskLevel as RiskMetricsDTO["stockoutRisk"]) ?? "LOW",
                vendorRisk: (snapshot.vendorRiskLevel as RiskMetricsDTO["vendorRisk"]) ?? "LOW",
                laundryBottleneck: (snapshot.laundryBottleneckLevel as RiskMetricsDTO["laundryBottleneck"]) ?? "LOW",
                eventCapacityRisk: (snapshot.eventCapacityRiskLevel as RiskMetricsDTO["eventCapacityRisk"]) ?? "LOW",
                overallRiskLevel: "LOW",
            };

            const financialMetrics: FinancialMetricsDTO = {
                inventoryValue: 0,
                monthlyConsumptionValue: 0,
                costOfLosses: 0,
                costOfDamages: 0,
                recoverySavings: 0,
                note: "Financial valuation is a V2 feature.",
            };

            return {
                snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
                dataSource: "SNAPSHOT",
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
                recommendations,
            };
        }

        // ─── Fallback: live aggregation (no snapshot yet) ─────────────────────
        const [computed, recommendations] = await Promise.all([
            DashboardAggregatorService.computeAll(tenantId),
            DashboardRepository.getActiveRecommendations(tenantId),
        ]);

        return {
            snapshotDate: new Date().toISOString().slice(0, 10),
            dataSource: "LIVE",
            summary: computed.summary,
            inventoryHealth: {
                score: computed.inventoryHealth.score,
                grade: computed.inventoryHealth.grade,
                components: computed.inventoryHealth.components,
            },
            demandForecast: computed.demandForecast,
            eventMetrics: computed.eventMetrics,
            lossMetrics: computed.lossMetrics,
            vendorMetrics: computed.vendorMetrics,
            laundryMetrics: computed.laundryMetrics,
            utilizationMetrics: computed.utilizationMetrics,
            riskMetrics: computed.riskMetrics,
            financialMetrics: computed.financialMetrics,
            recommendations,
        };
    }

    /**
     * Returns trend data for a date range.
     */
    static async getTrends(
        tenantId: number,
        fromDate: Date,
        toDate: Date
    ): Promise<TrendsResponse> {
        const series = await DashboardRepository.getTrends(tenantId, fromDate, toDate);
        return {
            fromDate: fromDate.toISOString().slice(0, 10),
            toDate: toDate.toISOString().slice(0, 10),
            series,
        };
    }
}
