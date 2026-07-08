const { PrismaClient } = require('../src/generated/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Fixing Document Numbering seed data...')
    const tenant = await prisma.tenant.findUnique({ where: { code: 'default' } })
    if (!tenant) return console.error('Tenant not found')

    const documentNumbers = [
        { entityType: 'PURCHASE_ORDER', prefix: 'PO', currentSequence: 1, resetYearly: true },
        { entityType: 'GOODS_RECEIPT', prefix: 'GR', currentSequence: 1, resetYearly: true },
        { entityType: 'LAUNDRY_DISPATCH', prefix: 'LD', currentSequence: 1, resetYearly: true },
        { entityType: 'LAUNDRY_RETURN', prefix: 'LR', currentSequence: 1, resetYearly: true },
        { entityType: 'EVENT_RESERVATION', prefix: 'RES', currentSequence: 1, resetYearly: true },
        { entityType: 'STOCK_ADJUSTMENT', prefix: 'ADJ', currentSequence: 1, resetYearly: true }
    ]

    for (const doc of documentNumbers) {
        await prisma.documentNumbering.upsert({
            where: { tenantId_entityType: { tenantId: tenant.id, entityType: doc.entityType } },
            update: {},
            create: { tenantId: tenant.id, ...doc }
        })
    }
    console.log('Document Numbering inserted correctly!')
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
