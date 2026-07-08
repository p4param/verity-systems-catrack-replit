import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorPaymentService } from "@/lib/inventory/vendor-billing/vendor-payment-service";
import { CreatePaymentSchema } from "@/lib/inventory/vendor-billing/validation";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_PAYMENT_VIEW");
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");
        const status = url.searchParams.get("status");

        const payments = await VendorPaymentService.listPayments(user.tenantId, {
            vendorId: vendorId ? parseInt(vendorId) : undefined,
            status: status ?? undefined,
        });

        return NextResponse.json(payments);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_PAYMENTS_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_PAYMENT_CREATE");
        const body = await req.json();
        const validated = CreatePaymentSchema.parse(body);

        const payment = await VendorPaymentService.createPayment({
            tenantId: user.tenantId,
            ...validated,
            createdBy: user.sub,
        });

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_PAYMENTS_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
