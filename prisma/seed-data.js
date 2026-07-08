const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Inventory Data Seed...');

    // 1. Fetch Tenant and Admin User
    const tenant = await prisma.tenant.findUnique({ where: { code: 'default' } });
    if (!tenant) {
        console.error('❌ Tenant "default" not found. Run main seed first.');
        return;
    }
    const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    if (!admin) {
        console.error('❌ Admin user not found. Run main seed first.');
        return;
    }

    console.log(`Using Tenant: ${tenant.name} (${tenant.id}) and Admin: ${admin.fullName} (${admin.id})`);

    // 2. Clear existing inventory data
    console.log('Cleaning up existing inventory data...');
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.laundryOrderItem.deleteMany({});
    await prisma.laundryOrder.deleteMany({});
    await prisma.eventReservation.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.apparel.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.category.deleteMany({});
    console.log('✅ Inventory data cleared.');

    // 3. Create Categories
    console.log('Creating categories...');
    const catSafety = await prisma.category.create({ data: { tenantId: tenant.id, name: 'Safety Ops' } });
    const catField = await prisma.category.create({ data: { tenantId: tenant.id, name: 'Field Gear' } });
    const catPersonal = await prisma.category.create({ data: { tenantId: tenant.id, name: 'Personal Equipment' } });

    // 4. Create Vendors
    console.log('Creating vendors...');
    const vendorClean = await prisma.vendor.create({ data: { tenantId: tenant.id, name: 'CleanMaster Services', contactInfo: 'contact@cleanmaster.com' } });
    const vendorSwift = await prisma.vendor.create({ data: { tenantId: tenant.id, name: 'Swift Laundry', contactInfo: 'ops@swiftlaundry.net' } });

    // 5. Create Apparels
    console.log('Creating apparels...');
    const vest = await prisma.apparel.create({
        data: {
            tenantId: tenant.id, categoryId: catSafety.id, name: 'Tactical Vest (M)', unit: 'Units', minStockLevel: 20, unitValue: 150.00
        }
    });
    const helmet = await prisma.apparel.create({
        data: {
            tenantId: tenant.id, categoryId: catSafety.id, name: 'Response Helmet', unit: 'Units', minStockLevel: 10, unitValue: 245.50
        }
    });
    const belt = await prisma.apparel.create({
        data: {
            tenantId: tenant.id, categoryId: catField.id, name: 'Utility Belt (L)', unit: 'Units', minStockLevel: 15, unitValue: 85.00
        }
    });
    const radio = await prisma.apparel.create({
        data: {
            tenantId: tenant.id, categoryId: catField.id, name: 'Comms Radio V2', unit: 'Units', minStockLevel: 5, unitValue: 450.00
        }
    });

    // 6. Initial Stock (Condition: CLEAN)
    console.log('Adding initial stock (100 for all)...');
    const initialMovements = [
        { apparelId: vest.id, qty: 100 },
        { apparelId: helmet.id, qty: 100 },
        { apparelId: belt.id, qty: 100 },
        { apparelId: radio.id, qty: 100 }
    ];

    for (const stock of initialMovements) {
        await prisma.stockMovement.create({
            data: {
                tenantId: tenant.id,
                apparelId: stock.apparelId,
                movementType: 'INBOUND',
                quantityChange: stock.qty,
                condition: 'CLEAN',
                reason: 'Initial Inventory Seed',
                createdBy: admin.id
            }
        });
    }

    // 7. Create Events
    console.log('Creating events and reservations...');

    // Past Event (Closed)
    const eventPast = await prisma.event.create({
        data: {
            tenantId: tenant.id,
            name: 'Annual Security Review 2024',
            eventDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            status: 'CLOSED'
        }
    });

    // Active Event (Allotted, needs reconciliation)
    const eventActive = await prisma.event.create({
        data: {
            tenantId: tenant.id,
            name: 'Metro Sector Drill',
            eventDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
            status: 'ALLOTTED'
        }
    });

    // Future Event (Draft)
    const eventFuture = await prisma.event.create({
        data: {
            tenantId: tenant.id,
            name: 'Regional Expo 2026',
            eventDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days ahead
            status: 'CONFIRMED'
        }
    });

    // 8. Event Reservations & Historical Allotments
    // Past Allotments for Event Past (already returned)
    const resPastVest = await prisma.eventReservation.create({
        data: { tenantId: tenant.id, eventId: eventPast.id, apparelId: vest.id, reservedQty: 20, status: 'COMPLETED', createdBy: admin.id }
    });
    const resPastHelmet = await prisma.eventReservation.create({
        data: { tenantId: tenant.id, eventId: eventPast.id, apparelId: helmet.id, reservedQty: 5, status: 'COMPLETED', createdBy: admin.id }
    });

    // Record past data movements (Allotted -> Return)
    // Vest
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'ALLOTMENT', quantityChange: -20, condition: 'CLEAN', referenceType: 'EVENT', referenceId: eventPast.id, createdBy: admin.id }
    });
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'EVENT_RETURN', quantityChange: 18, condition: 'DIRTY', referenceType: 'EVENT', referenceId: eventPast.id, createdBy: admin.id }
    });

    // Helmet (Prerequisite for laundry dispatch)
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: helmet.id, movementType: 'ALLOTMENT', quantityChange: -5, condition: 'CLEAN', referenceType: 'EVENT', referenceId: eventPast.id, createdBy: admin.id }
    });
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: helmet.id, movementType: 'EVENT_RETURN', quantityChange: 5, condition: 'DIRTY', referenceType: 'EVENT', referenceId: eventPast.id, createdBy: admin.id }
    });

    const mLoss = await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'MISSING', quantityChange: -2, condition: 'DIRTY', referenceType: 'EVENT', referenceId: eventPast.id, createdBy: admin.id }
    });
    // Add a recovery for the past event
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'RECOVERY', quantityChange: 1, condition: 'CLEAN', referenceType: 'EVENT', referenceId: eventPast.id, recoveryOfMovementId: mLoss.id, createdBy: admin.id }
    });

    // Active Allotments for Event Active
    await prisma.eventReservation.create({
        data: { tenantId: tenant.id, eventId: eventActive.id, apparelId: helmet.id, reservedQty: 15, status: 'ALLOTTED', createdBy: admin.id }
    });
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: helmet.id, movementType: 'ALLOTMENT', quantityChange: -15, condition: 'CLEAN', referenceType: 'EVENT', referenceId: eventActive.id, createdBy: admin.id }
    });

    // Future Reservation
    await prisma.eventReservation.create({
        data: { tenantId: tenant.id, eventId: eventFuture.id, apparelId: radio.id, reservedQty: 10, status: 'ACTIVE', createdBy: admin.id }
    });

    // 9. Laundry Orders
    console.log('Creating laundry orders...');

    // Previous Laundry (Closed)
    const laundryPast = await prisma.laundryOrder.create({
        data: {
            tenantId: tenant.id,
            vendorId: vendorClean.id,
            dispatchDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 'CLOSED',
            createdBy: admin.id
        }
    });
    const lItem1 = await prisma.laundryOrderItem.create({
        data: { laundryOrderId: laundryPast.id, apparelId: vest.id, qtyDispatched: 18, qtyReturned: 17, qtyDamaged: 1, qtyMissing: 0 }
    });
    // Movements for laundry past
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'LAUNDRY_DISPATCH', quantityChange: -18, condition: 'DIRTY', referenceType: 'LAUNDRY', referenceId: laundryPast.id, createdBy: admin.id }
    });
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'LAUNDRY_RETURN_RECEIVED', quantityChange: 17, condition: 'CLEAN', referenceType: 'LAUNDRY', referenceId: laundryPast.id, createdBy: admin.id }
    });
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'DAMAGE', quantityChange: -1, condition: 'DIRTY', referenceType: 'LAUNDRY', referenceId: laundryPast.id, createdBy: admin.id }
    });

    // Current Laundry (Dispatched)
    const laundryActive = await prisma.laundryOrder.create({
        data: {
            tenantId: tenant.id,
            vendorId: vendorSwift.id,
            dispatchDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            expectedReturnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            status: 'DISPATCHED',
            createdBy: admin.id
        }
    });
    await prisma.laundryOrderItem.create({
        data: { laundryOrderId: laundryActive.id, apparelId: helmet.id, qtyDispatched: 5, qtyReturned: 0 }
    });
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: helmet.id, movementType: 'LAUNDRY_DISPATCH', quantityChange: -5, condition: 'DIRTY', referenceType: 'LAUNDRY', referenceId: laundryActive.id, createdBy: admin.id }
    });

    // 10. Suppliers & Purchase Orders
    console.log('Creating suppliers and purchase orders...');
    const supplierAcme = await prisma.supplier.create({
        data: { tenantId: tenant.id, name: 'Acme Tactical Gear', contactInfo: 'sales@acmetactical.com' }
    });
    const supplierField = await prisma.supplier.create({
        data: { tenantId: tenant.id, name: 'Field & Guardian Co.', contactInfo: 'orders@fieldguardian.com' }
    });

    // Past PO (Received)
    const poPast = await prisma.purchaseOrder.create({
        data: {
            tenantId: tenant.id,
            supplierId: supplierAcme.id,
            poNumber: 'PO-2024-001',
            status: 'RECEIVED',
            orderDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            expectedDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
            createdBy: admin.id,
            approvedBy: admin.id
        }
    });

    const poPastItem = await prisma.purchaseOrderItem.create({
        data: { purchaseOrderId: poPast.id, apparelId: vest.id, orderedQty: 50, receivedQty: 50, unitCost: 145.00 }
    });

    // Create stock movements for the past received PO
    await prisma.stockMovement.create({
        data: { tenantId: tenant.id, apparelId: vest.id, movementType: 'PURCHASE_RECEIVE', quantityChange: 50, condition: 'CLEAN', referenceType: 'PURCHASE', referenceId: poPast.id, createdBy: admin.id }
    });

    // Active PO (Ordered, partially received)
    const poActive = await prisma.purchaseOrder.create({
        data: {
            tenantId: tenant.id,
            supplierId: supplierField.id,
            poNumber: 'PO-2024-002',
            status: 'ORDERED',
            orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            createdBy: admin.id,
            approvedBy: admin.id
        }
    });

    await prisma.purchaseOrderItem.create({
        data: { purchaseOrderId: poActive.id, apparelId: radio.id, orderedQty: 20, receivedQty: 0, unitCost: 440.00 }
    });

    // Draft PO
    const poDraft = await prisma.purchaseOrder.create({
        data: {
            tenantId: tenant.id,
            supplierId: supplierAcme.id,
            poNumber: 'PO-2024-003',
            status: 'DRAFT',
            notes: 'Pending final regional approval.',
            createdBy: admin.id
        }
    });

    await prisma.purchaseOrderItem.create({
        data: { purchaseOrderId: poDraft.id, apparelId: helmet.id, orderedQty: 30, receivedQty: 0, unitCost: 245.50 }
    });

    console.log('\n🎉 Inventory seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
