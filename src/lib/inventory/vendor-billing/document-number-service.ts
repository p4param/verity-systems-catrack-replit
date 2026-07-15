import { prisma } from "../../prisma";
import { Prisma } from "../../../generated/client";

/**
 * Generates formatted document numbers (LVI-000001, LVP-000001, etc.)
 * Uses atomic currentSequence increment within a transaction.
 */
export class DocumentNumberService {
    /**
     * Gets the next document number for a given entity type within a tenant.
     * Must be called inside a Prisma transaction to ensure atomicity.
     */
    static async getNextNumber(
        tenantId: string,
        entityType: string,
        tx: Prisma.TransactionClient
    ): Promise<string> {
        const doc = await tx.documentNumbering.findUnique({
            where: { tenantId_entityType: { tenantId, entityType } },
        });

        if (!doc) {
            throw new Error(`Document numbering not configured for entity type: ${entityType}`);
        }

        // Check yearly reset
        const currentYear = new Date().getFullYear();
        let nextSequence = doc.currentSequence + 1;

        if (doc.resetYearly && doc.lastResetYear !== currentYear) {
            nextSequence = 1;
            await tx.documentNumbering.update({
                where: { id: doc.id },
                data: {
                    currentSequence: 1,
                    lastResetYear: currentYear,
                },
            });
        } else {
            await tx.documentNumbering.update({
                where: { id: doc.id },
                data: { currentSequence: nextSequence },
            });
        }

        // Format: PREFIX-000001
        const paddedSequence = String(nextSequence).padStart(6, "0");
        return `${doc.prefix}-${paddedSequence}`;
    }
}

