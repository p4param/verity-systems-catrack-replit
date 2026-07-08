import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorBillingDashboardService } from "@/lib/inventory/vendor-billing/vendor-billing-dashboard-service";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_VIEW");

        const kpis = await VendorBillingDashboardService.getKPIs(user.tenantId);

        return NextResponse.json(kpis);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_DASHBOARD_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
