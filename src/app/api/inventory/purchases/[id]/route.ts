import { NextResponse } from "next/server";
import { PurchaseOrderService } from "@/lib/inventory/purchase-order-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_VIEW");
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        if (isNaN(id)) return NextResponse.json({ message: "Invalid PO ID" }, { status: 400 });

        const po = await PurchaseOrderService.getPurchaseOrder(user.tenantId, id);
        if (!po) return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });

        return NextResponse.json(po);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[PURCHASE_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_CREATE");
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        if (isNaN(id)) return NextResponse.json({ message: "Invalid PO ID" }, { status: 400 });

        const body = await req.json();

        if (body.status === "CLOSED" || body.status === "CANCELLED") {
            const updated = await PurchaseOrderService.updateStatus(user.tenantId, id, body.status, user.sub);
            return NextResponse.json(updated);
        }

        return NextResponse.json({ message: "Invalid status update" }, { status: 400 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[PURCHASE_PUT_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
