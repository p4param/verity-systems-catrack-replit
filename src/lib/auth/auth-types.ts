/**
 * AuthUser — raw JWT payload shape.
 *
 * VS05Z: All identifiers are now UUID strings.
 * No integer IDs remain in the auth layer.
 */
export type AuthUser = {
    sub: string        // userId UUID
    tenantId: string   // Tenant UUID
    email: string
    roles: string[]
    permissions?: string[]
    mfaEnabled: boolean
    sid?: string       // session UUID (RefreshToken.id)
}

/**
 * Platform-level CurrentUser abstraction.
 * Wraps the raw JWT payload (AuthUser) into a more usable model.
 *
 * VS05Z: id, tenantId, sid are all UUID strings.
 */
export class CurrentUser {
    id: string
    tenantId: string
    email: string
    roles: string[]
    permissions: string[]
    mfaEnabled: boolean
    sid?: string

    constructor(authUser: AuthUser) {
        this.id = authUser.sub
        this.tenantId = authUser.tenantId
        this.email = authUser.email
        this.roles = authUser.roles
        this.permissions = authUser.permissions || []
        this.mfaEnabled = authUser.mfaEnabled
        this.sid = authUser.sid
    }

    /** Alias for JWT 'sub' standard */
    get sub(): string {
        return this.id
    }

    hasRole(role: string): boolean {
        return this.roles.includes(role) || this.roles.includes("SUPER_ADMIN")
    }

    hasPermission(permission: string): boolean {
        return this.permissions.includes(permission) || this.roles.includes("SUPER_ADMIN")
    }
}
