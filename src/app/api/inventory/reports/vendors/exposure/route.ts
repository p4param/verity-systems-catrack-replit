import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-guard";
import { VendorReportService } from "@/lib/inventory/vendor-report-service";

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);

        const vendorId = searchParams.get("vendorId") ? parseInt(searchParams.get("vendorId")!) : undefined;
        const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
        const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

        const data = await VendorReportService.getStockExposure(user.tenantId, {
            vendorId,
            startDate,
            endDate
        });

        return NextResponse.json(data);
    } catch (error: any) {
        if (error instanceof Response) return error;
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
