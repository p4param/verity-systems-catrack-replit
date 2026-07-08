import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";
import { AvailabilityEngine } from "./availability-engine";
import { MovementService } from "./movement-service";
import { SnapshotInvalidator } from "./dashboard/snapshot-invalidator";

export interface LaundryDispatchInput {
    tenantId: number;
    vendorId: number;
    items: {
        apparelId: number;
        quantity: number;
    }[];
    expectedReturnDate?: Date;
    createdBy: number;
}

export interface LaundryReturnInput {
    tenantId: number;
    orderId: number;
    items: {
        apparelId: number;
        qtyReturned: number;
        qtyDamaged: number;
        qtyMissing: number;
        lossResponsibility?: string;
    }[];
    createdBy: number;
}

export class LaundryService {
    /**
     * Dispatches items to laundry.
     * Inserts LAUNDRY_DISPATCH movements and creates a LaundryOrder.
     */
    static async dispatch(input: LaundryDispatchInput) {
        return await prisma.$transaction(async (tx) => {
            // 1. Create the Laundry Order
            const order = await tx.laundryOrder.create({
                data: {
                    tenantId: input.tenantId,
                    vendorId: input.vendorId,
                    expectedReturnDate: input.expectedReturnDate,
                    status: "DISPATCHED",
                    createdBy: input.createdBy
                }
            });

            // 2. Process each item
            for (const item of input.items) {
                // a. Recalculate Dirty Stock inside transaction
                const balances = await AvailabilityEngine.getBalances(input.tenantId, item.apparelId, tx);

                // b. Validate against dirty stock only
                if (item.quantity > balances.dirtyStock) {
                    throw new Error(`Insufficient dirty stock for apparel ID ${item.apparelId}. Requested: ${item.quantity}, Dirty: ${balances.dirtyStock}`);
                }

                // c. Insert LAUNDRY_DISPATCH movement (-Qty, condition=DIRTY)
                await MovementService.createMovement({
                    tenantId: input.tenantId,
                    apparelId: item.apparelId,
                    movementType: 'LAUNDRY_DISPATCH',
                    quantityChange: -item.quantity,
                    condition: 'DIRTY',
                    referenceType: 'LAUNDRY',
                    referenceId: order.id,
                    createdBy: input.createdBy
                }, tx);

                // d. Create Detail Item row for operational tracking
                await tx.laundryOrderItem.create({
                    data: {
                        laundryOrderId: order.id,
                        apparelId: item.apparelId,
                        qtyDispatched: item.quantity,
                        qtyReturned: 0,
                        qtyDamaged: 0,
                        qtyMissing: 0
                    }
                });
            }

            // Invalidate today's dashboard snapshot so in-laundry counts update immediately
            await SnapshotInvalidator.invalidateToday(input.tenantId, tx);

            return order;
        });
    }

    /**
     * Processes returns from laundry.
     * Inserts LAUNDRY_RETURN_RECEIVED (CLEAN), DAMAGE, and MISSING movements.
     */
    static async processReturn(input: LaundryReturnInput) {
        return await prisma.$transaction(async (tx) => {
            const order = await tx.laundryOrder.findUniqueOrThrow({
                where: { id: input.orderId },
                include: { items: true }
            });

            if (order.status === 'CLOSED') {
                throw new Error("Cannot process return for a closed laundry order.");
            }

            const { VendorLiabilityService } = await import("./vendor-billing/vendor-liability-service");

            for (const returnItem of input.items) {
                const orderItem = order.items.find(i => i.apparelId === returnItem.apparelId);
                if (!orderItem) continue;

                // Default loss responsibility to LAUNDRY_VENDOR for laundry returns if not provided
                const resp = returnItem.lossResponsibility || 'LAUNDRY_VENDOR';

                // 1. Increment returned/damaged/missing in detail table
                await tx.laundryOrderItem.update({
                    where: { id: orderItem.id },
                    data: {
                        qtyReturned: { increment: returnItem.qtyReturned },
                        qtyDamaged: { increment: returnItem.qtyDamaged },
                        qtyMissing: { increment: returnItem.qtyMissing }
                    }
                });

                // 2. Insert Inbound Movement (CLEAN)
                if (returnItem.qtyReturned > 0) {
                    await MovementService.createMovement({
                        tenantId: input.tenantId,
                        apparelId: returnItem.apparelId,
                        movementType: 'LAUNDRY_RETURN_RECEIVED',
                        quantityChange: returnItem.qtyReturned,
                        condition: 'CLEAN',
                        referenceType: 'LAUNDRY',
                        referenceId: order.id,
                        createdBy: input.createdBy
                    }, tx);
                }

                // 3. Insert Outbound Movements for loss/damage
                if (returnItem.qtyDamaged > 0) {
                    const damageMvt = await MovementService.createMovement({
                        tenantId: input.tenantId,
                        apparelId: returnItem.apparelId,
                        movementType: 'DAMAGE',
                        quantityChange: -returnItem.qtyDamaged,
                        condition: 'DIRTY', // It was dirty when sent
                        referenceType: 'LAUNDRY',
                        referenceId: order.id,
                        lossResponsibility: resp,
                        createdBy: input.createdBy
                    }, tx);

                    if (resp === 'LAUNDRY_VENDOR') {
                        await VendorLiabilityService.createLiability({
                            tenantId: input.tenantId,
                            vendorId: order.vendorId,
                            stockMovementId: damageMvt.id,
                            movementTypeCode: 'DAMAGE',
                            apparelId: returnItem.apparelId,
                            quantity: returnItem.qtyDamaged,
                            createdBy: input.createdBy,
                        }, tx);
                    }
                }

                if (returnItem.qtyMissing > 0) {
                    const missingMvt = await MovementService.createMovement({
                        tenantId: input.tenantId,
                        apparelId: returnItem.apparelId,
                        movementType: 'MISSING',
                        quantityChange: -returnItem.qtyMissing,
                        condition: 'DIRTY',
                        referenceType: 'LAUNDRY',
                        referenceId: order.id,
                        lossResponsibility: resp,
                        createdBy: input.createdBy
                    }, tx);

                    if (resp === 'LAUNDRY_VENDOR') {
                        await VendorLiabilityService.createLiability({
                            tenantId: input.tenantId,
                            vendorId: order.vendorId,
                            stockMovementId: missingMvt.id,
                            movementTypeCode: 'MISSING',
                            apparelId: returnItem.apparelId,
                            quantity: returnItem.qtyMissing,
                            createdBy: input.createdBy,
                        }, tx);
                    }
                }
            }

            // 4. Update order status if all items are accounted for
            const updatedItems = await tx.laundryOrderItem.findMany({
                where: { laundryOrderId: input.orderId }
            });

            const allReconciled = updatedItems.every(i =>
                (i.qtyReturned + i.qtyDamaged + i.qtyMissing) >= i.qtyDispatched
            );

            await tx.laundryOrder.update({
                where: { id: input.orderId },
                data: { status: allReconciled ? 'CLOSED' : 'PARTIAL_RETURN' }
            });

            // Invalidate today's dashboard snapshot so returned/damaged/missing stock updates immediately
            await SnapshotInvalidator.invalidateToday(input.tenantId, tx);

            return order;
        });
    }
}
