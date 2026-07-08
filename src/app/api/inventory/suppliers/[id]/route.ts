import { NextResponse } from "next/server";
import { SupplierService } from "@/lib/inventory/supplier-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_VIEW");
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        const supplier = await SupplierService.getSupplier(user.tenantId, id);
        if (!supplier) return NextResponse.json({ message: "Not found" }, { status: 404 });

        return NextResponse.json(supplier);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[SUPPLIER_GET_ERROR]", error);
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
        if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        const body = await req.json();

        const updated = await SupplierService.updateSupplier({
            id,
            tenantId: user.tenantId,
            name: body.name,
            contactInfo: body.contactInfo,
            isActive: body.isActive
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[SUPPLIER_PUT_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_CREATE");
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id, 10);
        if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        const deleted = await SupplierService.deleteSupplier(user.tenantId, id);
        return NextResponse.json(deleted);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[SUPPLIER_DELETE_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
