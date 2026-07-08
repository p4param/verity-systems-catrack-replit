import { prisma } from "../prisma";
import { MovementService } from "./movement-service";
import { SnapshotInvalidator } from "./dashboard/snapshot-invalidator";

export interface RecoveryInput {
    tenantId: number;
    movementId: number; // The original MISSING or DAMAGE movement
    quantity: number;
    condition: 'CLEAN' | 'DIRTY';
    reason: string;
    userId: number;
}

export class RecoveryService {
    /**
     * Records a stock recovery against a previously recorded loss (MISSING/DAMAGE).
     * Enforces that total recovery cannot exceed original loss.
     */
    static async recordRecovery(input: RecoveryInput) {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch original movement
            const original = await tx.stockMovement.findUniqueOrThrow({
                where: { id: input.movementId, tenantId: input.tenantId },
                include: { recoveries: true }
            });

            if (!['MISSING', 'DAMAGE', 'PURCHASE_DAMAGE_ON_ARRIVAL'].includes(original.movementType)) {
                throw new Error("Recovery can only be recorded against MISSING, DAMAGE, or PURCHASE_DAMAGE_ON_ARRIVAL movements.");
            }

            // 2. Calculate already recovered quantity
            const alreadyRecovered = original.recoveries.reduce((sum, r) => sum + r.quantityChange, 0);
            const originalLoss = Math.abs(original.quantityChange);

            if (alreadyRecovered + input.quantity > originalLoss) {
                throw new Error(`Recovery quantity (${input.quantity}) exceeds remaining unrecovered amount (${originalLoss - alreadyRecovered}).`);
            }

            // 3. Create RECOVERY movement
            const movement = await MovementService.createMovement({
                tenantId: input.tenantId,
                apparelId: original.apparelId,
                movementType: 'RECOVERY',
                quantityChange: Math.abs(input.quantity),
                condition: input.condition,
                recoveryOfMovementId: input.movementId,
                referenceType: original.referenceType as any,
                referenceId: original.referenceId || undefined,
                reason: input.reason,
                createdBy: input.userId
            }, tx);

            // Auto-create vendor liability credit if original movement had vendor liability
            const { VendorRecoveryCreditService } = await import("./vendor-billing/vendor-recovery-credit-service");
            await VendorRecoveryCreditService.createRecoveryCredit({
                tenantId: input.tenantId,
                recoveryMovementId: movement.id,
                originalMovementId: input.movementId,
                quantity: input.quantity,
                createdBy: input.userId,
            }, tx);

            // Invalidate today's dashboard snapshot so recovery rate updates immediately
            await SnapshotInvalidator.invalidateToday(input.tenantId, tx);

            return movement;
        });
    }

    /**
     * Gets accounting for a specific scope (Apparel, Event, or Laundry Order).
     */
    static async getNetLossReport(tenantId: number, options: {
        apparelId?: number,
        referenceType?: 'EVENT' | 'LAUNDRY',
        referenceId?: number
    } = {}) {
        const where: any = { tenantId };
        if (options.apparelId) where.apparelId = options.apparelId;
        if (options.referenceType) where.referenceType = options.referenceType;
        if (options.referenceId) where.referenceId = options.referenceId;

        const movements = await prisma.stockMovement.findMany({
            where: {
                ...where,
                movementType: { in: ['MISSING', 'DAMAGE', 'RECOVERY', 'PURCHASE_DAMAGE_ON_ARRIVAL'] }
            }
        });

        const grossLoss = movements
            .filter(m => ['MISSING', 'DAMAGE', 'PURCHASE_DAMAGE_ON_ARRIVAL'].includes(m.movementType))
            .reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

        const totalRecovered = movements
            .filter(m => m.movementType === 'RECOVERY')
            .reduce((sum, m) => sum + m.quantityChange, 0);

        return {
            grossLoss,
            totalRecovered,
            netLoss: grossLoss - totalRecovered,
            recoveryRate: grossLoss > 0 ? (totalRecovered / grossLoss) * 100 : 0
        };
    }
}
