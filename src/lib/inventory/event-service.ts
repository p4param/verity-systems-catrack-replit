import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";
import { MovementService } from "./movement-service";
import { AvailabilityEngine } from "./availability-engine";
import { SnapshotInvalidator } from "./dashboard/snapshot-invalidator";

export interface EventAllotmentItem {
    apparelId: number;
    quantity: number;
}

export interface EventReconciliationItem {
    apparelId: number;
    returnedQty: number;
    damagedQty: number;
    lostQty: number;
    allottedQty: number; // For validation
}

export class EventService {
    /**
     * Stage 2: Event Allotment
     * Physically removes CLEAN items from the warehouse for an event.
     */
    static async allotItems(tenantId: string, eventId: number, items: EventAllotmentItem[], userId: string) {
        return await prisma.$transaction(async (tx) => {
            // Fetch tenant settings
            const settings = await tx.inventorySettings.findUnique({
                where: { tenantId }
            });
            const allowNegative = settings?.allowNegativeStock ?? false;

            for (const item of items) {
                const qty = Math.abs(item.quantity);

                if (!allowNegative) {
                    const balances = await AvailabilityEngine.getBalances(tenantId, item.apparelId, tx);
                    if (qty > balances.available) {
                        throw new Error(`Insufficient stock for allotment of apparel ID ${item.apparelId}. Available: ${balances.available}, Requested: ${qty}`);
                    }
                }

                await MovementService.createMovement({
                    tenantId,
                    apparelId: item.apparelId,
                    movementType: 'EVENT_ALLOTMENT',
                    quantityChange: -qty,
                    condition: 'CLEAN',
                    referenceType: 'EVENT',
                    referenceId: eventId,
                    createdBy: userId
                }, tx);
            }

            // Update event status
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'ALLOTTED' }
            });

            // Update associated reservations to ALLOTTED
            // This marks the transition from Stage 1 (Logical) to Stage 2 (Physical Allotment)
            const result = await tx.eventReservation.updateMany({
                where: { eventId },
                data: { status: 'ALLOTTED' }
            });

            // Invalidate today's dashboard snapshot so reserved/available counts update immediately
            await SnapshotInvalidator.invalidateToday(tenantId, tx);

            return result;
        });
    }

    /**
     * Stage 3 & 4: Event Completion & Reconciliation
     * Processes returned items as DIRTY and records loss/damage.
     */
    static async reconcileEvent(tenantId: string, eventId: number, results: EventReconciliationItem[], userId: string) {
        return await prisma.$transaction(async (tx) => {
            for (const res of results) {
                // Validation: Returned + Lost + Damaged = Allotted Qty
                if ((res.returnedQty + res.damagedQty + res.lostQty) !== res.allottedQty) {
                    throw new Error(`Reconciliation mismatch for apparel ${res.apparelId}. Total must equal allotted quantity (${res.allottedQty}).`);
                }

                // 1. Record Return (DIRTY)
                if (res.returnedQty > 0) {
                    await MovementService.createMovement({
                        tenantId,
                        apparelId: res.apparelId,
                        movementType: 'EVENT_RETURN',
                        quantityChange: res.returnedQty,
                        condition: 'DIRTY',
                        referenceType: 'EVENT',
                        referenceId: eventId,
                        createdBy: userId
                    }, tx);
                }

                // 2. Record Damage (Audit entry)
                if (res.damagedQty > 0) {
                    await MovementService.createMovement({
                        tenantId,
                        apparelId: res.apparelId,
                        movementType: 'DAMAGE',
                        quantityChange: -res.damagedQty, // Negative for loss reporting
                        condition: 'CLEAN',
                        referenceType: 'EVENT',
                        referenceId: eventId,
                        createdBy: userId
                    }, tx);
                }

                // 3. Record Missing (Audit entry)
                if (res.lostQty > 0) {
                    await MovementService.createMovement({
                        tenantId,
                        apparelId: res.apparelId,
                        movementType: 'MISSING',
                        quantityChange: -res.lostQty, // Negative for loss reporting
                        condition: 'CLEAN',
                        referenceType: 'EVENT',
                        referenceId: eventId,
                        createdBy: userId
                    }, tx);
                }
            }

            // Update event status
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'CLOSED' }
            });

            // Update associated reservations
            await tx.eventReservation.updateMany({
                where: { eventId },
                data: { status: 'COMPLETED' }
            });

            // Invalidate today's dashboard snapshot so loss/dirty stock updates immediately
            await SnapshotInvalidator.invalidateToday(tenantId, tx);

            return { success: true };
        });
    }
}

