import { NextResponse } from "next/server";
import { SupplierService } from "@/lib/inventory/supplier-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_PURCHASE_VIEW");
        const url = new URL(req.url);
        const isActiveStr = url.searchParams.get('isActive');

        let isActive: boolean | undefined = undefined;
        if (isActiveStr !== null) {
            isActive = isActiveStr === 'true';
        }

        const suppliers = await SupplierService.listSuppliers(user.tenantId, { isActive });
        return NextResponse.json(suppliers);
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[SUPPLIERS_GET_ERROR]", error);
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

        if (!body.name) {
            return NextResponse.json({ message: "Supplier name is required" }, { status: 400 });
        }

        const supplier = await SupplierService.createSupplier({
            tenantId: user.tenantId,
            name: body.name,
            contactInfo: body.contactInfo,
            isActive: body.isActive
        });

        return NextResponse.json(supplier, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[SUPPLIERS_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
