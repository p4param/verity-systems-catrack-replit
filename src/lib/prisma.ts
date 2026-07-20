import { PrismaClient } from "../generated/client";
import { createTenantMiddleware } from "./db/tenant-middleware";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Force re-initialization if the existing client is stale (missing new models).
// Update this check whenever a new model is added to the Prisma schema.
// The check should reference the MOST RECENTLY ADDED model so hot-reload
// always picks up the updated generated client.
// VS08A EWP-005: Updated to check for workspaceInstallation (most recent model).
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).workspaceInstallation) {
    console.warn("⚠️ Stale Prisma Client detected (missing workspaceInstallation model). Forcing re-initialization...");




    (globalForPrisma.prisma as any) = undefined;
}

function createPrismaClient(): PrismaClient {
    const client = new PrismaClient({
        log: ["query"],
    });
    // Register tenant enforcement middleware only on fresh instances.
    // Calling $use on the cached global would stack middleware on every hot-reload.
    // Configuration is read from environment variables (see .env.example)
    // Default: DISABLED (safe for production)
    client.$use(createTenantMiddleware());
    return client;
}

export const prisma: PrismaClient =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

