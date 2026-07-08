import { NextResponse } from "next/server";
import { MasterDataService } from "@/lib/inventory/master-data-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_VIEW");
        const url = new URL(req.url);
        const includeInactiveStr = url.searchParams.get('includeInactive');

        const includeInactive = includeInactiveStr === 'true';

        const suppliers = await MasterDataService.listSuppliers(user.tenantId, includeInactive);
        return NextResponse.json(suppliers);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_CREATE");
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 });
        }

        const supplier = await MasterDataService.createSupplier(user.tenantId, {
            name: body.name,
            contactInfo: body.contactInfo,
            taxId: body.taxId,
            paymentTerms: body.paymentTerms,
            creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
            isPreferred: body.isPreferred,
            isActive: body.isActive ?? true
        });

        return NextResponse.json(supplier, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ message: "A supplier with this name already exists" }, { status: 400 });
        }
        return NextResponse.json({ message: "Failed to create supplier" }, { status: 500 });
    }
}
