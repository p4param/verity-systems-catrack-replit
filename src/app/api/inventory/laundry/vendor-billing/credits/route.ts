import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorRecoveryCreditService } from "@/lib/inventory/vendor-billing/vendor-recovery-credit-service";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_LIABILITY_VIEW");
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");

        const credits = await VendorRecoveryCreditService.listCredits(user.tenantId, {
            vendorId: vendorId ? parseInt(vendorId) : undefined,
        });

        return NextResponse.json(credits);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_CREDITS_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
