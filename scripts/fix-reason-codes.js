const { PrismaClient } = require('../src/generated/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Reason Codes...')
    const tenant = await prisma.tenant.findUnique({ where: { code: 'default' } })
    if (!tenant) return console.error('Tenant not found')

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
    console.log('Reason Codes inserted correctly!')
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
