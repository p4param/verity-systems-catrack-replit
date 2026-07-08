import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";
import { AvailabilityEngine } from "@/lib/inventory/availability-engine";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");

        // 1. Get all active apparels
        const apparels = await prisma.apparel.findMany({
            where: { tenantId: user.tenantId, isActive: true },
            include: { category: true }
        });

        // 2. Get bulk balances (Optimized)
        const balancesMap = await AvailabilityEngine.getBulkBalances(user.tenantId);

        // 3. Merge
        const dashboardData = apparels.map(a => ({
            id: a.id,
            name: a.name,
            category: a.category.name,
            unit: a.unit,
            minStockLevel: a.minStockLevel,
            ...(balancesMap[a.id] || { totalStock: 0, physicalStock: 0, cleanStock: 0, dirtyStock: 0, reserved: 0, allotted: 0, inLaundry: 0, available: 0 })
        }));

        return NextResponse.json(dashboardData);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[DASHBOARD_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
