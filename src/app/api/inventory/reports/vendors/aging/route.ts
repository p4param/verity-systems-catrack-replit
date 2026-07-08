import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-guard";
import { VendorReportService } from "@/lib/inventory/vendor-report-service";

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);

        const vendorId = searchParams.get("vendorId") ? parseInt(searchParams.get("vendorId")!) : undefined;

        const data = await VendorReportService.getLaundryAging(user.tenantId, {
            vendorId
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
