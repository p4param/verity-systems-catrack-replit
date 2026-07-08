import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-guard";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { reportType, filters } = await req.json();

        await prisma.auditLog.create({
            data: {
                tenantId: user.tenantId,
                actorUserId: user.sub,
                action: "REPORT_EXPORT",
                details: `Exported ${reportType} report with filters: ${JSON.stringify(filters)}`,
                ipAddress: req.headers.get("x-forwarded-for") || "unknown"
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof Response) return error;
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
