import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '@mgl/database';
import { adjustStock, resolveOrgWarehouse } from './inventory.service';
import { resolveProductInventoryWarehouse } from './vendor-inventory-warehouse.service';
const enabled = process.env.VENDOR_WAREHOUSE_INTEGRATION === '1' &&
  ['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL || 'http://disabled').hostname);
test('concurrent first-use creates one internal warehouse and preserves admin management', {skip: !enabled}, async () => {
  const key = randomUUID();
  const org = await prisma.organization.create({data:{name:key,slug:key,taxId:key}});
  const warehouseIds: string[] = [];
  try {
    const products = await Promise.all([1,2].map(n => prisma.product.create({data:{name:`Product ${n}`,organizationId:org.id,price:1}})));
    const ids = await Promise.all(products.map(p => prisma.$transaction(tx => resolveProductInventoryWarehouse(tx,org.id,p.id))));
    assert.equal(ids[0],ids[1]);
    assert.ok(ids[0]);
    warehouseIds.push(ids[0]);
    assert.equal(await prisma.warehouse.count({where:{organizations:{some:{organizationId:org.id}}}}),1);
    assert.equal((await prisma.warehouse.findUniqueOrThrow({where:{id:ids[0]}})).type,'VENDOR_INTERNAL');
    const legacy = await prisma.product.create({data:{name:'Unassigned stock',organizationId:org.id,price:1,stock:7}});
    await prisma.$transaction(async tx => {
      const warehouseId = await resolveOrgWarehouse(tx,org.id,legacy.id);
      await adjustStock(tx,{productId:legacy.id,warehouseId:warehouseId ?? undefined,change:-2,reason:'ORDER'});
    });
    assert.equal((await prisma.product.findUniqueOrThrow({where:{id:legacy.id}})).stock,5);
    const central=await prisma.warehouse.create({data:{name:'Admin central',address:'Test',type:'CENTRAL'}});
    warehouseIds.push(central.id);
    await prisma.product.update({where:{id:products[0].id},data:{managedByWarehouseId:central.id}});
    assert.equal(await prisma.$transaction(tx=>resolveProductInventoryWarehouse(tx,org.id,products[0].id)),central.id);
    await prisma.warehouseInventory.create({data:{warehouseId:central.id,productId:products[1].id,quantity:5}});
    await assert.rejects(prisma.$transaction(tx=>resolveProductInventoryWarehouse(tx,org.id,products[1].id)),/холбоос/);
    assert.equal((await prisma.warehouseInventory.findUniqueOrThrow({where:{warehouseId_productId:{warehouseId:central.id,productId:products[1].id}}})).quantity,5);
  } finally {
    await prisma.inventoryLedger.deleteMany({where:{product:{organizationId:org.id}}});
    await prisma.warehouseInventory.deleteMany({where:{product:{organizationId:org.id}}});
    await prisma.product.deleteMany({where:{organizationId:org.id}});
    await prisma.warehouseOrganization.deleteMany({where:{organizationId:org.id}});
    await prisma.warehouse.deleteMany({where:{id:{in:warehouseIds}}});
    await prisma.organization.delete({where:{id:org.id}});
  }
});
