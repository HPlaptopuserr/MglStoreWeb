import { PrismaClient, OrgType } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const warehouses = await prisma.warehouse.findMany({
    include: { organizations: true }
  });
  if (warehouses.length === 0) return;
  const targetWarehouse = warehouses[0];
  
  let adminOrg = await prisma.organization.findFirst({ where: { slug: "central-supplier" } });
  if (!adminOrg) {
    adminOrg = await prisma.organization.create({
      data: { 
        name: "Нийлүүлэгч Төв Агуулах", 
        slug: "central-supplier", 
        type: OrgType.SUPPLIER, 
        taxId: "9999999" 
      }
    });
  }
  
  await prisma.warehouseOrganization.deleteMany({ where: { warehouseId: targetWarehouse.id } });
  await prisma.warehouseOrganization.create({ data: { warehouseId: targetWarehouse.id, organizationId: adminOrg.id } });
  
  const inventory = await prisma.warehouseInventory.findMany({ where: { warehouseId: targetWarehouse.id } });
  for (const inv of inventory) {
    await prisma.product.update({ where: { id: inv.productId }, data: { organizationId: adminOrg.id } });
  }
  console.log("Fixed!");
}
main().finally(() => prisma.$disconnect());
