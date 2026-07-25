import { prisma } from "@/lib/prisma"

export async function getUserPermissions(userId: string, tenantId?: string) {
    const roles = await prisma.userRole.findMany({
        where: {
            userId,
        },
        include: {
            role: {
                include: {
                    rolePermissions: {
                        include: { permission: true }
                    }
                }
            }
        }
    })

    const roleNames = roles.map(r => r.role.name)
    const permissionCodes = roles.flatMap(r => r.role.rolePermissions.map(rp => rp.permission.code))

    return Array.from(new Set([...roleNames, ...permissionCodes]))
}

