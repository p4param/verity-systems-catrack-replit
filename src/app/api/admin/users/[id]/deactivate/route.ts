import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth/permission-guard"
import { createAuditLog } from "@/lib/audit"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requirePermission(req, "USER_UPDATE")
        const { id: userId } = await params

        const body = await req.json().catch(() => ({}))
        const reason = body.reason || null

        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId: admin.tenantId }
        })

        if (!user) {
            return NextResponse.json({ message: "User not found in your tenant" }, { status: 404 })
        }

        if (admin.sub === userId) {
            return NextResponse.json({ message: "Cannot deactivate your own account" }, { status: 400 })
        }

        if (user.isActive === false) {
            return NextResponse.json({ message: "User is already deactivated" }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: false, updatedAt: new Date(), updatedBy: admin.sub }
            })

            await tx.refreshToken.updateMany({
                where: { userId, revokedAt: null },
                data: {
                    revokedAt: new Date(),
                    revokedByIp: req.headers.get("x-forwarded-for") || "unknown"
                }
            })

            await createAuditLog({
                tenantId: admin.tenantId,
                actorUserId: admin.sub,
                targetUserId: userId,
                action: "USER.DEACTIVATE",
                details: JSON.stringify({ email: user.email, reason, sessionsRevoked: true }),
                ipAddress: req.headers.get("x-forwarded-for") || "unknown"
            }, tx)
        })

        return NextResponse.json({
            message: "User deactivated successfully",
            user: { id: user.id, email: user.email, fullName: user.fullName, status: "DISABLED" }
        })

    } catch (error) {
        if (error instanceof Response) return error
        console.error("[USER_DEACTIVATE_ERROR]", error)
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}
