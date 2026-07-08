import { NextResponse } from "next/server";
import { PurchaseOrderService } from "@/lib/inventory/purchase-order-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_VIEW");
        const url = new URL(req.url);

        const supplierIdStr = url.searchParams.get('supplierId');
        const status = url.searchParams.get('status') || undefined;

        let supplierId: number | undefined = undefined;
        if (supplierIdStr) {
            supplierId = parseInt(supplierIdStr, 10);
            if (isNaN(supplierId)) return NextResponse.json({ message: "Invalid supplierId" }, { status: 400 });
        }

        const orders = await PurchaseOrderService.listPurchaseOrders(user.tenantId, {
            supplierId,
            status
        });

        return NextResponse.json(orders);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[PURCHASES_GET_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_CREATE");
        const body = await req.json();

        // Basic validation
        if (!body.supplierId || !body.poNumber || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ message: "supplierId, poNumber, and items are required" }, { status: 400 });
        }

        const po = await PurchaseOrderService.createPurchaseOrder({
            tenantId: user.tenantId,
            supplierId: body.supplierId,
            poNumber: body.poNumber,
            expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
            notes: body.notes,
            items: body.items,
            createdBy: user.sub
        });

        return NextResponse.json(po, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[PURCHASES_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
