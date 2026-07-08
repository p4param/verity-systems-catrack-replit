import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { VendorBillingReportsService } from "@/lib/inventory/vendor-billing/vendor-billing-reports-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ reportType: string }> }
) {
    try {
        const user = await requirePermission(req, "LAUNDRY_VENDOR_BILLING_VIEW");
        const { reportType } = await params;
        const url = new URL(req.url);

        const vendorId = url.searchParams.get("vendorId");
        const apparelId = url.searchParams.get("apparelId");
        const fromDateStr = url.searchParams.get("fromDate");
        const toDateStr = url.searchParams.get("toDate");

        const filter = {
            tenantId: user.tenantId,
            vendorId: vendorId ? parseInt(vendorId) : undefined,
            apparelId: apparelId ? parseInt(apparelId) : undefined,
            fromDate: fromDateStr ? new Date(fromDateStr) : undefined,
            toDate: toDateStr ? new Date(toDateStr) : undefined,
        };

        let data;
        switch (reportType) {
            case "invoices":
                data = await VendorBillingReportsService.getInvoiceRegister(filter);
                break;
            case "payments":
                data = await VendorBillingReportsService.getPaymentRegister(filter);
                break;
            case "liabilities":
                data = await VendorBillingReportsService.getLiabilityRegister(filter);
                break;
            case "recovery-credits":
                data = await VendorBillingReportsService.getRecoveryCreditRegister(filter);
                break;
            case "outstanding":
                data = await VendorBillingReportsService.getOutstandingReport(filter);
                break;
            case "cost-by-vendor":
                data = await VendorBillingReportsService.getWashingCostByVendor(filter);
                break;
            case "cost-by-apparel":
                data = await VendorBillingReportsService.getWashingCostByApparel(filter);
                break;
            case "cost-by-month":
                data = await VendorBillingReportsService.getWashingCostByMonth(filter);
                break;
            case "loss-recovery":
                data = await VendorBillingReportsService.getLossRecoveryReport(filter);
                break;
            default:
                return NextResponse.json(
                    { message: `Unknown report type: ${reportType}` },
                    { status: 400 }
                );
        }

        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[VENDOR_REPORT_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
