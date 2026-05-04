import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany();
  console.log("Organizations:", orgs.map(o => ({id: o.id, name: o.name})));
  const products = await prisma.product.findMany({ select: { name: true, organizationId: true } });
  console.log("Products count:", products.length, "Org IDs:", [...new Set(products.map(p => p.organizationId))]);
}
main().catch(console.error).finally(() => prisma.$disconnect());
