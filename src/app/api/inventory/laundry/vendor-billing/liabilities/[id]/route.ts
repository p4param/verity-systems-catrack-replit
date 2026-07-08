import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorLiabilityService } from "@/lib/inventory/vendor-billing/vendor-liability-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_LIABILITY_VIEW");
        const { id } = await params;

        const liability = await VendorLiabilityService.getLiability(user.tenantId, parseInt(id));
        if (!liability) {
            return NextResponse.json({ message: "Liability not found" }, { status: 404 });
        }

        return NextResponse.json(liability);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_LIABILITY_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
