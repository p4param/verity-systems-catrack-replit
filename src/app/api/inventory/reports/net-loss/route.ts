import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-guard";
import { RecoveryService } from "@/lib/inventory/recovery-service";

export async function GET(req: NextRequest) {
    try {
        const user = requireAuth(req);
        const { searchParams } = new URL(req.url);
        const apparelId = searchParams.get('apparelId') ? parseInt(searchParams.get('apparelId')!) : undefined;

        const report = await RecoveryService.getNetLossReport(user.tenantId, { apparelId });

        return NextResponse.json(report);
    } catch (err: any) {
        return NextResponse.json(
            { message: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
}
