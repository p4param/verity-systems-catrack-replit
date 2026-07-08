import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permission-guard";
import { RecoveryService } from "@/lib/inventory/recovery-service";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission(req, "INVENTORY_RECOVERY");
        const body = await req.json();
        const { id } = await params;
        const movementId = parseInt(id);

        if (isNaN(movementId)) {
            return NextResponse.json({ message: "Invalid movement ID" }, { status: 400 });
        }

        if (!body.quantity || body.quantity <= 0) {
            return NextResponse.json({ message: "Quantity must be greater than zero" }, { status: 400 });
        }

        if (!body.reason || !body.reason.trim()) {
            return NextResponse.json({ message: "Reason is required for auditing" }, { status: 400 });
        }

        const result = await RecoveryService.recordRecovery({
            tenantId: user.tenantId,
            movementId,
            quantity: body.quantity,
            condition: body.condition || 'CLEAN',
            reason: body.reason,
            userId: user.sub
        });

        return NextResponse.json(result);
    } catch (err: any) {
        if (err instanceof Response) {
            const data = await err.json().catch(() => ({}));
            return NextResponse.json(
                { message: data.message || "Forbidden" },
                { status: err.status }
            );
        }

        console.error("Recovery API Error Details:", {
            message: err.message,
            stack: err.stack,
            cause: err.cause,
            status: err.status
        });
        return NextResponse.json(
            {
                message: err.message || "Internal Server Error",
                details: process.env.NODE_ENV === 'development' ? err.stack : undefined
            },
            { status: err.status || 500 }
        );
    }
}
