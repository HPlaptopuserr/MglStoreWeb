import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, type: true } });
  console.log("Organizations:", orgs);
  const warehouses = await prisma.warehouse.findMany({ include: { organizations: true } });
  console.log("Warehouses:", JSON.stringify(warehouses, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
