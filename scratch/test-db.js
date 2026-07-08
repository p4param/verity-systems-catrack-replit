const { PrismaClient } = require("../src/generated/client");
const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users:", users.map(u => ({ id: u.id, fullName: u.fullName, email: u.email, tenantId: u.tenantId })));
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
