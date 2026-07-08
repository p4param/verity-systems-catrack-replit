import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { DashboardService } from "@/lib/inventory/dashboard/dashboard-service";

/**
 * GET /api/dashboard/executive/trends
 *
 * Returns daily KPI trend data from KPITrendSnapshot.
 *
 * Query parameters:
 *   fromDate  — ISO date string (YYYY-MM-DD), defaults to 30 days ago
 *   toDate    — ISO date string (YYYY-MM-DD), defaults to today
 *
 * Permissions required: DASHBOARD_EXECUTIVE_VIEW
 */
export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "DASHBOARD_EXECUTIVE_VIEW");

        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("fromDate");
        const toParam = searchParams.get("toDate");

        const toDate = toParam ? new Date(toParam) : new Date();
        const fromDate = fromParam
            ? new Date(fromParam)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Clamp to maximum 365-day range
        const maxRangeMs = 365 * 24 * 60 * 60 * 1000;
        if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
            return NextResponse.json(
                { message: "Date range cannot exceed 365 days." },
                { status: 400 }
            );
        }

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return NextResponse.json(
                { message: "Invalid date format. Use YYYY-MM-DD." },
                { status: 400 }
            );
        }

        const data = await DashboardService.getTrends(user.tenantId, fromDate, toDate);
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[EXEC_DASHBOARD_TRENDS_GET]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
