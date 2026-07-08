import { NextResponse } from "next/server";
import { PurchaseOrderService } from "@/lib/inventory/purchase-order-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_APPROVE");
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        if (isNaN(id)) return NextResponse.json({ message: "Invalid PO ID" }, { status: 400 });

        const po = await PurchaseOrderService.approvePurchaseOrder(user.tenantId, id, user.sub);

        return NextResponse.json(po);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[PURCHASE_APPROVE_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
