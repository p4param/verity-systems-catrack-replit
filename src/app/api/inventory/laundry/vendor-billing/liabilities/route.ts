import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorLiabilityService } from "@/lib/inventory/vendor-billing/vendor-liability-service";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_LIABILITY_VIEW");
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");
        const status = url.searchParams.get("status");

        const liabilities = await VendorLiabilityService.listLiabilities(user.tenantId, {
            vendorId: vendorId ? parseInt(vendorId) : undefined,
            status: status ?? undefined,
        });

        return NextResponse.json(liabilities);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_LIABILITIES_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
