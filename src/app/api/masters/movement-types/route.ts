import { NextResponse } from "next/server";
import { MasterDataService } from "@/lib/inventory/master-data-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_VIEW");
        const url = new URL(req.url);
        const includeInactive = url.searchParams.get("includeInactive") === "true";

        const items = await MasterDataService.listMovementTypes(user.tenantId, includeInactive);
        return NextResponse.json(items);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_CREATE");
        const body = await req.json();

        if (!body.code || !body.direction) {
            return NextResponse.json({ message: "Code and direction are required." }, { status: 400 });
        }

        const item = await MasterDataService.createMovementType(user.tenantId, body);
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
