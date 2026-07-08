import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { LaundryReturnSchema } from "@/lib/inventory/validation";
import { LaundryService } from "@/lib/inventory/laundry-service";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
    try {
        const user = await requirePermission(req, "LAUNDRY_MANAGE");
        const body = await req.json();
        const validated = LaundryReturnSchema.parse(body);

        const order = await LaundryService.processReturn({
            tenantId: user.tenantId,
            ...validated,
            createdBy: user.sub
        });

        await createAuditLog({
            tenantId: user.tenantId,
            actorUserId: user.sub,
            action: "LAUNDRY.RETURN",
            details: JSON.stringify(order),
            ipAddress: req.headers.get("x-forwarded-for") || "unknown"
        });

        return NextResponse.json(order, { status: 200 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("[LAUNDRY_RETURN_POST_ERROR]", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
