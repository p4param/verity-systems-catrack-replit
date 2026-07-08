import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorInvoiceService } from "@/lib/inventory/vendor-billing/vendor-invoice-service";
import { GenerateInvoiceSchema } from "@/lib/inventory/vendor-billing/validation";

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_CREATE");
        const body = await req.json();
        const validated = GenerateInvoiceSchema.parse(body);

        const invoice = await VendorInvoiceService.generateInvoice({
            tenantId: user.tenantId,
            ...validated,
            createdBy: user.sub,
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_INVOICE_GENERATE_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
