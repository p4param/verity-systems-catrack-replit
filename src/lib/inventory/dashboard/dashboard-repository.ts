import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import type {
    AIRecommendationDTO,
    TrendSeriesDTO,
} from "./dashboard-types";

/**
 * DashboardRepository
 *
 * All reads are from pre-computed snapshot tables only.
 * NEVER queries StockMovement directly — that is the aggregator's responsibility.
 */
export class DashboardRepository {
    // ─── Snapshot Reads ───────────────────────────────────────────────────────

    /**
     * Retrieve the most recent DashboardSnapshot for a tenant.
     * Returns null if no snapshot has been generated yet.
     */
    static async getLatestSnapshot(tenantId: number) {
        return prisma.dashboardSnapshot.findFirst({
            where: { tenantId },
            orderBy: { snapshotDate: "desc" },
        });
    }

    /**
     * Retrieve snapshot for a specific date.
     */
    static async getSnapshotByDate(tenantId: number, date: Date) {
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        return prisma.dashboardSnapshot.findUnique({
            where: {
                tenantId_snapshotDate: {
                    tenantId,
                    snapshotDate: dateOnly,
                },
            },
        });
    }

    /**
     * Upsert a DashboardSnapshot (idempotent).
     * Called by DashboardSnapshotJob after computing all KPIs.
     */
    static async upsertSnapshot(
        tenantId: number,
        snapshotDate: Date,
        data: Omit<Prisma.DashboardSnapshotCreateInput, 'tenant' | 'snapshotDate'>
    ) {
        const dateOnly = new Date(snapshotDate);
        dateOnly.setHours(0, 0, 0, 0);

        return prisma.dashboardSnapshot.upsert({
            where: {
                tenantId_snapshotDate: {
                    tenantId,
                    snapshotDate: dateOnly,
                },
            },
            update: data as Prisma.DashboardSnapshotUpdateInput,
            create: { ...data, tenant: { connect: { id: tenantId } }, snapshotDate: dateOnly },
        });
    }

    // ─── Trend Reads ──────────────────────────────────────────────────────────

    /**
     * Retrieve KPI trend data between two dates.
     * Returns grouped by metricCode with sorted data points.
     */
    static async getTrends(
        tenantId: number,
        fromDate: Date,
        toDate: Date,
        metricCodes?: string[]
    ): Promise<TrendSeriesDTO[]> {
        const where: Prisma.KPITrendSnapshotWhereInput = {
            tenantId,
            snapshotDate: {
                gte: fromDate,
                lte: toDate,
            },
        };

        if (metricCodes && metricCodes.length > 0) {
            where.metricCode = { in: metricCodes };
        }

        const rows = await prisma.kPITrendSnapshot.findMany({
            where,
            orderBy: { snapshotDate: "asc" },
            select: {
                metricCode: true,
                metricValue: true,
                snapshotDate: true,
            },
        });

        // Group by metricCode
        const seriesMap = new Map<string, TrendSeriesDTO>();
        for (const row of rows) {
            if (!seriesMap.has(row.metricCode)) {
                seriesMap.set(row.metricCode, {
                    metricCode: row.metricCode,
                    dataPoints: [],
                });
            }
            seriesMap.get(row.metricCode)!.dataPoints.push({
                date: row.snapshotDate.toISOString().slice(0, 10),
                value: Number(row.metricValue),
            });
        }

        return Array.from(seriesMap.values());
    }

    /**
     * Upsert a KPI trend row (idempotent).
     */
    static async upsertTrend(
        tenantId: number,
        snapshotDate: Date,
        metricCode: string,
        metricValue: number
    ) {
        const dateOnly = new Date(snapshotDate);
        dateOnly.setHours(0, 0, 0, 0);

        return prisma.kPITrendSnapshot.upsert({
            where: {
                tenantId_metricCode_snapshotDate: {
                    tenantId,
                    metricCode,
                    snapshotDate: dateOnly,
                },
            },
            update: { metricValue },
            create: {
                tenantId,
                metricCode,
                snapshotDate: dateOnly,
                metricValue,
            },
        });
    }

    // ─── AI Recommendations ───────────────────────────────────────────────────

    /**
     * Retrieve active AI recommendations, ordered by priority then recency.
     */
    static async getActiveRecommendations(
        tenantId: number,
        limit = 10
    ): Promise<AIRecommendationDTO[]> {
        const PRIORITY_ORDER: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
        };

        const rows = await prisma.aIRecommendation.findMany({
            where: { tenantId, status: "ACTIVE" },
            orderBy: [{ createdAt: "desc" }],
            take: limit * 2, // Fetch extra to allow in-memory priority sort
            select: {
                id: true,
                priority: true,
                type: true,
                title: true,
                description: true,
                payload: true,
                createdAt: true,
            },
        });

        // Sort by priority weight then createdAt
        rows.sort((a, b) => {
            const priorityDiff =
                (PRIORITY_ORDER[a.priority] ?? 99) -
                (PRIORITY_ORDER[b.priority] ?? 99);
            if (priorityDiff !== 0) return priorityDiff;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });

        return rows.slice(0, limit).map((r) => ({
            id: r.id,
            priority: r.priority as AIRecommendationDTO["priority"],
            type: r.type as AIRecommendationDTO["type"],
            title: r.title,
            description: r.description,
            payload: r.payload as Record<string, unknown> | undefined,
            createdAt: r.createdAt.toISOString(),
        }));
    }
}
