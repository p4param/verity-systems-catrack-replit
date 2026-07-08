const { PrismaClient } = require('../src/generated/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    const passwordHash = await bcrypt.hash('Admin@123', 10)
    const result = await prisma.user.updateMany({
        where: { email: 'admin@example.com' },
        data: {
            passwordHash,
            status: 'ACTIVE',
            isActive: true,
            isLocked: false,
        }
    })
    console.log(`✅ Reset password for ${result.count} user(s).`)
    console.log('   Email:    admin@example.com')
    console.log('   Password: Admin@123')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
