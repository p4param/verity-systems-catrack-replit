const { PrismaClient } = require('../src/generated/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    const targetCode = process.argv[2] || 'default'
    console.log(`🌱 Starting database seed for tenant code: '${targetCode}'...`)

    // 1. Get or Create Tenant
    console.log(`Fetching or creating tenant '${targetCode}'...`)
    const tenant = await prisma.tenant.upsert({
        where: { code: targetCode },
        update: { isActive: true },
        create: {
            code: targetCode,
            name: targetCode === 'default' ? 'Default Tenant' : `Tenant ${targetCode}`,
            isActive: true,
        },
    })
    console.log(`✅ Targeted Tenant: ${tenant.name} (Code: ${tenant.code}, ID: ${tenant.id})`)

    // 2. Create Permissions
    console.log('Creating permissions...')
    const permissions = [
        { code: 'USER_VIEW', description: 'View users' },
        { code: 'USER_CREATE', description: 'Create users' },
        { code: 'USER_UPDATE', description: 'Update users' },
        { code: 'USER_DELETE', description: 'Delete users' },
        { code: 'ROLE_VIEW', description: 'View roles' },
        { code: 'ROLE_CREATE', description: 'Create roles' },
        { code: 'ROLE_UPDATE', description: 'Update roles' },
        { code: 'ROLE_DELETE', description: 'Delete roles' },
        { code: 'ROLE_ASSIGN', description: 'Assign roles to users' },
        { code: 'PERMISSION_VIEW', description: 'View permissions' },
        { code: 'AUDIT_VIEW', description: 'View audit logs' },
        { code: 'ADMIN_ACCESS', description: 'Access admin panel' },
        { code: 'INVENTORY_VIEW', description: 'View inventory dashboard and apparels' },
        { code: 'INVENTORY_MANAGE', description: 'Manage apparels and stock adjustments' },
        { code: 'RESERVATION_MANAGE', description: 'Manage event reservations' },
        { code: 'LAUNDRY_MANAGE', description: 'Manage laundry dispatch and returns' },
        { code: 'REPORTING_VIEW', description: 'View inventory and laundry reports' },
        { code: 'INVENTORY_RECOVERY', description: 'Record recovery of missing or damaged assets' },
        { code: 'INVENTORY_PURCHASE_VIEW', description: 'View purchase orders and inbound stock' },
        { code: 'INVENTORY_PURCHASE_CREATE', description: 'Create and edit purchase orders' },
        { code: 'INVENTORY_PURCHASE_APPROVE', description: 'Approve purchase orders' },
        { code: 'INVENTORY_PURCHASE_RECEIVE', description: 'Receive inbound goods' },
        { code: 'INVENTORY_PURCHASE_RETURN', description: 'Return purchased goods' },
        { code: 'INVENTORY_MASTER_VIEW', description: 'View master data definitions' },
        { code: 'INVENTORY_MASTER_CREATE', description: 'Create new master records' },
        { code: 'INVENTORY_MASTER_UPDATE', description: 'Edit non-system master records' },
        { code: 'INVENTORY_MASTER_DELETE', description: 'Soft-delete master records' },
        { code: 'INVENTORY_SETTINGS_MANAGE', description: 'Configure global inventory settings' },
        { code: 'DASHBOARD_EXECUTIVE_VIEW', description: 'Access the Executive Inventory Dashboard with KPI snapshots' },
        // Vendor Billing Permissions
        { code: 'LAUNDRY_VENDOR_BILLING_VIEW', description: 'View vendor rate contracts and invoices' },
        { code: 'LAUNDRY_VENDOR_BILLING_CREATE', description: 'Create vendor rate contracts and generate invoices' },
        { code: 'LAUNDRY_VENDOR_BILLING_UPDATE', description: 'Post or cancel vendor invoices' },
        { code: 'LAUNDRY_VENDOR_PAYMENT_VIEW', description: 'View vendor payments' },
        { code: 'LAUNDRY_VENDOR_PAYMENT_CREATE', description: 'Create vendor payments' },
        { code: 'LAUNDRY_VENDOR_PAYMENT_UPDATE', description: 'Post or void vendor payments' },
        { code: 'LAUNDRY_VENDOR_STATEMENT_VIEW', description: 'View vendor statements and aging reports' },
        { code: 'LAUNDRY_VENDOR_LIABILITY_VIEW', description: 'View vendor liabilities and recovery credits' },
        { code: 'LAUNDRY_VENDOR_LIABILITY_CREATE', description: 'Create vendor liability records' },
        { code: 'LAUNDRY_VENDOR_LIABILITY_UPDATE', description: 'Waive or settle vendor liabilities' },
        { code: 'PLATFORM_MODULE_VIEW', description: 'View platform modules and configurations' },
        { code: 'PLATFORM_MODULE_CREATE', description: 'Create platform modules' },
        { code: 'PLATFORM_MODULE_UPDATE', description: 'Update platform modules and navigation layouts' },
        { code: 'PLATFORM_MODULE_DELETE', description: 'Delete platform modules and navigation nodes' },
        { code: 'PLATFORM_ENTITY_VIEW', description: 'View business entities' },
        { code: 'PLATFORM_ENTITY_CREATE', description: 'Create business entities' },
        { code: 'PLATFORM_ENTITY_EDIT', description: 'Edit business entities' },
        { code: 'PLATFORM_ENTITY_DELETE', description: 'Delete business entities' },
        { code: 'PLATFORM_ENTITY_ARCHIVE', description: 'Archive business entities' },
        { code: 'PLATFORM_ENTITY_RESTORE', description: 'Restore business entities' },
        { code: 'PLATFORM_ENTITY_DUPLICATE', description: 'Duplicate business entities' },
        { code: 'PLATFORM_ENTITY_PUBLISH', description: 'Publish business entities' },
        { code: 'PLATFORM_FIELD_VIEW', description: 'View entity fields' },
        { code: 'PLATFORM_FIELD_CREATE', description: 'Create entity fields' },
        { code: 'PLATFORM_FIELD_EDIT', description: 'Edit entity fields' },
        { code: 'PLATFORM_FIELD_DELETE', description: 'Delete entity fields' },
        { code: 'PLATFORM_FIELD_ARCHIVE', description: 'Archive entity fields' },
        { code: 'PLATFORM_FIELD_PUBLISH', description: 'Publish entity fields' },
        { code: 'PLATFORM_VIEW_VIEW', description: 'View entity views' },
        { code: 'PLATFORM_VIEW_CREATE', description: 'Create entity views' },
        { code: 'PLATFORM_VIEW_EDIT', description: 'Edit entity views' },
        { code: 'PLATFORM_VIEW_DELETE', description: 'Delete entity views' }
    ]

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        })
    }
    console.log(`✅ Created ${permissions.length} permissions`)

    // 3. Create Admin Role
    console.log('Creating admin role...')
    const adminRole = await prisma.role.upsert({
        where: {
            tenantId_name: {
                tenantId: tenant.id,
                name: 'Admin',
            },
        },
        update: {},
        create: {
            tenantId: tenant.id,
            name: 'Admin',
            description: 'Full system administrator',
            isSystem: true,
            requiresMfa: false,
            isActive: true,
        },
    })
    console.log(`✅ Admin role created (ID: ${adminRole.id})`)

    // 4. Assign all permissions to Admin role
    console.log('Assigning permissions to admin role...')
    const allPermissions = await prisma.permission.findMany()
    for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: permission.id,
            },
        })
    }
    console.log(`✅ Assigned ${allPermissions.length} permissions to Admin role`)

    // 5. Create Admin User
    console.log('Creating admin user...')
    const passwordHash = await bcrypt.hash('Admin@123', 10)

    const adminUser = await prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId: tenant.id,
                email: 'admin@example.com',
            },
        },
        update: {
            // Always reset credentials on re-seed so the known password is restored
            passwordHash: passwordHash,
            status: 'ACTIVE',
            isActive: true,
            isLocked: false,
        },
        create: {
            tenantId: tenant.id,
            fullName: 'System Administrator',
            email: 'admin@example.com',
            passwordHash: passwordHash,
            status: 'ACTIVE',
            isActive: true,
            isLocked: false,
            mfaEnabled: false,
        },
    })
    console.log(`✅ Admin user created (ID: ${adminUser.id})`)

    // 6. Assign Admin role to user
    console.log('Assigning admin role to user...')
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: adminUser.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: adminUser.id,
            roleId: adminRole.id,
            assignedBy: adminUser.id,
        },
    })
    console.log('✅ Admin role assigned to user')

    // 7. Create User Role (for regular users)
    console.log('Creating user role...')
    const userRole = await prisma.role.upsert({
        where: {
            tenantId_name: {
                tenantId: tenant.id,
                name: 'User',
            },
        },
        update: {},
        create: {
            tenantId: tenant.id,
            name: 'User',
            description: 'Standard user',
            isSystem: true,
            requiresMfa: false,
            isActive: true,
        },
    })
    console.log(`✅ User role created (ID: ${userRole.id})`)

    // Assign basic permissions to User role
    const userPermissions = await prisma.permission.findMany({
        where: {
            code: {
                in: ['USER_VIEW'],
            },
        },
    })

    for (const permission of userPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: userRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: userRole.id,
                permissionId: permission.id,
            },
        })
    }
    console.log(`✅ Assigned ${userPermissions.length} permissions to User role`)

    // 8. Seed Default System Master Data
    console.log('Seeding Default Master Data...')

    // Inventory Settings
    await prisma.inventorySettings.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
            tenantId: tenant.id,
            allowNegativeStock: false,
            requireApprovalForRecovery: true,
            defaultLaundrySLA: 7,
            enableMultiLocation: false,
            enableValuation: true,
            currencySymbol: '$'
        }
    })

    // Movement Types (System Controlled)
    const movementTypes = [
        { code: 'INITIAL_STOCK', direction: 'IN', affectsClean: true, isSystemControlled: true },
        { code: 'MANUAL_ADJUSTMENT', direction: 'IN', affectsClean: true, isSystemControlled: true },
        { code: 'EVENT_DISPATCH', direction: 'OUT', affectsClean: true, isSystemControlled: true },
        { code: 'EVENT_RETURN', direction: 'IN', affectsDirty: true, isSystemControlled: true },
        { code: 'LAUNDRY_DISPATCH', direction: 'OUT', affectsDirty: true, isSystemControlled: true },
        { code: 'LAUNDRY_RETURN', direction: 'IN', affectsClean: true, isSystemControlled: true },
        { code: 'PURCHASE_RECEIVE', direction: 'IN', affectsClean: true, isSystemControlled: true },
        { code: 'PURCHASE_RETURN', direction: 'OUT', affectsClean: true, isSystemControlled: true },
        { code: 'PURCHASE_DAMAGE_ON_ARRIVAL', direction: 'OUT', affectsClean: true, isSystemControlled: true },
        { code: 'RECOVERY_FOUND', direction: 'IN', affectsClean: true, isSystemControlled: true, isRecoveryType: true },
        { code: 'RECOVERY_DAMAGED', direction: 'OUT', affectsDirty: true, isSystemControlled: true, isRecoveryType: true },
        { code: 'RECOVERY_MISSING', direction: 'OUT', affectsDirty: true, isSystemControlled: true, isRecoveryType: true }
    ]

    for (const mt of movementTypes) {
        await prisma.movementType.upsert({
            where: { tenantId_code: { tenantId: tenant.id, code: mt.code } },
            update: {},
            create: { tenantId: tenant.id, ...mt }
        })
    }

    // Stock Conditions (System Controlled equivalents)
    const conditions = [
        { code: 'CLEAN', description: 'Ready for deployment' },
        { code: 'DIRTY', description: 'Requires laundering' },
        { code: 'DAMAGED', description: 'Unfit for use' }
    ]

    for (const c of conditions) {
        await prisma.stockConditionMaster.upsert({
            where: { tenantId_code: { tenantId: tenant.id, code: c.code } },
            update: {},
            create: { tenantId: tenant.id, ...c }
        })
    }

    // Units of Measure
    const units = [
        { code: 'PCS', description: 'Pieces', conversionFactor: 1.0 },
        { code: 'SET', description: 'Full Sets', conversionFactor: 1.0 },
        { code: 'PAIR', description: 'Pair (L/R)', conversionFactor: 1.0 },
        { code: 'KG', description: 'Kilograms', conversionFactor: 1.0 }
    ]

    for (const u of units) {
        await prisma.unitOfMeasure.upsert({
            where: { tenantId_code: { tenantId: tenant.id, code: u.code } },
            update: {},
            create: { tenantId: tenant.id, ...u }
        })
    }

    console.log('✅ System Master Data seeded')

    // Document Numbering
    const documentNumbers = [
        { entityType: 'PURCHASE_ORDER', prefix: 'PO', currentSequence: 1, resetYearly: true },
        { entityType: 'GOODS_RECEIPT', prefix: 'GR', currentSequence: 1, resetYearly: true },
        { entityType: 'LAUNDRY_DISPATCH', prefix: 'LD', currentSequence: 1, resetYearly: true },
        { entityType: 'LAUNDRY_RETURN', prefix: 'LR', currentSequence: 1, resetYearly: true },
        { entityType: 'EVENT_RESERVATION', prefix: 'RES', currentSequence: 1, resetYearly: true },
        // Vendor Billing Document Numbering
        { entityType: 'LAUNDRY_VENDOR_INVOICE', prefix: 'LVI', currentSequence: 1, resetYearly: true },
        { entityType: 'LAUNDRY_VENDOR_PAYMENT', prefix: 'LVP', currentSequence: 1, resetYearly: true },
        { entityType: 'VENDOR_LIABILITY', prefix: 'LVL', currentSequence: 1, resetYearly: true },
        { entityType: 'VENDOR_LIABILITY_CREDIT', prefix: 'LVC', currentSequence: 1, resetYearly: true }
    ]

    for (const doc of documentNumbers) {
        await prisma.documentNumbering.upsert({
            where: { tenantId_entityType: { tenantId: tenant.id, entityType: doc.entityType } },
            update: {},
            create: { tenantId: tenant.id, ...doc }
        })
    }
    console.log('✅ Document Numbering seeded')

    // Reason Codes
    const reasonCodes = [
        { code: 'DAMAGED_ON_ARRIVAL', description: 'Damaged upon receipt', appliesTo: 'ADJUSTMENT', requiresApproval: true },
        { code: 'STOCK_TAKE_LOSS', description: 'Lost during stock take', appliesTo: 'ADJUSTMENT', requiresApproval: true },
        { code: 'LOST_AT_EVENT', description: 'Lost at event site', appliesTo: 'EVENT', requiresApproval: true },
        { code: 'LAUNDRY_SHRINK', description: 'Shrinkage from laundry', appliesTo: 'LAUNDRY', requiresApproval: true },
        { code: 'NORMAL_WEAR', description: 'Normal wear and tear', appliesTo: 'ADJUSTMENT', requiresApproval: false },
        { code: 'CUSTOMER_DAMAGE', description: 'Damaged by customer at event', appliesTo: 'EVENT', requiresApproval: true }
    ]

    for (const rc of reasonCodes) {
        await prisma.reasonCode.upsert({
            where: { tenantId_code: { tenantId: tenant.id, code: rc.code } },
            update: {},
            create: { tenantId: tenant.id, ...rc }
        })
    }
    // 9. Seed Dashboard Demo Data — computed from live seeded inventory
    console.log('Computing live dashboard snapshot from seeded inventory...')

    // ── Compute inventory summary from real StockMovement ledger ──────────────
    const stockGroups = await prisma.stockMovement.groupBy({
        by: ['condition'],
        where: {
            tenantId: tenant.id,
            movementType: { notIn: ['MISSING', 'DAMAGE'] },
        },
        _sum: { quantityChange: true },
    })

    const cleanPhysical = Math.max(0, Number(stockGroups.find(g => g.condition === 'CLEAN')?._sum?.quantityChange ?? 0))
    const dirtyPhysical = Math.max(0, Number(stockGroups.find(g => g.condition === 'DIRTY')?._sum?.quantityChange ?? 0))
    const totalPhysical = cleanPhysical + dirtyPhysical

    const reservationAgg = await prisma.eventReservation.aggregate({
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        _sum: { reservedQty: true },
    })
    const reserved = Number(reservationAgg._sum?.reservedQty ?? 0)

    const laundryAgg = await prisma.laundryOrderItem.aggregate({
        where: { laundryOrder: { tenantId: tenant.id } },
        _sum: { qtyDispatched: true, qtyReturned: true, qtyDamaged: true, qtyMissing: true },
    })
    const inLaundry = Math.max(0,
        Number(laundryAgg._sum?.qtyDispatched ?? 0) -
        Number(laundryAgg._sum?.qtyReturned ?? 0) -
        Number(laundryAgg._sum?.qtyDamaged ?? 0) -
        Number(laundryAgg._sum?.qtyMissing ?? 0)
    )

    const available = Math.max(0, cleanPhysical - reserved)

    // ── Compute loss metrics ───────────────────────────────────────────────────
    const lossAgg = await prisma.stockMovement.aggregate({
        where: { tenantId: tenant.id, movementType: { in: ['MISSING', 'DAMAGE'] } },
        _sum: { quantityChange: true },
    })
    const grossLoss = Math.abs(Number(lossAgg._sum?.quantityChange ?? 0))

    const recoveryAgg = await prisma.stockMovement.aggregate({
        where: { tenantId: tenant.id, movementType: 'RECOVERY' },
        _sum: { quantityChange: true },
    })
    const recovered = Math.abs(Number(recoveryAgg._sum?.quantityChange ?? 0))

    const allotmentAgg = await prisma.stockMovement.aggregate({
        where: { tenantId: tenant.id, movementType: 'EVENT_ALLOTMENT' },
        _sum: { quantityChange: true },
    })
    const totalAllotted = Math.abs(Number(allotmentAgg._sum?.quantityChange ?? 0))

    const netLoss = Math.max(0, grossLoss - recovered)
    const lossRate = totalAllotted > 0 ? parseFloat(((netLoss / totalAllotted) * 100).toFixed(2)) : 0
    const recoveryRate = grossLoss > 0 ? parseFloat(((recovered / grossLoss) * 100).toFixed(2)) : 0

    // ── Compute event metrics ──────────────────────────────────────────────────
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [upcomingEvents, eventsThisMonth, closedThisMonth, pendingReconciliation] = await Promise.all([
        prisma.event.count({ where: { tenantId: tenant.id, eventDate: { gte: now }, status: { notIn: ['CLOSED'] } } }),
        prisma.event.count({ where: { tenantId: tenant.id, eventDate: { gte: monthStart, lte: monthEnd } } }),
        prisma.event.count({ where: { tenantId: tenant.id, eventDate: { gte: monthStart, lte: monthEnd }, status: 'CLOSED' } }),
        prisma.event.count({ where: { tenantId: tenant.id, status: 'ALLOTTED' } }),
    ])
    const eventCompletionRate = eventsThisMonth > 0 ? Math.round((closedThisMonth / eventsThisMonth) * 100) : 0

    // ── Compute laundry metrics ────────────────────────────────────────────────
    const openLaundryOrders = await prisma.laundryOrder.findMany({
        where: { tenantId: tenant.id, status: { in: ['DISPATCHED', 'PARTIAL_RETURN'] } },
        select: { id: true, dispatchDate: true, expectedReturnDate: true },
    })
    let within3Days = 0, within7Days = 0, over7Days = 0, delayed = 0
    for (const o of openLaundryOrders) {
        const ageDays = (now.getTime() - o.dispatchDate.getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays <= 3) within3Days++
        else if (ageDays <= 7) within7Days++
        else over7Days++
        if (o.expectedReturnDate && now > o.expectedReturnDate) delayed++
    }

    // ── Compute health score ───────────────────────────────────────────────────
    const availabilityRatio = totalPhysical > 0 ? available / totalPhysical : 0
    const availabilityScore = Math.min(100, Math.round(availabilityRatio * 100))

    const apparels = await prisma.apparel.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, minStockLevel: true },
    })
    const cleanByApparel = {}
    for (const g of await prisma.stockMovement.groupBy({
        by: ['apparelId', 'condition'],
        where: { tenantId: tenant.id, movementType: { notIn: ['MISSING', 'DAMAGE'] } },
        _sum: { quantityChange: true },
    })) {
        if (g.condition === 'CLEAN') cleanByApparel[g.apparelId] = Number(g._sum?.quantityChange ?? 0)
    }
    const reservedByApparel = {}
    for (const r of await prisma.eventReservation.groupBy({
        by: ['apparelId'],
        where: { tenantId: tenant.id, status: 'ACTIVE' },
        _sum: { reservedQty: true },
    })) {
        reservedByApparel[r.apparelId] = Number(r._sum?.reservedQty ?? 0)
    }
    const atRiskCount = apparels.filter(a => Math.max(0, (cleanByApparel[a.id] ?? 0) - (reservedByApparel[a.id] ?? 0)) <= a.minStockLevel).length
    const stockoutRiskScore = apparels.length > 0 ? Math.round((1 - atRiskCount / apparels.length) * 100) : 100

    const dirtyRatio = totalPhysical > 0 ? dirtyPhysical / totalPhysical : 0
    const dirtyRatioScore = Math.round(Math.max(0, (1 - dirtyRatio * 2)) * 100)

    const lossRatioScore = Math.round(Math.max(0, (1 - lossRate / 100 * 5)) * 100)

    const agedOrders = await prisma.laundryOrder.count({
        where: { tenantId: tenant.id, status: { in: ['DISPATCHED', 'PARTIAL_RETURN'] }, dispatchDate: { lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    })
    const totalOpenLaundry = openLaundryOrders.length
    const agingScore = totalOpenLaundry > 0 ? Math.round((1 - agedOrders / totalOpenLaundry) * 100) : 100

    const healthScore = Math.round(
        availabilityScore * 0.30 + stockoutRiskScore * 0.25 +
        dirtyRatioScore * 0.20 + lossRatioScore * 0.15 + agingScore * 0.10
    )

    // ── Risk levels ────────────────────────────────────────────────────────────
    const stockoutRiskLevel = availabilityRatio < 0.2 ? 'HIGH' : availabilityRatio < 0.4 ? 'MEDIUM' : 'LOW'
    const vendorRiskLevel = delayed > 5 ? 'HIGH' : delayed > 2 ? 'MEDIUM' : 'LOW'
    const laundryBottleneckLevel = delayed > 5 ? 'HIGH' : delayed > 2 ? 'MEDIUM' : 'LOW'
    const eventCapacityRiskLevel = pendingReconciliation > 10 ? 'HIGH' : pendingReconciliation > 5 ? 'MEDIUM' : 'LOW'

    console.log(`  📦 Total Physical Stock : ${totalPhysical} (Clean: ${cleanPhysical}, Dirty: ${dirtyPhysical})`)
    console.log(`  ✅ Available            : ${available}`)
    console.log(`  🔒 Reserved             : ${reserved}`)
    console.log(`  🧺 In Laundry           : ${inLaundry}`)
    console.log(`  ❌ Gross Loss           : ${grossLoss}  Net Loss: ${netLoss}  Recovery Rate: ${recoveryRate}%`)
    console.log(`  💚 Health Score         : ${healthScore}`)

    // ── Upsert live snapshot (always overwrite today's) ────────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.dashboardSnapshot.upsert({
        where: { tenantId_snapshotDate: { tenantId: tenant.id, snapshotDate: today } },
        update: {
            totalPhysicalInventory: totalPhysical,
            availableInventory: available,
            reservedInventory: reserved,
            dirtyInventory: dirtyPhysical,
            inLaundryInventory: inLaundry,
            inventoryHealth: healthScore,
            availabilityScore,
            stockoutRiskScore,
            dirtyRatioScore,
            lossRatioScore,
            agingScore,
            predictedDemand30Days: 0,
            forecastAccuracy: 0,
            predictedPurchaseRequirement: 0,
            stockoutRisk: 'LOW',
            upcomingEvents,
            eventsThisMonth,
            eventCompletionRate,
            eventsPendingReconciliation: pendingReconciliation,
            grossLoss,
            recovered,
            netLoss,
            lossRate,
            recoveryRate,
            financialImpact: 0,
            vendorScore: 0,
            highRiskVendorCount: 0,
            averageTurnaroundDays: 0,
            vendorLiability: 0,
            dirtyStock: dirtyPhysical,
            inLaundry,
            laundryAging0to3: within3Days,
            laundryAging4to7: within7Days,
            laundryAgingOver7: over7Days,
            avgLaundryCycleDays: 0,
            delayedLaundryOrders: delayed,
            stockoutRiskLevel,
            vendorRiskLevel,
            laundryBottleneckLevel,
            eventCapacityRiskLevel,
            inventoryValue: 0,
            monthlyConsumptionValue: 0,
            costOfLosses: 0,
            costOfDamages: 0,
            recoverySavings: 0,
        },
        create: {
            tenantId: tenant.id,
            snapshotDate: today,
            totalPhysicalInventory: totalPhysical,
            availableInventory: available,
            reservedInventory: reserved,
            dirtyInventory: dirtyPhysical,
            inLaundryInventory: inLaundry,
            inventoryHealth: healthScore,
            availabilityScore,
            stockoutRiskScore,
            dirtyRatioScore,
            lossRatioScore,
            agingScore,
            predictedDemand30Days: 0,
            forecastAccuracy: 0,
            predictedPurchaseRequirement: 0,
            stockoutRisk: 'LOW',
            upcomingEvents,
            eventsThisMonth,
            eventCompletionRate,
            eventsPendingReconciliation: pendingReconciliation,
            grossLoss,
            recovered,
            netLoss,
            lossRate,
            recoveryRate,
            financialImpact: 0,
            vendorScore: 0,
            highRiskVendorCount: 0,
            averageTurnaroundDays: 0,
            vendorLiability: 0,
            dirtyStock: dirtyPhysical,
            inLaundry,
            laundryAging0to3: within3Days,
            laundryAging4to7: within7Days,
            laundryAgingOver7: over7Days,
            avgLaundryCycleDays: 0,
            delayedLaundryOrders: delayed,
            stockoutRiskLevel,
            vendorRiskLevel,
            laundryBottleneckLevel,
            eventCapacityRiskLevel,
            inventoryValue: 0,
            monthlyConsumptionValue: 0,
            costOfLosses: 0,
            costOfDamages: 0,
            recoverySavings: 0,
        },
    })
    console.log('✅ Dashboard snapshot computed and saved from live inventory data')

    // ── Clear stale fake AI recommendations and generate real ones ─────────────
    await prisma.aIRecommendation.deleteMany({ where: { tenantId: tenant.id } })

    const liveRecommendations = []

    // Stockout risk recommendation
    if (atRiskCount > 0) {
        liveRecommendations.push({
            priority: atRiskCount > 3 ? 'CRITICAL' : 'HIGH',
            type: 'REORDER',
            title: `${atRiskCount} Item${atRiskCount > 1 ? 's' : ''} Below Minimum Stock Level`,
            description: `${atRiskCount} apparel item${atRiskCount > 1 ? 's are' : ' is'} at or below minimum stock threshold. Review and raise purchase orders to prevent event stockouts.`,
            status: 'ACTIVE',
            payload: { atRiskCount, urgencyDays: 7 },
        })
    }

    // Loss rate recommendation
    if (lossRate > 3) {
        liveRecommendations.push({
            priority: lossRate > 5 ? 'HIGH' : 'MEDIUM',
            type: 'LOSS',
            title: `Loss Rate at ${lossRate}% — Above Threshold`,
            description: `Net loss rate is ${lossRate}% of total allotments (threshold: 3%). Review MISSING and DAMAGE stock movements to identify patterns.`,
            status: 'ACTIVE',
            payload: { lossRate, threshold: 3 },
        })
    }

    // Delayed laundry recommendation
    if (delayed > 0) {
        liveRecommendations.push({
            priority: delayed > 5 ? 'HIGH' : 'MEDIUM',
            type: 'LAUNDRY',
            title: `${delayed} Laundry Order${delayed > 1 ? 's' : ''} Past Due`,
            description: `${delayed} open laundry order${delayed > 1 ? 's have' : ' has'} exceeded the expected return date. Contact vendor${delayed > 1 ? 's' : ''} to expedite returns.`,
            status: 'ACTIVE',
            payload: { delayedCount: delayed },
        })
    }

    // Events pending reconciliation
    if (pendingReconciliation > 0) {
        liveRecommendations.push({
            priority: pendingReconciliation > 5 ? 'HIGH' : 'MEDIUM',
            type: 'CAPACITY',
            title: `${pendingReconciliation} Event${pendingReconciliation > 1 ? 's' : ''} Pending Reconciliation`,
            description: `${pendingReconciliation} allotted event${pendingReconciliation > 1 ? 's have' : ' has'} not been reconciled. Unreturned stock is reducing available inventory for upcoming events.`,
            status: 'ACTIVE',
            payload: { pendingCount: pendingReconciliation },
        })
    }

    // Inventory health general tip
    liveRecommendations.push({
        priority: 'LOW',
        type: 'GENERAL',
        title: `Inventory Health Score: ${healthScore}/100 (${healthScore >= 90 ? 'A' : healthScore >= 75 ? 'B' : healthScore >= 60 ? 'C' : healthScore >= 45 ? 'D' : 'F'})`,
        description: `Current inventory health is ${healthScore >= 75 ? 'good' : healthScore >= 60 ? 'fair' : 'poor'}. Availability: ${availabilityScore}%, Stockout Risk: ${stockoutRiskScore}%, Dirty Ratio: ${dirtyRatioScore}%.`,
        status: 'ACTIVE',
        payload: { healthScore, availabilityScore, stockoutRiskScore, dirtyRatioScore },
    })

    for (const rec of liveRecommendations) {
        await prisma.aIRecommendation.create({ data: { tenantId: tenant.id, ...rec } })
    }
    console.log(`✅ AI Recommendations generated from live data: ${liveRecommendations.length} records`)

    // ── Seed 30 days of trend data anchored to live snapshot values ────────────
    const trendMetrics = [
        { code: 'INVENTORY_HEALTH',     liveValue: healthScore,   variance: 8  },
        { code: 'AVAILABLE_INVENTORY',  liveValue: available,     variance: Math.max(10, Math.round(available * 0.10)) },
        { code: 'DIRTY_INVENTORY',      liveValue: dirtyPhysical, variance: Math.max(5, Math.round(dirtyPhysical * 0.15)) },
        { code: 'NET_LOSS',             liveValue: netLoss,       variance: Math.max(2, Math.round(netLoss * 0.20)) },
        { code: 'RECOVERY_RATE',        liveValue: recoveryRate,  variance: 10 },
        { code: 'VENDOR_SCORE',         liveValue: 70,            variance: 10 },
        { code: 'DELAYED_LAUNDRY',      liveValue: delayed,       variance: 2  },
        { code: 'GROSS_LOSS',           liveValue: grossLoss,     variance: Math.max(2, Math.round(grossLoss * 0.20)) },
        { code: 'LOSS_RATE',            liveValue: lossRate,      variance: 1  },
        { code: 'EVENT_COMPLETION_RATE',liveValue: eventCompletionRate, variance: 12 },
        { code: 'IN_LAUNDRY_QTY',       liveValue: inLaundry,    variance: Math.max(5, Math.round(inLaundry * 0.20)) },
    ]

    for (let i = 29; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        d.setHours(0, 0, 0, 0)

        for (const m of trendMetrics) {
            // Use exact live value for today, random walk for historical days
            const value = i === 0
                ? m.liveValue
                : Math.max(0, m.liveValue + (Math.random() - 0.5) * m.variance * 2)
            await prisma.kPITrendSnapshot.upsert({
                where: { tenantId_metricCode_snapshotDate: { tenantId: tenant.id, metricCode: m.code, snapshotDate: d } },
                update: { metricValue: parseFloat(value.toFixed(2)) },
                create: { tenantId: tenant.id, metricCode: m.code, snapshotDate: d, metricValue: parseFloat(value.toFixed(2)) },
            })
        }
    }
    console.log(`✅ Dashboard KPI trend data seeded: 30 days × ${trendMetrics.length} metrics (anchored to live values)`)

    // ── Seed Catering Event Module Master Data ────────────
    console.log('Seeding Catering Event Module Master Data...')
    const cateringTenantUuid = tenant.id  // VS05Z: tenant.id is now a UUID string
    const cateringCreatorUuid = adminUser.id  // VS05Z: use actual admin UUID

    // 1. Statuses
    const cateringStatuses = [
        { code: "INQUIRY", name: "Inquiry" },
        { code: "TENTATIVE", name: "Tentative Booking" },
        { code: "QUOTATION", name: "Quotation" },
        { code: "NEGOTIATION", name: "Negotiation" },
        { code: "CONFIRMED", name: "Confirmed" },
        { code: "PLANNING", name: "Planning" },
        { code: "PRODUCTION", name: "Production" },
        { code: "DISPATCH", name: "Dispatch" },
        { code: "EXECUTION", name: "Execution" },
        { code: "SETTLEMENT", name: "Settlement" },
        { code: "COMPLETED", name: "Completed" },
        { code: "ARCHIVED", name: "Archived" },
    ]
    for (const item of cateringStatuses) {
        const existing = await prisma.cateringEventStatus.findFirst({
            where: { tenantId: cateringTenantUuid, code: item.code }
        })
        if (!existing) {
            await prisma.cateringEventStatus.create({
                data: {
                    tenantId: cateringTenantUuid,
                    companyId: cateringTenantUuid,
                    branchId: cateringTenantUuid,
                    code: item.code,
                    name: item.name,
                    createdBy: cateringCreatorUuid,
                    updatedBy: cateringCreatorUuid,
                }
            })
        }
    }
    console.log(`✅ Catering Event Statuses seeded: ${cateringStatuses.length} records`)

    // 2. Priorities
    const cateringPriorities = [
        { code: "LOW", name: "Low" },
        { code: "MEDIUM", name: "Medium" },
        { code: "HIGH", name: "High" },
    ]
    for (const item of cateringPriorities) {
        const existing = await prisma.cateringEventPriority.findFirst({
            where: { tenantId: cateringTenantUuid, code: item.code }
        })
        if (!existing) {
            await prisma.cateringEventPriority.create({
                data: {
                    tenantId: cateringTenantUuid,
                    companyId: cateringTenantUuid,
                    branchId: cateringTenantUuid,
                    code: item.code,
                    name: item.name,
                    createdBy: cateringCreatorUuid,
                    updatedBy: cateringCreatorUuid,
                }
            })
        }
    }
    console.log(`✅ Catering Event Priorities seeded: ${cateringPriorities.length} records`)

    // 3. Types
    const cateringTypes = [
        { code: "WEDDING", name: "Wedding" },
        { code: "RECEPTION", name: "Reception" },
        { code: "ENGAGEMENT", name: "Engagement" },
        { code: "BIRTHDAY", name: "Birthday" },
        { code: "CORPORATE", name: "Corporate Event" },
        { code: "CONFERENCE", name: "Conference" },
        { code: "EXHIBITION", name: "Exhibition" },
        { code: "RELIGIOUS", name: "Religious Event" },
    ]
    for (const item of cateringTypes) {
        const existing = await prisma.cateringEventType.findFirst({
            where: { tenantId: cateringTenantUuid, code: item.code }
        })
        if (!existing) {
            await prisma.cateringEventType.create({
                data: {
                    tenantId: cateringTenantUuid,
                    companyId: cateringTenantUuid,
                    branchId: cateringTenantUuid,
                    code: item.code,
                    name: item.name,
                    createdBy: cateringCreatorUuid,
                    updatedBy: cateringCreatorUuid,
                }
            })
        }
    }
    // 4. Platform Modules
    const modules = [
        { code: "CRM", name: "CRM", description: "Customer Relationship Management", icon: "Users", sortOrder: 10, navigationGroup: "Sales", route: "/crm", color: "blue" },
        { code: "EVENT", name: "Event Management", description: "Catering Event Management", icon: "Calendar", sortOrder: 20, navigationGroup: "Operations", route: "/events", color: "amber" },
        { code: "QUOTATION", name: "Quotation", description: "Quotations and Estimates", icon: "FileText", sortOrder: 30, navigationGroup: "Sales", route: "/quotations", color: "indigo" },
        { code: "PRODUCTION", name: "Production", description: "Event Production Management", icon: "Sliders", sortOrder: 40, navigationGroup: "Production", route: "/production", color: "purple", moduleDependencies: ["EVENT", "INVENTORY"] },
        { code: "KITCHEN", name: "Kitchen", description: "Kitchen and Menu Operations", icon: "ChefHat", sortOrder: 50, navigationGroup: "Production", route: "/kitchen", color: "rose", moduleDependencies: ["INVENTORY"] },
        { code: "INVENTORY", name: "Inventory", description: "Inventory and Stock Control", icon: "Box", sortOrder: 60, navigationGroup: "Operations", route: "/inventory", color: "emerald" },
        { code: "PROCUREMENT", name: "Procurement", description: "Purchasing and Suppliers", icon: "ShoppingBag", sortOrder: 70, navigationGroup: "Operations", route: "/procurement", color: "teal", moduleDependencies: ["INVENTORY"] },
        { code: "LAUNDRY", name: "Laundry", description: "Laundry Operations and Vendor Billing", icon: "Shirt", sortOrder: 80, navigationGroup: "Production", route: "/laundry", color: "cyan", moduleDependencies: ["INVENTORY"] },
        { code: "FLEET", name: "Fleet", description: "Logistics and Fleet Operations", icon: "Truck", sortOrder: 90, navigationGroup: "Operations", route: "/fleet", color: "orange" },
        { code: "FINANCE", name: "Finance", description: "General Ledger and Cash Flow", icon: "DollarSign", sortOrder: 100, navigationGroup: "Finance", route: "/finance", color: "violet" },
        { code: "HR", name: "HR", description: "Human Resources and Staffing", icon: "Users2", sortOrder: 110, navigationGroup: "Administration", route: "/hr", color: "fuchsia" },
        { code: "ADMINISTRATION", name: "Administration", description: "Security, Audits, Roles and Users", icon: "Shield", sortOrder: 120, navigationGroup: "Administration", route: "/admin", color: "slate" },
        { code: "REPORTING", name: "Reporting", description: "BI and Reports Engine", icon: "BarChart3", sortOrder: 130, navigationGroup: "Reports", route: "/reports", color: "sky" },
        { code: "CUSTOMER_PORTAL", name: "Customer Portal", description: "External Portal for Customers", icon: "Globe", sortOrder: 140, navigationGroup: "Customer Portal", route: "/customer-portal", color: "pink" },
        { code: "VENDOR_PORTAL", name: "Vendor Portal", description: "External Portal for Vendors", icon: "Globe2", sortOrder: 150, navigationGroup: "Vendor Portal", route: "/vendor-portal", color: "emerald" },
    ]

    for (const mod of modules) {
        const existing = await prisma.platformModule.findUnique({
            where: { code: mod.code }
        })
        if (!existing) {
            await prisma.platformModule.create({
                data: {
                    code: mod.code,
                    name: mod.name,
                    description: mod.description,
                    icon: mod.icon,
                    sortOrder: mod.sortOrder,
                    isActive: true,
                    isSystem: true,
                    navigationGroup: mod.navigationGroup,
                    displayOrder: mod.sortOrder,
                    route: mod.route,
                    defaultPage: "/dashboard",
                    color: mod.color,
                    menuVisible: true,
                    showInSearch: true,
                    showOnDashboard: true,
                    showInMobile: false,
                    isLicensed: true,
                    requiresLicense: false,
                    featureFlag: "Production",
                    moduleDependencies: mod.moduleDependencies ?? [],
                    minimumRole: "USER",
                    defaultPermissionSet: [],
                    defaultLandingPage: mod.route,
                    createdBy: cateringCreatorUuid,
                    updatedBy: cateringCreatorUuid,
                }
            })
        } else {
            await prisma.platformModule.update({
                where: { code: mod.code },
                data: {
                    name: mod.name,
                    description: mod.description,
                    icon: mod.icon,
                    sortOrder: mod.sortOrder,
                    navigationGroup: mod.navigationGroup,
                    displayOrder: mod.sortOrder,
                    route: mod.route,
                    color: mod.color,
                    moduleDependencies: mod.moduleDependencies ?? [],
                    updatedBy: cateringCreatorUuid,
                }
            })
        }
    }
    console.log(`✅ Platform Modules seeded: ${modules.length} records`)

    // 5. Navigation Groups
    console.log("Seeding Navigation Groups...");
    const navGroups = [
        { code: "Administration", name: "Administration", icon: "Shield", displayOrder: 10 },
        { code: "Operations", name: "Operations", icon: "Truck", displayOrder: 20 },
        { code: "Sales", name: "Sales", icon: "DollarSign", displayOrder: 30 },
        { code: "Production", name: "Production", icon: "Sliders", displayOrder: 40 },
        { code: "Finance", name: "Finance", icon: "Receipt", displayOrder: 50 },
        { code: "Reports", name: "Reports", icon: "BarChart3", displayOrder: 60 },
        { code: "Masters", name: "Masters", icon: "Database", displayOrder: 70 },
        { code: "Utilities", name: "Utilities", icon: "Settings", displayOrder: 80 },
        { code: "Customer Portal", name: "Customer Portal", icon: "Globe", displayOrder: 90 },
        { code: "Vendor Portal", name: "Vendor Portal", icon: "Globe2", displayOrder: 100 },
        { code: "Mobile", name: "Mobile", icon: "Smartphone", displayOrder: 110 }
    ];

    const groupCodeToId = {};
    for (const group of navGroups) {
        const created = await prisma.navigationGroup.upsert({
            where: { code: group.code },
            update: {
                name: group.name,
                icon: group.icon,
                displayOrder: group.displayOrder,
                updatedBy: cateringCreatorUuid
            },
            create: {
                code: group.code,
                name: group.name,
                icon: group.icon,
                displayOrder: group.displayOrder,
                createdBy: cateringCreatorUuid,
                updatedBy: cateringCreatorUuid
            }
        });
        groupCodeToId[group.code] = created.id;
    }

    // 6. Navigation Profiles
    console.log("Seeding Navigation Profiles...");
    const navProfiles = [
        { code: "ADMINISTRATOR", name: "Administrator", description: "System Administrator Profile" },
        { code: "MANAGER", name: "Manager", description: "Branch/Division Manager Profile" },
        { code: "SUPERVISOR", name: "Supervisor", description: "Operational Supervisor Profile" },
        { code: "KITCHEN_STAFF", name: "Kitchen Staff", description: "Kitchen Operations Profile" },
        { code: "DRIVER", name: "Driver", description: "Logistics and Fleet Driver Profile" },
        { code: "CUSTOMER_PORTAL", name: "Customer Portal", description: "External Customers Access Profile" },
        { code: "VENDOR_PORTAL", name: "Vendor Portal", description: "External Vendors Access Profile" }
    ];

    const profileCodeToId = {};
    for (const profile of navProfiles) {
        const created = await prisma.navigationProfile.upsert({
            where: { code: profile.code },
            update: {
                name: profile.name,
                description: profile.description,
                updatedBy: cateringCreatorUuid
            },
            create: {
                code: profile.code,
                name: profile.name,
                description: profile.description,
                createdBy: cateringCreatorUuid,
                updatedBy: cateringCreatorUuid
            }
        });
        profileCodeToId[profile.code] = created.id;
    }

    // 7. Navigation Items
    console.log("Seeding Navigation Items mapping standard modules...");
    const dbModules = await prisma.platformModule.findMany();
    
    const moduleToGroupMap = {
        CRM: "Sales",
        EVENT: "Operations",
        QUOTATION: "Sales",
        PRODUCTION: "Production",
        KITCHEN: "Production",
        INVENTORY: "Operations",
        PROCUREMENT: "Operations",
        LAUNDRY: "Operations",
        FLEET: "Operations",
        FINANCE: "Finance",
        HR: "Administration",
        ADMINISTRATION: "Administration",
        REPORTING: "Reports",
        CUSTOMER_PORTAL: "Customer Portal",
        VENDOR_PORTAL: "Vendor Portal"
    };

    const navItemsList = [];
    for (const mod of dbModules) {
        const groupName = moduleToGroupMap[mod.code] || "Utilities";
        const groupId = groupCodeToId[groupName];

        const existingItem = await prisma.navigationItem.findFirst({
            where: { platformModuleId: mod.id }
        });

        if (existingItem) {
            const updated = await prisma.navigationItem.update({
                where: { id: existingItem.id },
                data: {
                    title: mod.name,
                    navigationGroupId: groupId,
                    route: mod.route || `/${mod.code.toLowerCase()}`,
                    icon: mod.icon,
                    displayOrder: mod.sortOrder,
                    updatedBy: cateringCreatorUuid
                }
            });
            navItemsList.push(updated);
        } else {
            const created = await prisma.navigationItem.create({
                data: {
                    title: mod.name,
                    navigationGroupId: groupId,
                    platformModuleId: mod.id,
                    route: mod.route || `/${mod.code.toLowerCase()}`,
                    icon: mod.icon,
                    displayOrder: mod.sortOrder,
                    menuType: "MODULE",
                    createdBy: cateringCreatorUuid,
                    updatedBy: cateringCreatorUuid
                }
            });
            navItemsList.push(created);
        }
    }

    // 8. Navigation Layouts (Administrator Profile gets all items)
    console.log("Seeding default Administrator Navigation Layout...");
    const adminProfileId = profileCodeToId["ADMINISTRATOR"];
    if (adminProfileId) {
        const structure = navGroups.map(g => {
            const groupId = groupCodeToId[g.code];
            const groupItems = navItemsList
                .filter(item => item.navigationGroupId === groupId)
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    route: item.route,
                    icon: item.icon,
                    displayOrder: item.displayOrder
                }));
            return {
                id: groupId,
                code: g.code,
                name: g.name,
                icon: g.icon,
                displayOrder: g.displayOrder,
                items: groupItems
            };
        });

        const existingLayout = await prisma.navigationLayout.findFirst({
            where: { profileId: adminProfileId }
        });

        if (existingLayout) {
            await prisma.navigationLayout.update({
                where: { id: existingLayout.id },
                data: {
                    navigationStructure: structure,
                    isPublished: true,
                    updatedBy: cateringCreatorUuid
                }
            });
        } else {
            await prisma.navigationLayout.create({
                data: {
                    profileId: adminProfileId,
                    navigationStructure: structure,
                    isPublished: true,
                    createdBy: cateringCreatorUuid,
                    updatedBy: cateringCreatorUuid
                }
            });
        }
    }

    console.log('\n🎉 Database seed completed successfully!')
    console.log('\n📋 Admin Credentials:')
    console.log('   Email:    admin@example.com')
    console.log('   Password: Admin@123')
    console.log('\n⚠️  Please change the password after first login!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
