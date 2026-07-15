import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/auth-guard"
import { requirePermission } from "@/lib/auth/permission-guard"
import { NextResponse } from "next/server"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission(req, "ROLE_VIEW")

        const { id } = await params
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: { permission: true }
                }
            }
        })

        if (!role) {
            return NextResponse.json({ message: "Role not found" }, { status: 404 })
        }

        return NextResponse.json({
            id: role.id,
            name: role.name,
            permissions: role.rolePermissions.map(rp => rp.permission.code)
        })

    } catch (error) {
        if (error instanceof Response) return error
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        requireAuth(req)
        await requirePermission(req, "ROLE_CREATE")

        const { name, permissionIds } = await req.json()

        if (!name || !Array.isArray(permissionIds)) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
        }

        const { id } = await params

        const updatedRole = await prisma.$transaction(async (tx) => {
            await tx.role.update({
                where: { id },
                data: { name }
            })

            await tx.rolePermission.deleteMany({
                where: { roleId: id }
            })

            await tx.rolePermission.createMany({
                data: permissionIds.map((pid: string) => ({
                    roleId: id,
                    permissionId: pid
                }))
            })

            return tx.role.findUnique({ where: { id } })
        })

        return NextResponse.json(updatedRole)

    } catch (error) {
        if (error instanceof Response) return error
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission(req, "ROLE_DELETE")

        const { id } = await params
        const role = await prisma.role.findUnique({ where: { id } })

        if (!role) {
            return NextResponse.json({ message: "Role not found" }, { status: 404 })
        }

        if (role.isSystem) {
            return NextResponse.json(
                { message: "System roles cannot be deleted" },
                { status: 403 }
            )
        }

        await prisma.role.delete({ where: { id: role.id } })

        return NextResponse.json({ message: "Role deleted" })
    } catch (error) {
        if (error instanceof Response) return error
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        )
    }
}
