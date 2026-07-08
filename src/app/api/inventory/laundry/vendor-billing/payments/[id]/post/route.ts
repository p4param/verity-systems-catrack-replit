import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorPaymentService } from "@/lib/inventory/vendor-billing/vendor-payment-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_PAYMENT_UPDATE");
        const { id } = await params;

        const payment = await VendorPaymentService.postPayment(
            user.tenantId,
            parseInt(id),
            user.sub
        );

        return NextResponse.json(payment);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_PAYMENT_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
