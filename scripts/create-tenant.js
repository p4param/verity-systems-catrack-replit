const { PrismaClient } = require('../src/generated/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function provisionTenant() {
    const args = process.argv.slice(2)
    const code = args[0] || 'tenant2'
    const name = args[1] || 'Second Organization'
    const email = args[2] || `admin@${code}.com`
    const rawPassword = args[3] || 'Admin@123'

    console.log(`🚀 Provisioning new tenant...`)
    console.log(`   Tenant Code: ${code}`)
    console.log(`   Tenant Name: ${name}`)
    console.log(`   Admin Email: ${email}`)

    try {
        // 1. Create Tenant
        const tenant = await prisma.tenant.upsert({
            where: { code },
            update: { name, isActive: true },
            create: { code, name, isActive: true },
        })
        console.log(`✅ Tenant record created (ID: ${tenant.id})`)

        // 2. Ensure Permissions exist globally
        const permissions = [
            { code: 'USER_VIEW', description: 'View users' },
            { code: 'USER_CREATE', description: 'Create users' },
            { code: 'USER_UPDATE', description: 'Update users' },
            { code: 'USER_DELETE', description: 'Delete users' },
            { code: 'ROLE_VIEW', description: 'View roles' },
            { code: 'ROLE_CREATE', description: 'Create roles' },
            { code: 'ROLE_UPDATE', description: 'Edit roles' },
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
            { code: 'INVENTORY_PURCHASE_VIEW', description: 'View purchase orders' },
            { code: 'INVENTORY_PURCHASE_CREATE', description: 'Create purchase orders' },
            { code: 'INVENTORY_PURCHASE_APPROVE', description: 'Approve purchase orders' },
            { code: 'INVENTORY_PURCHASE_RECEIVE', description: 'Receive goods' },
            { code: 'INVENTORY_PURCHASE_RETURN', description: 'Return goods' },
            { code: 'INVENTORY_MASTER_VIEW', description: 'View master data' },
            { code: 'INVENTORY_MASTER_CREATE', description: 'Create master records' },
            { code: 'INVENTORY_MASTER_UPDATE', description: 'Edit master records' },
            { code: 'INVENTORY_MASTER_DELETE', description: 'Delete master records' },
            { code: 'INVENTORY_SETTINGS_MANAGE', description: 'Manage settings' },
            { code: 'DASHBOARD_EXECUTIVE_VIEW', description: 'Executive dashboard access' }
        ]

        await prisma.permission.createMany({
            data: permissions,
            skipDuplicates: true
        })

        // 3. Create Admin & User Roles for Tenant
        const adminRole = await prisma.role.upsert({
            where: { tenantId_name: { tenantId: tenant.id, name: 'Admin' } },
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

        const userRole = await prisma.role.upsert({
            where: { tenantId_name: { tenantId: tenant.id, name: 'User' } },
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

        const allPermissions = await prisma.permission.findMany()
        await prisma.rolePermission.createMany({
            data: allPermissions.map(p => ({ roleId: adminRole.id, permissionId: p.id })),
            skipDuplicates: true
        })

        // 4. Create Admin User for Tenant
        const passwordHash = await bcrypt.hash(rawPassword, 10)
        const adminUser = await prisma.user.upsert({
            where: { tenantId_email: { tenantId: tenant.id, email } },
            update: { passwordHash, status: 'ACTIVE', isActive: true },
            create: {
                tenantId: tenant.id,
                fullName: `${name} Admin`,
                email,
                passwordHash,
                status: 'ACTIVE',
                isActive: true,
                isLocked: false,
                mfaEnabled: false,
            },
        })

        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
            update: {},
            create: { userId: adminUser.id, roleId: adminRole.id, assignedBy: adminUser.id },
        })

        // 5. Provision System Masters for Tenant
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
        await prisma.movementType.createMany({
            data: movementTypes.map(mt => ({ tenantId: tenant.id, ...mt })),
            skipDuplicates: true
        })

        const conditions = [
            { code: 'CLEAN', description: 'Ready for deployment' },
            { code: 'DIRTY', description: 'Requires laundering' },
            { code: 'DAMAGED', description: 'Unfit for use' }
        ]
        await prisma.stockConditionMaster.createMany({
            data: conditions.map(c => ({ tenantId: tenant.id, ...c })),
            skipDuplicates: true
        })

        const units = [
            { code: 'PCS', description: 'Pieces', conversionFactor: 1.0 },
            { code: 'SET', description: 'Full Sets', conversionFactor: 1.0 },
            { code: 'PAIR', description: 'Pair (L/R)', conversionFactor: 1.0 },
            { code: 'KG', description: 'Kilograms', conversionFactor: 1.0 }
        ]
        await prisma.unitOfMeasure.createMany({
            data: units.map(u => ({ tenantId: tenant.id, ...u })),
            skipDuplicates: true
        })

        const documentNumbers = [
            { entityType: 'PURCHASE_ORDER', prefix: 'PO', currentSequence: 1, resetYearly: true },
            { entityType: 'GOODS_RECEIPT', prefix: 'GR', currentSequence: 1, resetYearly: true },
            { entityType: 'LAUNDRY_DISPATCH', prefix: 'LD', currentSequence: 1, resetYearly: true },
            { entityType: 'LAUNDRY_RETURN', prefix: 'LR', currentSequence: 1, resetYearly: true },
            { entityType: 'EVENT_RESERVATION', prefix: 'RES', currentSequence: 1, resetYearly: true }
        ]
        await prisma.documentNumbering.createMany({
            data: documentNumbers.map(doc => ({ tenantId: tenant.id, ...doc })),
            skipDuplicates: true
        })

        console.log(`\n🎉 Tenant '${name}' (${code}) successfully provisioned!`)
        console.log(`📋 Tenant Admin Credentials:`)
        console.log(`   Tenant ID: ${tenant.id}`)
        console.log(`   Email:     ${email}`)
        console.log(`   Password:  ${rawPassword}`)

    } catch (err) {
        console.error('❌ Failed to provision tenant:', err)
    } finally {
        await prisma.$disconnect()
    }
}

provisionTenant()
