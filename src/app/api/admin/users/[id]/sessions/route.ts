import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permission-guard";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await requirePermission(req, "USER_VIEW");
        const tenantId = currentUser.tenantId;
        const { id: targetUserId } = await params;

        const targetUser = await prisma.user.findFirst({
            where: { id: targetUserId, tenantId }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const sessions = await prisma.refreshToken.findMany({
            where: { userId: targetUserId },
            select: {
                id: true,
                deviceInfo: true,
                ipAddress: true,
                lastActiveAt: true,
                createdAt: true,
                expiresAt: true,
                revokedAt: true
            },
            orderBy: { createdAt: "desc" },
            take: 20
        });

        const formattedSessions = sessions.map(s => ({
            ...s,
            status: s.revokedAt ? "REVOKED" : (new Date(s.expiresAt) < new Date() ? "EXPIRED" : "ACTIVE")
        }));

        return NextResponse.json({ sessions: formattedSessions });

    } catch (error) {
        if (error instanceof Response) return error;
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
