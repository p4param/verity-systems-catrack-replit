import { NextResponse } from "next/server";
import { MasterDataService } from "@/lib/inventory/master-data-service";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_MASTER_VIEW");
        const items = await MasterDataService.getSettings(user.tenantId);
        return NextResponse.json(items);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const user = await requirePermission(req, "INVENTORY_SETTINGS_MANAGE");
        const body = await req.json();

        // Strip restricted fields from client body
        const safeBody = {
            allowNegativeStock: body.allowNegativeStock,
            requireApprovalForRecovery: body.requireApprovalForRecovery,
            defaultLaundrySLA: body.defaultLaundrySLA,
            enableMultiLocation: body.enableMultiLocation,
            enableValuation: body.enableValuation,
            currencySymbol: body.currencySymbol,
        };

        const item = await MasterDataService.updateSettings(user.tenantId, safeBody);

        return NextResponse.json(item);
    } catch (error) {
        if (error instanceof Response) return error;
        return NextResponse.json({ message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
