import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_VIEW");

        const orders = await prisma.laundryOrder.findMany({
            where: { tenantId: user.tenantId },
            include: {
                vendor: true,
                items: {
                    include: { apparel: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add net-loss reports and movements
        const { RecoveryService } = await import("@/lib/inventory/recovery-service");
        const ordersWithReports = await Promise.all(orders.map(async (order) => {
            const report = await RecoveryService.getNetLossReport(user.tenantId, {
                referenceType: 'LAUNDRY',
                referenceId: order.id
            });

            const movements = await prisma.stockMovement.findMany({
                where: {
                    tenantId: user.tenantId,
                    referenceType: 'LAUNDRY',
                    referenceId: order.id,
                    movementType: { in: ['MISSING', 'DAMAGE'] }
                },
                include: {
                    apparel: true,
                    recoveries: true
                }
            });

            return { ...order, netLossReport: report, movements };
        }));

        return NextResponse.json(ordersWithReports);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[LAUNDRY_ORDERS_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
