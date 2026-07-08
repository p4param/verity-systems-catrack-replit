import { PrismaClient } from "../generated/client";
import { createTenantMiddleware } from "./db/tenant-middleware";

const globalForPrisma = global as unknown as { prisma: any };

// Force re-initialization if the existing client is stale (missing new models)
if (globalForPrisma.prisma && !globalForPrisma.prisma.apparel) {
    console.warn("⚠️ Stale Prisma Client detected (missing apparel model). Forcing re-initialization...");
    globalForPrisma.prisma = undefined;
}

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ["query"],
    });

// Register tenant enforcement middleware
// Configuration is read from environment variables (see .env.example)
// Default: DISABLED (safe for production)
// To enable logging: Set TENANT_ENFORCEMENT_ENABLED=true and TENANT_ENFORCEMENT_MODE=log_only
// See: docs/tenant_enforcement_rollout.md for activation plan
prisma.$use(createTenantMiddleware());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
