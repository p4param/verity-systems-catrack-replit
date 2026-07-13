export type AuthUser = {
    sub: number        // userId
    tenantId: number
    email: string
    roles: string[]
    permissions?: string[]
    mfaEnabled: boolean
    sid?: number
}

/**
 * Platform-level CurrentUser abstraction.
 * Wraps the raw JWT payload (AuthUser) into a more usable model
 * where `id` maps directly to `sub` to avoid type casting across the platform.
 */
export class CurrentUser {
    id: number;
    tenantId: number;
    email: string;
    roles: string[];
    permissions: string[];
    mfaEnabled: boolean;
    sid?: number;

    constructor(authUser: AuthUser) {
        this.id = authUser.sub;
        this.tenantId = authUser.tenantId;
        this.email = authUser.email;
        this.roles = authUser.roles;
        this.permissions = authUser.permissions || [];
        this.mfaEnabled = authUser.mfaEnabled;
        this.sid = authUser.sid;
    }

    // Alias for JWT 'sub' standard
    get sub(): number {
        return this.id;
    }

    // Easy helpers for roles/permissions
    hasRole(role: string): boolean {
        return this.roles.includes(role) || this.roles.includes("SUPER_ADMIN");
    }

    hasPermission(permission: string): boolean {
        return this.permissions.includes(permission) || this.roles.includes("SUPER_ADMIN");
    }
}
