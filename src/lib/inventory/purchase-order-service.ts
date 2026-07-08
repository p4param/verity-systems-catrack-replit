import { prisma } from "../prisma";
import { Prisma } from "../../generated/client";
import { MovementService } from "./movement-service";
import { createAuditLog } from "../audit";
import { SnapshotInvalidator } from "./dashboard/snapshot-invalidator";

export interface CreatePOInput {
    tenantId: number;
    supplierId: number;
    poNumber: string;
    expectedDate?: Date;
    notes?: string;
    items: { apparelId: number; orderedQty: number; unitCost?: number }[];
    createdBy: number;
}

export interface ReceiveStockInput {
    tenantId: number;
    purchaseOrderId: number;
    items: { purchaseOrderItemId: number; apparelId: number; receiveQty: number; damagedQty: number }[];
    createdBy: number;
}

export interface ReturnStockInput {
    tenantId: number;
    purchaseOrderId: number;
    items: { purchaseOrderItemId: number; apparelId: number; returnQty: number }[];
    createdBy: number;
}

export class PurchaseOrderService {
    /**
     * Creates a new purchase order in DRAFT state.
     */
    static async createPurchaseOrder(input: CreatePOInput) {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.create({
                data: {
                    tenantId: input.tenantId,
                    supplierId: input.supplierId,
                    poNumber: input.poNumber,
                    expectedDate: input.expectedDate,
                    notes: input.notes,
                    status: "DRAFT",
                    createdBy: input.createdBy,
                    items: {
                        create: input.items.map(item => ({
                            apparelId: item.apparelId,
                            orderedQty: item.orderedQty,
                            unitCost: item.unitCost
                        }))
                    }
                },
                include: { items: true }
            });

            await createAuditLog({
                tenantId: input.tenantId,
                actorUserId: input.createdBy,
                action: "PO_CREATED",
                details: `Created Purchase Order ${input.poNumber} in DRAFT`
            }, tx);

            return po;
        });
    }

    /**
     * Approves a DRAFT purchase order, changing it to ORDERED.
     */
    static async approvePurchaseOrder(tenantId: number, id: number, approvedBy: number) {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id, tenantId } });

            if (po.status !== "DRAFT") {
                throw new Error("Only DRAFT purchase orders can be approved.");
            }

            const updatedPo = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    status: "ORDERED",
                    approvedBy,
                    orderDate: new Date()
                }
            });

            await createAuditLog({
                tenantId,
                actorUserId: approvedBy,
                action: "PO_APPROVED",
                details: `Approved Purchase Order ${po.poNumber}`
            }, tx);

            return updatedPo;
        });
    }

    /**
     * Receives goods against a purchase order.
     * Inserts PURCHASE_RECEIVE (and PURCHASE_DAMAGE_ON_ARRIVAL) movements.
     */
    static async receiveGoods(input: ReceiveStockInput) {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUniqueOrThrow({
                where: { id: input.purchaseOrderId, tenantId: input.tenantId },
                include: { items: true }
            });

            if (po.status === "CANCELLED" || po.status === "CLOSED") {
                throw new Error(`Cannot receive against PO with status ${po.status}`);
            }

            let anyReceipts = false;
            let totalDamaged = 0;

            for (const itemInput of input.items) {
                const orderItem = po.items.find(i => i.id === itemInput.purchaseOrderItemId);
                if (!orderItem) continue;

                const totalReceiveQty = itemInput.receiveQty + itemInput.damagedQty;

                if (orderItem.receivedQty + totalReceiveQty > orderItem.orderedQty) {
                    throw new Error(`Cannot over-receive item ${orderItem.apparelId}. Ordered: ${orderItem.orderedQty}, Previously Received: ${orderItem.receivedQty}, Attempted: ${totalReceiveQty}`);
                }

                if (totalReceiveQty > 0) {
                    anyReceipts = true;

                    // 1. Update line item received quantity
                    await tx.purchaseOrderItem.update({
                        where: { id: orderItem.id },
                        data: {
                            receivedQty: { increment: totalReceiveQty }
                        }
                    });

                    // 2. Insert PURCHASE_RECEIVE (+ CLEAN)
                    await MovementService.createMovement({
                        tenantId: input.tenantId,
                        apparelId: itemInput.apparelId,
                        movementType: "PURCHASE_RECEIVE",
                        quantityChange: totalReceiveQty,
                        condition: "CLEAN",
                        referenceType: "PURCHASE",
                        referenceId: po.id,
                        createdBy: input.createdBy
                    }, tx);

                    // 3. Insert PURCHASE_DAMAGE_ON_ARRIVAL (- CLEAN) if requested. 
                    // Technically it reduces CLEAN availability immediately if it arrived damaged.
                    // Or if damaged stock is just not added to clean, we balance it by adding receiving full then deducting damage.
                    if (itemInput.damagedQty > 0) {
                        totalDamaged += itemInput.damagedQty;
                        await MovementService.createMovement({
                            tenantId: input.tenantId,
                            apparelId: itemInput.apparelId,
                            movementType: "PURCHASE_DAMAGE_ON_ARRIVAL",
                            quantityChange: -itemInput.damagedQty,
                            condition: "CLEAN", // Removing from clean pool
                            referenceType: "PURCHASE",
                            referenceId: po.id,
                            createdBy: input.createdBy
                        }, tx);
                    }
                }
            }

            if (!anyReceipts) {
                return po; // Nothing to change
            }

            // Recalculate PO status
            const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
            const allReceived = updatedItems.every(i => i.receivedQty >= i.orderedQty);

            const newStatus = allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";
            const updatedPo = await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: newStatus }
            });

            await createAuditLog({
                tenantId: input.tenantId,
                actorUserId: input.createdBy,
                action: newStatus === "RECEIVED" ? "PO_GOODS_RECEIPT_FULL" : "PO_GOODS_RECEIPT_PARTIAL",
                details: `Received goods for PO ${po.poNumber}. Damaged on arrival: ${totalDamaged}`
            }, tx);

            // Invalidate today's dashboard snapshot so the next read reflects new stock
            await SnapshotInvalidator.invalidateToday(input.tenantId, tx);

            return updatedPo;
        });
    }

    /**
     * Returns stock previously received against a purchase order.
     */
    static async returnGoods(input: ReturnStockInput) {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUniqueOrThrow({
                where: { id: input.purchaseOrderId, tenantId: input.tenantId },
                include: { items: true }
            });

            let anyReturns = false;

            for (const itemInput of input.items) {
                if (itemInput.returnQty <= 0) continue;

                const orderItem = po.items.find(i => i.id === itemInput.purchaseOrderItemId);
                if (!orderItem) continue;

                if (itemInput.returnQty > orderItem.receivedQty) {
                    throw new Error(`Cannot return more than received for item ${orderItem.apparelId}. Received: ${orderItem.receivedQty}, Return Attempt: ${itemInput.returnQty}`);
                }

                anyReturns = true;

                // 1. Update line item received quantity (deduct)
                await tx.purchaseOrderItem.update({
                    where: { id: orderItem.id },
                    data: {
                        receivedQty: { decrement: itemInput.returnQty }
                    }
                });

                // 2. Insert PURCHASE_RETURN (- CLEAN)
                await MovementService.createMovement({
                    tenantId: input.tenantId,
                    apparelId: itemInput.apparelId,
                    movementType: "PURCHASE_RETURN",
                    quantityChange: -itemInput.returnQty,
                    condition: "CLEAN",
                    referenceType: "PURCHASE",
                    referenceId: po.id,
                    createdBy: input.createdBy
                }, tx);
            }

            if (!anyReturns) {
                return po;
            }

            // Recalculate PO status if it was CLOSED but items are returned? 
            // Usually returns might shift a RECEIVED back to PARTIALLY_RECEIVED
            const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
            const allReceived = updatedItems.every(i => i.receivedQty >= i.orderedQty);

            let newStatus = po.status;
            if (po.status === "RECEIVED" && !allReceived) {
                newStatus = "PARTIALLY_RECEIVED";
                await tx.purchaseOrder.update({
                    where: { id: po.id },
                    data: { status: newStatus }
                });
            }

            await createAuditLog({
                tenantId: input.tenantId,
                actorUserId: input.createdBy,
                action: "PO_PURCHASE_RETURN",
                details: `Returned goods for PO ${po.poNumber}`
            }, tx);

            // Invalidate today's dashboard snapshot so the next read reflects new stock
            await SnapshotInvalidator.invalidateToday(input.tenantId, tx);

            return await tx.purchaseOrder.findUniqueOrThrow({
                where: { id: po.id },
                include: { items: true }
            });
        });
    }

    /**
     * Closes or Cancels a Purchase Order
     */
    static async updateStatus(tenantId: number, id: number, status: "CLOSED" | "CANCELLED", updatedBy: number) {
        return await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUniqueOrThrow({
                where: { id, tenantId },
                include: { items: true }
            });

            if (status === "CANCELLED" && po.items.some(i => i.receivedQty > 0)) {
                throw new Error("Cannot cancel a PO that has already received items.");
            }

            const updated = await tx.purchaseOrder.update({
                where: { id },
                data: { status }
            });

            await createAuditLog({
                tenantId,
                actorUserId: updatedBy,
                action: status === "CLOSED" ? "PO_CLOSED" : "PO_CANCELLED",
                details: `${status === "CLOSED" ? "Closed" : "Cancelled"} PO ${po.poNumber}`
            }, tx);

            return updated;
        });
    }

    static async getPurchaseOrder(tenantId: number, id: number) {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id, tenantId },
            include: { supplier: true, items: { include: { apparel: true } } }
        });

        if (!po) return null;

        // Fetch all PURCHASE_DAMAGE_ON_ARRIVAL movements for this PO
        const damageMovements = await prisma.stockMovement.findMany({
            where: {
                tenantId,
                referenceType: "PURCHASE",
                referenceId: id,
                movementType: "PURCHASE_DAMAGE_ON_ARRIVAL"
            }
        });

        // Map damage quantities to items
        const itemsWithDamage = po.items.map(item => {
            const itemDamages = damageMovements.filter(m => m.apparelId === item.apparelId);
            const damagedQty = itemDamages.reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);
            return {
                ...item,
                damagedQty
            };
        });

        return {
            ...po,
            items: itemsWithDamage
        };
    }

    static async listPurchaseOrders(tenantId: number, options?: { supplierId?: number; status?: string }) {
        const where: Prisma.PurchaseOrderWhereInput = { tenantId };

        if (options?.supplierId) where.supplierId = options.supplierId;
        if (options?.status) where.status = options.status;

        return await prisma.purchaseOrder.findMany({
            where,
            include: { supplier: true, items: true },
            orderBy: { createdAt: 'desc' }
        });
    }
}
