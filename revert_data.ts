import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const adminOrg = await prisma.organization.findFirst({ where: { slug: "central-supplier" } });
  if (!adminOrg) return;
  
  const vendorOrg = await prisma.organization.findFirst({ where: { slug: { not: "central-supplier" } } });
  if (!vendorOrg) return;

  const warehouses = await prisma.warehouseOrganization.findMany({ where: { organizationId: adminOrg.id } });
  for (const w of warehouses) {
    await prisma.warehouseOrganization.update({
      where: { warehouseId_organizationId: { warehouseId: w.warehouseId, organizationId: adminOrg.id } },
      data: { organizationId: vendorOrg.id }
    });
    
    const inventory = await prisma.warehouseInventory.findMany({ where: { warehouseId: w.warehouseId } });
    for (const inv of inventory) {
      await prisma.product.update({ where: { id: inv.productId }, data: { organizationId: vendorOrg.id } });
    }
  }
  
  // Delete adminOrg if it's no longer used
  await prisma.organization.delete({ where: { id: adminOrg.id } });
  console.log("Reverted data");
}
main().finally(() => prisma.$disconnect());
