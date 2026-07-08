import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";
import { AvailabilityEngine } from "@/lib/inventory/availability-engine";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");
        const { id } = await params;
        const apparelId = parseInt(id);

        // 1. Get Apparel Basic Info
        const apparel = await prisma.apparel.findUniqueOrThrow({
            where: { id: apparelId, tenantId: user.tenantId },
            include: { category: true }
        });

        // 2. Get Dynamic Balances
        const balances = await AvailabilityEngine.getBalances(user.tenantId, apparelId);

        // 3. Get Recent Movements (Ledger - last 50)
        const movements = await prisma.stockMovement.findMany({
            where: { apparelId, tenantId: user.tenantId },
            include: { recoveries: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // 4. Get Active & Allotted Reservations
        const reservations = await prisma.eventReservation.findMany({
            where: { apparelId, tenantId: user.tenantId, status: { in: ['ACTIVE', 'ALLOTTED'] } },
            include: { event: true },
            orderBy: { createdAt: 'desc' }
        });

        // 5. Get Net-Loss Report
        const { RecoveryService } = await import("@/lib/inventory/recovery-service");
        const netLossReport = await RecoveryService.getNetLossReport(user.tenantId, { apparelId });

        return NextResponse.json({
            apparel,
            balances,
            movements,
            reservations,
            netLossReport
        });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[APPAREL_DETAIL_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
