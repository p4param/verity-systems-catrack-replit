import { NextResponse } from "next/server";
import { PurchaseOrderService } from "@/lib/inventory/purchase-order-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_RECEIVE");
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        if (isNaN(id)) return NextResponse.json({ message: "Invalid PO ID" }, { status: 400 });

        const body = await req.json();

        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ message: "Items to receive are required" }, { status: 400 });
        }

        const po = await PurchaseOrderService.receiveGoods({
            tenantId: user.tenantId,
            purchaseOrderId: id,
            items: body.items,
            createdBy: user.sub
        });

        return NextResponse.json(po);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[PURCHASE_RECEIVE_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
