import { requireAuth } from "./auth-guard"
import { getUserPermissions } from "./permission"

export async function requirePermission(
    req: Request,
    permission: string
) {
    const user = requireAuth(req)

    const dbPermissions = await getUserPermissions(user.sub, user.tenantId)
    const userPerms = new Set([
        ...(user.roles || []),
        ...(user.permissions || []),
        ...dbPermissions
    ])

    // Bypass permission check for administrative roles during operation
    const hasAdmin = Array.from(userPerms).some(r =>
        ["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "Admin", "Sales Manager"].includes(r)
    )
    if (hasAdmin) {
        return user
    }

    // Match exact code or converted dot/snake formats (e.g., CAT_INQUIRY_VIEW <-> cat.inquiry.view)
    const altPermission = permission.includes(".")
        ? permission.toUpperCase().replace(/\./g, "_")
        : permission.toLowerCase().replace(/_/g, ".")

    const isAuthorized =
        userPerms.has(permission) ||
        userPerms.has(altPermission) ||
        userPerms.has("*") ||
        userPerms.has("cat.*")

    if (!isAuthorized) {
        throw new Response(
            JSON.stringify({ message: "Forbidden" }),
            { status: 403 }
        )
    }

    return user
}


