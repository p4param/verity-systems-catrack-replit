import { NextResponse } from "next/server";
import { MasterDataService } from "@/lib/inventory/master-data-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_UPDATE");
        const resolvedParams = await context.params;
        const id = parseInt(resolvedParams.id, 10);

        if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        const body = await req.json();
        const item = await MasterDataService.updateLocation(user.tenantId, id, body);

        return NextResponse.json(item);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_DELETE");
        const resolvedParams = await context.params;
        const id = parseInt(resolvedParams.id, 10);

        if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        await MasterDataService.softDeleteLocation(user.tenantId, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
