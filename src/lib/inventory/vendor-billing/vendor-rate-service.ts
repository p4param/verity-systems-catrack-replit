import { prisma } from "../../prisma";
import { Prisma } from "../../../generated/client";
import { createAuditLog } from "../../audit";

/**
 * Manages vendor-specific washing rate contracts per apparel.
 * Supports multiple rate revisions with historical preservation.
 */
export class VendorRateService {
    /**
     * Creates a new rate contract. Validates no overlapping active rate exists.
     */
    static async createRate(input: {
        tenantId: string;
        vendorId: number;
        apparelId: number;
        washingRate: number;
        ironingRate?: number;
        dryCleaningRate?: number;
        effectiveFrom: Date;
        effectiveTo?: Date;
        createdBy: string;
    }) {
        return await prisma.$transaction(async (tx) => {
            // Validate no overlapping active rate
            const overlap = await tx.laundryVendorRate.findFirst({
                where: {
                    tenantId: input.tenantId,
                    vendorId: input.vendorId,
                    apparelId: input.apparelId,
                    isActive: true,
                    deletedAt: null,
                    OR: [
                        // Open-ended rates overlap if they start before our end
                        {
                            effectiveTo: null,
                            effectiveFrom: { lte: input.effectiveTo ?? new Date("9999-12-31") },
                        },
                        // Bounded rates overlap if they span our range
                        {
                            effectiveTo: { gte: input.effectiveFrom },
                            effectiveFrom: { lte: input.effectiveTo ?? new Date("9999-12-31") },
                        },
                    ],
                },
            });

            if (overlap) {
                throw new Error(
                    `An active rate already exists for this vendor/apparel combination in the specified period (Rate ID: ${overlap.id}).`
                );
            }

            const rate = await tx.laundryVendorRate.create({
                data: {
                    tenantId: input.tenantId,
                    vendorId: input.vendorId,
                    apparelId: input.apparelId,
                    washingRate: input.washingRate,
                    ironingRate: input.ironingRate,
                    dryCleaningRate: input.dryCleaningRate,
                    effectiveFrom: input.effectiveFrom,
                    effectiveTo: input.effectiveTo,
                },
            });

            await createAuditLog({
                tenantId: input.tenantId,
                actorUserId: input.createdBy,
                action: "VENDOR_BILLING.RATE_CREATED",
                details: `Created rate for vendor ${input.vendorId}, apparel ${input.apparelId}: washing=${input.washingRate}`,
            }, tx);

            return rate;
        });
    }

    /**
     * Gets the effective rate for a vendor/apparel combination on a specific date.
     */
    static async getActiveRate(
        tenantId: string,
        vendorId: number,
        apparelId: number,
        date: Date,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx || prisma;

        return await db.laundryVendorRate.findFirst({
            where: {
                tenantId,
                vendorId,
                apparelId,
                isActive: true,
                deletedAt: null,
                effectiveFrom: { lte: date },
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: date } },
                ],
            },
            orderBy: { effectiveFrom: "desc" },
        });
    }

    /**
     * Lists rates with optional filters.
     */
    static async listRates(
        tenantId: string,
        options?: { vendorId?: number; apparelId?: number; activeOnly?: boolean }
    ) {
        const where: any = { tenantId, deletedAt: null };
        if (options?.vendorId) where.vendorId = options.vendorId;
        if (options?.apparelId) where.apparelId = options.apparelId;
        if (options?.activeOnly) where.isActive = true;

        return await prisma.laundryVendorRate.findMany({
            where,
            include: { vendor: true, apparel: true },
            orderBy: { effectiveFrom: "desc" },
        });
    }

    /**
     * Deactivates a rate (soft delete via isActive flag).
     */
    static async deactivateRate(tenantId: string, rateId: number, userId: string) {
        return await prisma.$transaction(async (tx) => {
            const rate = await tx.laundryVendorRate.findUniqueOrThrow({
                where: { id: rateId, tenantId },
            });

            const updated = await tx.laundryVendorRate.update({
                where: { id: rateId },
                data: { isActive: false, deletedAt: new Date() },
            });

            await createAuditLog({
                tenantId,
                actorUserId: userId,
                action: "VENDOR_BILLING.RATE_DEACTIVATED",
                details: `Deactivated rate ${rateId} for vendor ${rate.vendorId}`,
            }, tx);

            return updated;
        });
    }

    /**
     * Gets a single rate by ID.
     */
    static async getRate(tenantId: string, rateId: number) {
        return await prisma.laundryVendorRate.findUnique({
            where: { id: rateId, tenantId },
            include: { vendor: true, apparel: true },
        });
    }
}

