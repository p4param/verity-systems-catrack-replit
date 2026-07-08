import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorLiabilityService } from "@/lib/inventory/vendor-billing/vendor-liability-service";
import { WaiveLiabilitySchema } from "@/lib/inventory/vendor-billing/validation";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_LIABILITY_UPDATE");
        const { id } = await params;
        const body = await req.json();
        const validated = WaiveLiabilitySchema.parse(body);

        const liability = await VendorLiabilityService.waiveLiability(
            user.tenantId,
            parseInt(id),
            validated.remarks,
            user.sub
        );

        return NextResponse.json(liability);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_LIABILITY_WAIVE_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
