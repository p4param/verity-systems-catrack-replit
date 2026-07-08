import { prisma } from "../../prisma";
import { Prisma } from "../../../generated/client";
import { createAuditLog } from "../../audit";
import { DocumentNumberService } from "./document-number-service";
import { VendorLedgerService } from "./vendor-ledger-service";

/**
 * Manages vendor loss/damage liabilities.
 * Auto-created when lossResponsibility == LAUNDRY_VENDOR on MISSING/DAMAGE movements.
 */
export class VendorLiabilityService {
    /**
     * Creates a vendor liability from a loss movement.
     * Called automatically from laundry-service when lossResponsibility === 'LAUNDRY_VENDOR'.
     */
    static async createLiability(input: {
        tenantId: number;
        vendorId: number;
        stockMovementId: number;
        movementTypeCode: string;
        apparelId: number;
        quantity: number;
        createdBy: number;
    }, tx: Prisma.TransactionClient) {
        // Get apparel unit value for cost calculation
        const apparel = await tx.apparel.findUniqueOrThrow({
            where: { id: input.apparelId, tenantId: input.tenantId },
        });

        const unitCost = Number(apparel.unitValue);
        const amount = Math.abs(input.quantity) * unitCost;

        const liability = await tx.vendorLiability.create({
            data: {
                tenantId: input.tenantId,
                vendorId: input.vendorId,
                stockMovementId: input.stockMovementId,
                movementTypeCode: input.movementTypeCode,
                apparelId: input.apparelId,
                quantity: Math.abs(input.quantity),
                unitCost,
                amount,
                status: "OPEN",
            },
        });

        // Create ledger LIABILITY debit entry
        await VendorLedgerService.appendEntry({
            tenantId: input.tenantId,
            vendorId: input.vendorId,
            transactionDate: new Date(),
            transactionType: "LIABILITY",
            referenceType: "LIABILITY",
            referenceId: liability.id,
            debit: amount,
            credit: 0,
            remarks: `Liability created for ${input.movementTypeCode}: ${Math.abs(input.quantity)} × ${unitCost}`,
        }, tx);

        await createAuditLog({
            tenantId: input.tenantId,
            actorUserId: input.createdBy,
            action: "VENDOR_BILLING.LIABILITY_CREATED",
            details: `Created liability for vendor ${input.vendorId}: apparel=${input.apparelId}, qty=${input.quantity}, amount=${amount}`,
        }, tx);

        return liability;
    }

    /**
     * Waives a liability (OPEN → WAIVED). Creates reversing ledger entry.
     */
    static async waiveLiability(tenantId: number, liabilityId: number, remarks: string, userId: number) {
        return await prisma.$transaction(async (tx) => {
            const liability = await tx.vendorLiability.findUniqueOrThrow({
                where: { id: liabilityId, tenantId },
            });

            if (liability.status !== "OPEN" && liability.status !== "PARTIALLY_SETTLED") {
                throw new Error(`Cannot waive liability with status: ${liability.status}`);
            }

            const remainingAmount = Number(liability.amount) - Number(liability.settledAmount);

            const updated = await tx.vendorLiability.update({
                where: { id: liabilityId },
                data: {
                    status: "WAIVED",
                    remarks,
                    settledAmount: liability.amount, // Fully settled via waiver
                },
            });

            // Create reversing ledger entry for remaining amount
            await VendorLedgerService.appendEntry({
                tenantId,
                vendorId: liability.vendorId,
                transactionDate: new Date(),
                transactionType: "ADJUSTMENT",
                referenceType: "LIABILITY",
                referenceId: liability.id,
                debit: 0,
                credit: remainingAmount,
                remarks: `Liability waived: ${remarks}`,
            }, tx);

            await createAuditLog({
                tenantId,
                actorUserId: userId,
                action: "VENDOR_BILLING.LIABILITY_WAIVED",
                details: `Waived liability ${liabilityId}, amount=${remainingAmount}: ${remarks}`,
            }, tx);

            return updated;
        });
    }

    /**
     * Gets a single liability by ID.
     */
    static async getLiability(tenantId: number, liabilityId: number) {
        return await prisma.vendorLiability.findUnique({
            where: { id: liabilityId, tenantId },
            include: {
                vendor: true,
                apparel: true,
                stockMovement: true,
                credits: true,
            },
        });
    }

    /**
     * Lists liabilities with optional filters.
     */
    static async listLiabilities(
        tenantId: number,
        options?: { vendorId?: number; status?: string }
    ) {
        const where: any = { tenantId };
        if (options?.vendorId) where.vendorId = options.vendorId;
        if (options?.status) where.status = options.status;

        return await prisma.vendorLiability.findMany({
            where,
            include: { vendor: true, apparel: true, credits: true },
            orderBy: { createdAt: "desc" },
        });
    }
}
