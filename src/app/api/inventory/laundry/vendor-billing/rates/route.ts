import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorRateService } from "@/lib/inventory/vendor-billing/vendor-rate-service";
import { CreateVendorRateSchema } from "@/lib/inventory/vendor-billing/validation";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_VIEW");
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");
        const apparelId = url.searchParams.get("apparelId");

        const rates = await VendorRateService.listRates(user.tenantId, {
            vendorId: vendorId ? parseInt(vendorId) : undefined,
            apparelId: apparelId ? parseInt(apparelId) : undefined,
            activeOnly: url.searchParams.get("activeOnly") === "true",
        });

        return NextResponse.json(rates);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_RATES_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_CREATE");
        const body = await req.json();
        const validated = CreateVendorRateSchema.parse(body);

        const rate = await VendorRateService.createRate({
            tenantId: user.tenantId,
            ...validated,
            createdBy: user.sub,
        });

        return NextResponse.json(rate, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_RATES_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
