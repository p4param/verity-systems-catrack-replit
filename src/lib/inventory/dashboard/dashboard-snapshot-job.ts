import { prisma } from "@/lib/prisma";
import { DashboardAggregatorService } from "./dashboard-aggregator";
import { DashboardRepository } from "./dashboard-repository";
import { KPI_METRIC_CODES } from "./dashboard-types";

/**
 * DashboardSnapshotJob
 *
 * Nightly aggregation job that:
 * 1. Computes all KPIs from the live ledger
 * 2. Upserts a DashboardSnapshot row for today (idempotent)
 * 3. Upserts KPITrendSnapshot rows for trend charts
 *
 * Designed to be:
 * - Idempotent: safe to run multiple times per day
 * - Tenant-isolated: processes one tenant at a time
 * - Resilient: catches per-tenant errors so other tenants still process
 */
export class DashboardSnapshotJob {

    /**
     * Run the snapshot job for a specific tenant.
     */
    static async run(tenantId: string): Promise<{
        success: boolean;
        snapshotDate: string;
        tenantId: string;
        durationMs: number;
    }> {
        const startTime = Date.now();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log(`[DashboardSnapshotJob] Starting for tenantId=${tenantId}, date=${today.toISOString().slice(0, 10)}`);

        // Compute all KPIs
        const computed = await DashboardAggregatorService.computeAll(tenantId);

        // ─── Upsert DashboardSnapshot ─────────────────────────────────────────
        await DashboardRepository.upsertSnapshot(tenantId, today, {

            // Inventory Summary
            totalPhysicalInventory: computed.summary.totalPhysicalInventory,
            availableInventory: computed.summary.availableInventory,
            reservedInventory: computed.summary.reservedInventory,
            dirtyInventory: computed.summary.dirtyInventory,
            inLaundryInventory: computed.summary.inLaundryInventory,

            // Health Score
            inventoryHealth: computed.inventoryHealth.score,
            availabilityScore: computed.inventoryHealth.components.availability,
            stockoutRiskScore: computed.inventoryHealth.components.stockoutRisk,
            dirtyRatioScore: computed.inventoryHealth.components.dirtyRatio,
            lossRatioScore: computed.inventoryHealth.components.lossRatio,
            agingScore: computed.inventoryHealth.components.aging,

            // Demand Forecast
            predictedDemand30Days: computed.demandForecast.predictedDemand30Days,
            forecastAccuracy: computed.demandForecast.forecastAccuracy,
            predictedPurchaseRequirement: computed.demandForecast.predictedPurchaseRequirement,
            stockoutRisk: computed.demandForecast.stockoutRisk,

            // Events
            upcomingEvents: computed.eventMetrics.upcomingEvents,
            eventsThisMonth: computed.eventMetrics.eventsThisMonth,
            eventCompletionRate: computed.eventMetrics.eventCompletionRate,
            eventsPendingReconciliation: computed.eventMetrics.eventsPendingReconciliation,

            // Loss & Recovery
            grossLoss: computed.lossMetrics.grossLoss,
            recovered: computed.lossMetrics.recovered,
            netLoss: computed.lossMetrics.netLoss,
            lossRate: computed.lossMetrics.lossRate,
            recoveryRate: computed.lossMetrics.recoveryRate,
            financialImpact: 0,

            // Vendor
            vendorScore: computed.vendorMetrics.overallScore,
            highRiskVendorCount: computed.vendorMetrics.highRiskVendorCount,
            averageTurnaroundDays: computed.vendorMetrics.averageTurnaroundDays,
            vendorLiability: 0,

            // Laundry
            dirtyStock: computed.laundryMetrics.dirtyStockQty,
            inLaundry: computed.laundryMetrics.inLaundryQty,
            laundryAging0to3: computed.laundryMetrics.agingBuckets.within3Days,
            laundryAging4to7: computed.laundryMetrics.agingBuckets.within7Days,
            laundryAgingOver7: computed.laundryMetrics.agingBuckets.over7Days,
            avgLaundryCycleDays: computed.laundryMetrics.avgCycleDays,
            delayedLaundryOrders: computed.laundryMetrics.delayedOrders,

            // Risk
            stockoutRiskLevel: computed.riskMetrics.stockoutRisk,
            vendorRiskLevel: computed.riskMetrics.vendorRisk,
            laundryBottleneckLevel: computed.riskMetrics.laundryBottleneck,
            eventCapacityRiskLevel: computed.riskMetrics.eventCapacityRisk,

            // Financial (placeholders)
            inventoryValue: 0,
            monthlyConsumptionValue: 0,
            costOfLosses: 0,
            costOfDamages: 0,
            recoverySavings: 0,
        });

        // ─── Upsert KPI Trend Rows ────────────────────────────────────────────
        const trendUpdates = [
            [KPI_METRIC_CODES.INVENTORY_HEALTH, computed.inventoryHealth.score],
            [KPI_METRIC_CODES.AVAILABLE_INVENTORY, computed.summary.availableInventory],
            [KPI_METRIC_CODES.DIRTY_INVENTORY, computed.summary.dirtyInventory],
            [KPI_METRIC_CODES.GROSS_LOSS, computed.lossMetrics.grossLoss],
            [KPI_METRIC_CODES.NET_LOSS, computed.lossMetrics.netLoss],
            [KPI_METRIC_CODES.RECOVERY_RATE, computed.lossMetrics.recoveryRate],
            [KPI_METRIC_CODES.VENDOR_SCORE, computed.vendorMetrics.overallScore],
            [KPI_METRIC_CODES.DELAYED_LAUNDRY, computed.laundryMetrics.delayedOrders],
            [KPI_METRIC_CODES.LOSS_RATE, computed.lossMetrics.lossRate],
            [KPI_METRIC_CODES.EVENT_COMPLETION_RATE, computed.eventMetrics.eventCompletionRate],
            [KPI_METRIC_CODES.IN_LAUNDRY_QTY, computed.laundryMetrics.inLaundryQty],
        ] as [string, number][];

        await Promise.all(
            trendUpdates.map(([metricCode, value]) =>
                DashboardRepository.upsertTrend(tenantId, today, metricCode, value)
            )
        );

        const durationMs = Date.now() - startTime;
        console.log(`[DashboardSnapshotJob] Completed for tenantId=${tenantId} in ${durationMs}ms`);

        return {
            success: true,
            snapshotDate: today.toISOString().slice(0, 10),
            tenantId,
            durationMs,
        };
    }

    /**
     * Run the snapshot job for ALL active tenants.
     * Used by the global nightly cron trigger.
     */
    static async runForAllTenants(): Promise<{
        processed: number;
        errors: { tenantId: string; error: string }[];
        durationMs: number;
    }> {
        const startTime = Date.now();
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true },
            select: { id: true },
        });

        const errors: { tenantId: string; error: string }[] = [];
        let processed = 0;

        for (const tenant of tenants) {
            try {
                await this.run(tenant.id);
                processed++;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[DashboardSnapshotJob] Error for tenantId=${tenant.id}: ${message}`);
                errors.push({ tenantId: tenant.id, error: message });
            }
        }

        return {
            processed,
            errors,
            durationMs: Date.now() - startTime,
        };
    }
}

