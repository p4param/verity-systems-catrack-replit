import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";

export class AvailabilityEngine {
    /**
     * Calculates the current inventory balance components for a specific apparel.
     * All values are derived dynamically from the ledger (StockMovement) and current reservations.
     */
    static async getBalances(tenantId: string, apparelId: number, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;

        // 1. Condition-aware Physical Stock
        const conditionGroups = await db.stockMovement.groupBy({
            by: ['condition'],
            where: {
                tenantId,
                apparelId,
                movementType: { notIn: ['MISSING', 'DAMAGE'] }
            },
            _sum: { quantityChange: true },
        });

        const cleanPhysical = conditionGroups.find(g => g.condition === 'CLEAN')?._sum.quantityChange || 0;
        const dirtyPhysical = conditionGroups.find(g => g.condition === 'DIRTY')?._sum.quantityChange || 0;

        // 2. Reserved & Allotted
        const reservations = await db.eventReservation.groupBy({
            by: ['status'],
            where: { tenantId, apparelId, status: { in: ['ACTIVE', 'ALLOTTED'] } },
            _sum: { reservedQty: true },
        });
        const reserved = reservations.find(r => r.status === "ACTIVE")?._sum.reservedQty || 0;
        const allotted = reservations.find(r => r.status === "ALLOTTED")?._sum.reservedQty || 0;

        // 3. In Laundry = Total items sent to laundry that haven't physically returned
        const laundryAggregate = await db.laundryOrderItem.aggregate({
            where: { apparel: { tenantId }, apparelId },
            _sum: { qtyDispatched: true, qtyReturned: true, qtyDamaged: true, qtyMissing: true }
        });
        const inLaundry = (laundryAggregate._sum.qtyDispatched || 0) -
            (laundryAggregate._sum.qtyReturned || 0) -
            (laundryAggregate._sum.qtyDamaged || 0) -
            (laundryAggregate._sum.qtyMissing || 0);

        const available = Math.max(0, cleanPhysical - reserved);

        return {
            totalStock: cleanPhysical + dirtyPhysical + allotted + inLaundry,
            physicalStock: cleanPhysical + dirtyPhysical,
            cleanStock: cleanPhysical,
            dirtyStock: dirtyPhysical,
            reserved,
            allotted,
            inLaundry,
            available
        };
    }

    static async getBulkBalances(tenantId: string, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;

        // 1. Physical Stock per apparel and condition
        const stockGroups = await db.stockMovement.groupBy({
            by: ['apparelId', 'condition'],
            where: {
                tenantId,
                movementType: { notIn: ['MISSING', 'DAMAGE'] }
            },
            _sum: { quantityChange: true }
        });

        // 2. Reserved & Allotted per apparel
        const reservationGroups = await db.eventReservation.groupBy({
            by: ['apparelId', 'status'],
            where: { tenantId, status: { in: ['ACTIVE', 'ALLOTTED'] } },
            _sum: { reservedQty: true }
        });

        // 3. In Laundry per apparel — use groupBy to avoid loading all rows into memory
        const laundryGroups = await db.laundryOrderItem.groupBy({
            by: ["apparelId"],
            where: { laundryOrder: { tenantId } },
            _sum: {
                qtyDispatched: true,
                qtyReturned: true,
                qtyDamaged: true,
                qtyMissing: true,
            },
        });

        const laundryMap: Record<number, number> = {};
        for (const g of laundryGroups) {
            laundryMap[g.apparelId] = Math.max(
                0,
                (g._sum.qtyDispatched ?? 0) -
                (g._sum.qtyReturned ?? 0) -
                (g._sum.qtyDamaged ?? 0) -
                (g._sum.qtyMissing ?? 0)
            );
        }

        // 4. Map everything together
        const results: Record<number, {
            totalStock: number;
            physicalStock: number;
            cleanStock: number;
            dirtyStock: number;
            reserved: number;
            allotted: number;
            inLaundry: number;
            available: number
        }> = {};

        // Process Physical Stock (Clean/Dirty)
        for (const g of stockGroups) {
            if (!results[g.apparelId]) {
                results[g.apparelId] = { totalStock: 0, physicalStock: 0, cleanStock: 0, dirtyStock: 0, reserved: 0, allotted: 0, inLaundry: 0, available: 0 };
            }
            const qty = g._sum.quantityChange || 0;
            if (g.condition === 'CLEAN') results[g.apparelId].cleanStock = qty;
            if (g.condition === 'DIRTY') results[g.apparelId].dirtyStock = qty;
            results[g.apparelId].physicalStock += qty;
        }

        // Process Reservations
        for (const g of reservationGroups) {
            if (!results[g.apparelId]) {
                results[g.apparelId] = { totalStock: 0, physicalStock: 0, cleanStock: 0, dirtyStock: 0, reserved: 0, allotted: 0, inLaundry: 0, available: 0 };
            }
            if (g.status === 'ACTIVE') results[g.apparelId].reserved = g._sum.reservedQty || 0;
            if (g.status === 'ALLOTTED') results[g.apparelId].allotted = g._sum.reservedQty || 0;
        }

        // Process Laundry
        for (const apparelId in laundryMap) {
            const aid = parseInt(apparelId);
            if (!results[aid]) {
                results[aid] = { totalStock: 0, physicalStock: 0, cleanStock: 0, dirtyStock: 0, reserved: 0, allotted: 0, inLaundry: 0, available: 0 };
            }
            results[aid].inLaundry = laundryMap[aid];
        }

        // Finalize Availablity: CleanPhysical - Reserved, and calculate totalStock
        for (const aid in results) {
            const res = results[aid as any];
            res.available = Math.max(0, res.cleanStock - res.reserved);
            res.totalStock = res.cleanStock + res.dirtyStock + res.allotted + res.inLaundry;
        }

        return results;
    }
}

