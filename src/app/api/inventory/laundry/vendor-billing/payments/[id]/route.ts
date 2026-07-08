import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorPaymentService } from "@/lib/inventory/vendor-billing/vendor-payment-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_PAYMENT_VIEW");
        const { id } = await params;

        const payment = await VendorPaymentService.getPayment(user.tenantId, parseInt(id));
        if (!payment) {
            return NextResponse.json({ message: "Payment not found" }, { status: 404 });
        }

        return NextResponse.json(payment);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_PAYMENT_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
