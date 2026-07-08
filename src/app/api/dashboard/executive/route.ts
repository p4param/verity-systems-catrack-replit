import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { DashboardService } from "@/lib/inventory/dashboard/dashboard-service";

/**
 * GET /api/dashboard/executive
 *
 * Returns the full executive dashboard payload.
 * Reads from DashboardSnapshot (pre-computed) — target response time: <300ms.
 *
 * Permissions required: DASHBOARD_EXECUTIVE_VIEW
 */
export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "DASHBOARD_EXECUTIVE_VIEW");
        const data = await DashboardService.getExecutiveDashboard(user.tenantId);
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[EXEC_DASHBOARD_GET]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
