import { Prisma } from "../../../generated/client";
import { createAuditLog } from "../../audit";
import { VendorLedgerService } from "./vendor-ledger-service";

/**
 * Manages recovery credits against vendor liabilities.
 * Auto-triggered when a RECOVERY movement matches a liability.
 */
export class VendorRecoveryCreditService {
    /**
     * Creates a recovery credit when a lost item is found and the original
     * movement had lossResponsibility === 'LAUNDRY_VENDOR'.
     * Must be called within a transaction.
     */
    static async createRecoveryCredit(input: {
        tenantId: string;
        recoveryMovementId: number;
        originalMovementId: number;
        quantity: number;
        createdBy: string;
    }, tx: Prisma.TransactionClient) {
        // 1. Find the liability linked to the original movement
        const liability = await tx.vendorLiability.findUnique({
            where: { stockMovementId: input.originalMovementId },
            include: { credits: true },
        });

        if (!liability) {
            // No liability exists for this movement (not vendor responsibility)
            return null;
        }

        // 2. Validate recovery quantity doesn't exceed remaining liability
        const alreadyCredited = liability.credits.reduce(
            (sum, c) => sum + Number(c.quantity), 0
        );
        const maxRecoverable = Number(liability.quantity) - alreadyCredited;

        const creditQty = Math.min(Math.abs(input.quantity), maxRecoverable);
        if (creditQty <= 0) {
            return null; // Liability fully credited already
        }

        const unitCost = Number(liability.unitCost);
        const creditAmount = creditQty * unitCost;

        // 3. Create the credit
        const credit = await tx.vendorLiabilityCredit.create({
            data: {
                tenantId: input.tenantId,
                vendorLiabilityId: liability.id,
                recoveryMovementId: input.recoveryMovementId,
                quantity: creditQty,
                unitCost,
                amount: creditAmount,
            },
        });

        // 4. Update liability settled amount and status
        const newSettled = Number(liability.settledAmount) + creditAmount;
        const liabilityAmount = Number(liability.amount);
        let newStatus = liability.status;

        if (newSettled >= liabilityAmount) {
            newStatus = "CREDITED";
        } else if (newSettled > 0) {
            newStatus = "PARTIALLY_SETTLED";
        }

        await tx.vendorLiability.update({
            where: { id: liability.id },
            data: {
                settledAmount: newSettled,
                status: newStatus,
            },
        });

        // 5. Create ledger CREDIT entry (reduces vendor's debit balance)
        await VendorLedgerService.appendEntry({
            tenantId: input.tenantId,
            vendorId: liability.vendorId,
            transactionDate: new Date(),
            transactionType: "RECOVERY_CREDIT",
            referenceType: "CREDIT",
            referenceId: credit.id,
            debit: 0,
            credit: creditAmount,
            remarks: `Recovery credit: ${creditQty} × ${unitCost} against liability #${liability.id}`,
        }, tx);

        await createAuditLog({
            tenantId: input.tenantId,
            actorUserId: input.createdBy,
            action: "VENDOR_BILLING.RECOVERY_CREDIT_CREATED",
            details: `Recovery credit for liability ${liability.id}: qty=${creditQty}, amount=${creditAmount}`,
        }, tx);

        return credit;
    }

    /**
     * Lists all recovery credits, optionally filtered by vendor.
     */
    static async listCredits(
        tenantId: string,
        options?: { vendorId?: number }
    ) {
        const { prisma } = await import("../../prisma");

        const where: any = { tenantId };
        if (options?.vendorId) {
            where.liability = { vendorId: options.vendorId };
        }

        return await prisma.vendorLiabilityCredit.findMany({
            where,
            include: {
                liability: {
                    include: { vendor: true, apparel: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
}

