import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorStatementService } from "@/lib/inventory/vendor-billing/vendor-statement-service";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_STATEMENT_VIEW");
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");

        const aging = await VendorStatementService.getAgingReport(
            user.tenantId,
            vendorId ? parseInt(vendorId) : undefined
        );

        return NextResponse.json(aging);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_AGING_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
