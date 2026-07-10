import { PrismaClient } from "./src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  users.forEach(u => {
    console.log(`User: ${u.email}`);
    console.log(`Roles: ${u.userRoles.map(ur => ur.role.name).join(", ")}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
