import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";

export type MovementType =
    | 'INITIAL_STOCK'
    | 'PURCHASE_RECEIVE'
    | 'PURCHASE_DAMAGE_ON_ARRIVAL'
    | 'PURCHASE_RETURN'
    | 'LAUNDRY_RETURN_RECEIVED'
    | 'MANUAL_ADJUST_POSITIVE'
    | 'LAUNDRY_DISPATCH'
    | 'DAMAGE'
    | 'MISSING'
    | 'MANUAL_ADJUST_NEGATIVE'
    | 'EVENT_ALLOTMENT'
    | 'EVENT_RETURN'
    | 'RECOVERY';


export interface CreateMovementInput {
    tenantId: number;
    apparelId: number;
    movementType: MovementType;
    quantityChange: number;
    condition?: 'CLEAN' | 'DIRTY'; // Step 13 dimension
    referenceType?: 'EVENT' | 'LAUNDRY' | 'MANUAL' | 'PURCHASE';
    referenceId?: number;
    recoveryOfMovementId?: number; // Step 14
    lossResponsibility?: string; // PART 6
    reason?: string;
    createdBy: number;
}

export class MovementService {
    /**
     * Records a new physical stock movement in the ledger.
     * Enforces validation rules defined in the Step 13 Runbook.
     */
    static async createMovement(input: CreateMovementInput, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;

        // 1. Validation: quantityChange must never be zero
        if (input.quantityChange === 0) {
            throw new Error("Movement quantity change cannot be zero.");
        }

        // 2. Validation: quantityChange sign must match movement type
        const isInbound = ['INITIAL_STOCK', 'PURCHASE_RECEIVE', 'LAUNDRY_RETURN_RECEIVED', 'MANUAL_ADJUST_POSITIVE', 'EVENT_RETURN', 'RECOVERY'].includes(input.movementType);
        const isOutbound = ['LAUNDRY_DISPATCH', 'DAMAGE', 'MISSING', 'MANUAL_ADJUST_NEGATIVE', 'EVENT_ALLOTMENT', 'PURCHASE_DAMAGE_ON_ARRIVAL', 'PURCHASE_RETURN'].includes(input.movementType);

        if (isInbound && input.quantityChange < 0) {
            throw new Error(`Inbound movement type ${input.movementType} requires a positive quantity.`);
        }
        if (isOutbound && input.quantityChange > 0) {
            throw new Error(`Outbound movement type ${input.movementType} requires a negative quantity.`);
        }

        // 3. Validation: Manual adjustments require a reason
        if (['MANUAL_ADJUST_POSITIVE', 'MANUAL_ADJUST_NEGATIVE'].includes(input.movementType) && !input.reason) {
            throw new Error("Manual adjustments require a mandatory reason field.");
        }

        // 4. Append-only insert
        return await db.stockMovement.create({
            data: {
                tenantId: input.tenantId,
                apparelId: input.apparelId,
                movementType: input.movementType,
                quantityChange: input.quantityChange,
                condition: input.condition || 'CLEAN',
                referenceType: input.referenceType,
                referenceId: input.referenceId,
                recoveryOfMovementId: input.recoveryOfMovementId,
                lossResponsibility: input.lossResponsibility,
                reason: input.reason,
                createdBy: input.createdBy
            }
        });
    }
}
