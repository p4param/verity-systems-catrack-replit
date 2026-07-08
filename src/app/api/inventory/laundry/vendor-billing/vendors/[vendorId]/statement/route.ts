import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorStatementService } from "@/lib/inventory/vendor-billing/vendor-statement-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ vendorId: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_STATEMENT_VIEW");
        const { vendorId } = await params;
        const url = new URL(req.url);
        const fromDateStr = url.searchParams.get("fromDate");
        const toDateStr = url.searchParams.get("toDate");

        const statement = await VendorStatementService.getStatement(
            user.tenantId,
            parseInt(vendorId),
            {
                fromDate: fromDateStr ? new Date(fromDateStr) : undefined,
                toDate: toDateStr ? new Date(toDateStr) : undefined,
            }
        );

        return NextResponse.json(statement);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_STATEMENT_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
