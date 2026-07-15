/**
 * VS05Z: verify-po.ts — Purchase Order Verification Script
 *
 * Updated to use UUID identifiers from the seeded tenant and admin user.
 *
 * Usage: npx tsx scripts/verify-po.ts
 */

import { PrismaClient } from "../src/generated/client";
import { SupplierService } from "../src/lib/inventory/supplier-service";
import { PurchaseOrderService } from "../src/lib/inventory/purchase-order-service";
import { AvailabilityEngine } from "../src/lib/inventory/availability-engine";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Verification...");

    // Resolve tenant and admin from DB (VS05Z: UUIDs now)
    const tenant = await prisma.tenant.findUnique({ where: { code: "VERITY" } });
    if (!tenant) throw new Error("Seed not run — tenant VERITY not found");

    const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    if (!admin) throw new Error("Seed not run — admin user not found");

    const tenantId = tenant.id;
    const adminId = admin.id; // Now a UUID string

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
        createdBy: admin.id // VS05Z: UUID string
    });
    console.log("Created PO:", po.id, po.status);

    // 4. Approve PO
    const approvedPo = await PurchaseOrderService.approvePurchaseOrder(tenantId, po.id, admin.id);
    console.log("Approved PO:", approvedPo.status);

    // 5. Check Audit Logs
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
    console.log("✅ Verification complete.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
