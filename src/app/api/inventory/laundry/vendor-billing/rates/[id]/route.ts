import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorRateService } from "@/lib/inventory/vendor-billing/vendor-rate-service";
import { UpdateVendorRateSchema } from "@/lib/inventory/vendor-billing/validation";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_VIEW");
        const { id } = await params;

        const rate = await VendorRateService.getRate(user.tenantId, parseInt(id));
        if (!rate) {
            return NextResponse.json({ message: "Rate not found" }, { status: 404 });
        }

        return NextResponse.json(rate);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_RATE_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_UPDATE");
        const { id } = await params;
        const body = await req.json();

        // If deactivating
        if (body.isActive === false) {
            const result = await VendorRateService.deactivateRate(
                user.tenantId, parseInt(id), user.sub
            );
            return NextResponse.json(result);
        }

        return NextResponse.json({ message: "Update not supported. Create a new rate revision." }, { status: 400 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_RATE_PATCH_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
