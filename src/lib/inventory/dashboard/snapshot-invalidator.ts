import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

/**
 * SnapshotInvalidator
 *
 * Deletes today's DashboardSnapshot for a tenant after any inventory write.
 * This forces the next API read to fall back to live aggregation (DashboardService
 * falls through to DashboardAggregatorService when no snapshot row exists).
 *
 * Safe to call from within a Prisma $transaction by passing `tx` — the delete
 * will be rolled back if the outer transaction fails.
 */
export class SnapshotInvalidator {
    static async invalidateToday(tenantId: number, tx?: Prisma.TransactionClient): Promise<void> {
        const db = tx ?? prisma;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await (db as typeof prisma).dashboardSnapshot.deleteMany({
            where: { tenantId, snapshotDate: today },
        });
    }
}
