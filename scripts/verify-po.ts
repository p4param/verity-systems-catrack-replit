import { PrismaClient } from "../src/generated/client";
import { SupplierService } from "../src/lib/inventory/supplier-service";
import { PurchaseOrderService } from "../src/lib/inventory/purchase-order-service";
import { AvailabilityEngine } from "../src/lib/inventory/availability-engine";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Verification...");
    const tenantId = 1; // Default tenant
    const adminId = 1; // Admin user

    // 1. Create Supplier
    const supplier = await SupplierService.createSupplier({
        tenantId,
        name: "Acme Linens Inc.",
        contactInfo: "contact@acmelinens.com",
        isActive: true
    });
    console.log("Created Supplier:", supplier.id);

    // 2. Need an Apparel
    const apparel = await prisma.apparel.findFirst({ where: { tenantId } });
    if (!apparel) {
        throw new Error("No apparel found to create PO");
    }

    // Capture initial balance
    const initialBals = await AvailabilityEngine.getBalances(tenantId, apparel.id);

    // 3. Create PO
    const po = await PurchaseOrderService.createPurchaseOrder({
        tenantId,
        supplierId: supplier.id,
        poNumber: "PO-TEST-001",
        items: [
            { apparelId: apparel.id, orderedQty: 100, unitCost: 15.50 }
        ],
        createdBy: adminId
    });
    console.log("Created PO:", po.id, po.status);

    // 4. Approve PO
    const approvedPo = await PurchaseOrderService.approvePurchaseOrder(tenantId, po.id, adminId);
    console.log("Approved PO:", approvedPo.status);

    // 5. Receive 50 Clean, 5 Damaged
    const receivedPo = await PurchaseOrderService.receiveGoods({
        tenantId,
        purchaseOrderId: po.id,
        items: [
            {
                purchaseOrderItemId: po.items[0].id,
                apparelId: apparel.id,
                receiveQty: 50,
                damagedQty: 5
            }
        ],
        createdBy: adminId
    });
    console.log("Received Goods. PO Status:", receivedPo.status);

    // 6. Return 10 Clean
    const returnedPo = await PurchaseOrderService.returnGoods({
        tenantId,
        purchaseOrderId: po.id,
        items: [
            {
                purchaseOrderItemId: po.items[0].id,
                apparelId: apparel.id,
                returnQty: 10
            }
        ],
        createdBy: adminId
    });
    console.log("Returned Goods. PO Status:", returnedPo.status);

    // 7. Check Stock Movements
    const movements = await prisma.stockMovement.findMany({
        where: { referenceType: 'PURCHASE', referenceId: po.id }
    });
    console.log("Generated Stock Movements:", movements.map(m => ({ type: m.movementType, qty: m.quantityChange, cond: m.condition })));

    // 8. Check Audit Logs
    const audits = await prisma.auditLog.findMany({
        where: { tenantId, actorUserId: adminId, action: { startsWith: 'PO_' } },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log("Audit Logs Generated:", audits.map(a => a.action));

    // 9. Check final balance
    const finalBals = await AvailabilityEngine.getBalances(tenantId, apparel.id);
    console.log(`Initial Clean Physical: ${initialBals.cleanStock}`);
    console.log(`Final Clean Physical: ${finalBals.cleanStock}`);
    console.log(`Expected Change: +50 (Received) -5 (Damaged On Arrival Deducted via receipt) -10 (Returned) = +35`);
    console.log(`Actual Change: ${finalBals.cleanStock - initialBals.cleanStock}`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
