import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth/permission-guard"
import { createAuditLog } from "@/lib/audit"
import crypto from "crypto"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Require admin authentication
        const admin = await requirePermission(req, "USER_CREATE")

        // 2. Get user ID from params
        const { id } = await params
        const userId = id // VS05Z: UUID string

        // 3. Verify user exists and belongs to admin's tenant
        // 3. Verify user exists and belongs to admin's tenant
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                tenantId: admin.tenantId
            }
        })

        if (!user) {
            return NextResponse.json(
                { message: "User not found in your tenant" },
                { status: 404 }
            )
        }

        // 4. Check if user is already active
        if (user.status === "ACTIVE") {
            return NextResponse.json(
                { message: "User account is already active. Invite cannot be resent." },
                { status: 400 }
            )
        }

        // 5. Find existing invite for this user
        const existingInvite = await prisma.userInvite.findFirst({
            where: {
                tenantId: admin.tenantId,
                email: user.email
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        // 6. Validate that previous invite is expired or used
        if (existingInvite) {
            const isExpired = existingInvite.expiresAt < new Date()
            const isUsed = existingInvite.usedAt !== null

            // If active invite exists, expire it so we can send a new one
            if (!isExpired && !isUsed) {
                await prisma.userInvite.update({
                    where: { id: existingInvite.id },
                    data: { expiresAt: new Date() }
                })
            }
        }

        // 7. Generate new cryptographically secure invite token
        const inviteToken = crypto.randomBytes(32).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(inviteToken).digest("hex")

        // 8. Create new invite in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create new invite
            const newInvite = await tx.userInvite.create({
                data: {
                    tenantId: admin.tenantId,
                    email: user.email,
                    tokenHash: tokenHash,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    createdBy: admin.sub
                }
            })

            // Log audit event
            await createAuditLog({
                tenantId: admin.tenantId,
                actorUserId: admin.sub,
                targetUserId: user.id,
                action: "USER.INVITE_RESENT",
                details: JSON.stringify({
                    email: user.email,
                    inviteId: newInvite.id,
                    previousInviteId: existingInvite?.id,
                    previousInviteStatus: existingInvite?.usedAt ? "used" : "expired"
                }),
                ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
            }, tx)

            return { invite: newInvite, inviteToken }
        })

        // Invite resent (activation token omitted from stdout per Platform Security Invariant)
        console.log(`[INVITE_RESENT] Invite resent for user: ${user.email} [UserId: ${user.id}, Expires: ${result.invite.expiresAt.toISOString()}]`)

        // 10. Return success response
        return NextResponse.json({
            message: "Invite resent successfully",
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                status: "PENDING"
            },
            // Note: In production, inviteToken should NEVER be returned in the response
            expiresAt: result.invite.expiresAt
        })

    } catch (error) {
        if (error instanceof Response) return error

        console.error("[INVITE_RESEND_ERROR]", error)

        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}
