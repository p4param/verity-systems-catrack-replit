import { NextResponse } from "next/server";
import { MasterDataService } from "@/lib/inventory/master-data-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_UPDATE");
        const { id } = await context.params;
        const body = await req.json();

        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo;
        if (body.taxId !== undefined) updateData.taxId = body.taxId;
        if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms;
        if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit ? parseFloat(body.creditLimit) : null;
        if (body.isPreferred !== undefined) updateData.isPreferred = body.isPreferred;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;

        const supplier = await MasterDataService.updateSupplier(user.tenantId, parseInt(id, 10), updateData);
        return NextResponse.json(supplier);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_DELETE");
        const { id } = await context.params;
        await MasterDataService.softDeleteSupplier(user.tenantId, parseInt(id, 10));
        return NextResponse.json({ message: "Supplier deactivated successfully" });
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to soft-delete supplier" },
            { status: 400 }
        );
    }
}
