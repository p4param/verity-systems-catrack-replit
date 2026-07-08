import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorInvoiceService } from "@/lib/inventory/vendor-billing/vendor-invoice-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_UPDATE");
        const { id } = await params;

        const invoice = await VendorInvoiceService.cancelInvoice(
            user.tenantId,
            parseInt(id),
            user.sub
        );

        return NextResponse.json(invoice);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_INVOICE_CANCEL_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
