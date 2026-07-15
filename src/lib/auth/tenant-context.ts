/**
 * Tenant Context Helper
 *
 * Provides utilities for extracting and validating tenant context from requests.
 *
 * VS05Z: tenantId and userId are now UUID strings. All numeric coercions removed.
 */

import { requireAuth } from './auth-guard'
import { type CurrentUser } from './auth-types'

/**
 * Tenant context extracted from an authenticated request.
 * VS05Z: Both identifiers are UUID strings.
 */
export interface TenantContext {
    tenantId: string
    userId: string
    user: CurrentUser
}

/**
 * Extract and validate tenant context from request.
 *
 * @param req - The HTTP request
 * @returns Validated tenant context with UUID identifiers
 * @throws Response if tenant context is missing or invalid
 */
export function requireTenantContext(req: Request): TenantContext {
    const user = requireAuth(req)

    if (!user.tenantId) {
        throw new Response(
            JSON.stringify({
                message: 'Invalid tenant context',
                code: 'TENANT_CONTEXT_MISSING',
                details: 'User JWT is missing valid tenantId'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return {
        tenantId: user.tenantId,
        userId: user.sub,
        user
    }
}

/**
 * Validate that a tenantId UUID is present (for background jobs).
 *
 * @param tenantId - UUID string of the tenant
 * @param jobName - Name of the background job (for error messages)
 */
export function validateTenantId(tenantId: string, jobName: string): void {
    if (!tenantId) {
        throw new Error(
            `BACKGROUND_JOB_MISSING_TENANT: ${jobName} requires explicit tenantId parameter`
        )
    }
}

/**
 * Validate that a user belongs to a specific tenant.
 *
 * @param userId - UUID of the user
 * @param tenantId - UUID of the expected tenant
 * @param prisma - Prisma client instance
 */
export async function validateUserBelongsToTenant(
    userId: string,
    tenantId: string,
    prisma: any
): Promise<void> {
    const user = await prisma.user.findFirst({
        where: { id: userId, tenantId }
    })

    if (!user) {
        throw new Error(
            `USER_TENANT_MISMATCH: User ${userId} does not belong to tenant ${tenantId}`
        )
    }
}
