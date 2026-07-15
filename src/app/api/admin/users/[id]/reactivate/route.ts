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

        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId: admin.tenantId }
        })

        if (!user) {
            return NextResponse.json({ message: "User not found in your tenant" }, { status: 404 })
        }

        if (!user.passwordHash) {
            return NextResponse.json(
                { message: "User has not completed activation. Use resend-invite instead." },
                { status: 400 }
            )
        }

        if (user.isActive === true) {
            return NextResponse.json({ message: "User is already active" }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: true, updatedAt: new Date(), updatedBy: admin.sub }
            })

            await createAuditLog({
                tenantId: admin.tenantId,
                actorUserId: admin.sub,
                targetUserId: userId,
                action: "USER.REACTIVATE",
                details: JSON.stringify({ email: user.email, fullName: user.fullName }),
                ipAddress: req.headers.get("x-forwarded-for") || "unknown"
            }, tx)
        })

        return NextResponse.json({
            message: "User reactivated successfully. User must log in again.",
            user: { id: user.id, email: user.email, fullName: user.fullName, status: "ACTIVE" }
        })

    } catch (error) {
        if (error instanceof Response) return error
        console.error("[USER_REACTIVATE_ERROR]", error)
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}
