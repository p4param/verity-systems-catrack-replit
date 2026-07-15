import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth/permission-guard"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await requirePermission(req, "USER_VIEW")
        const { id } = await params

        const user = await prisma.user.findFirst({
            where: {
                id,
                tenantId: currentUser.tenantId
            },
            include: {
                userRoles: {
                    include: { role: true }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            isActive: user.isActive,
            mfaEnabled: user.mfaEnabled,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            status: !user.passwordHash ? "PENDING" : (user.isActive ? "ACTIVE" : "DISABLED"),
            userRoles: user.userRoles
        })
    } catch (error) {
        if (error instanceof Response) return error
        console.error("Error fetching user:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch user" },
            { status: error instanceof Error && error.message.includes("UNAUTHORIZED") ? 401 : 500 }
        )
    }
}
